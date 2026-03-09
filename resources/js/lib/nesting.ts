import type { MaterialConfig } from './materials';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NestingItem {
    id: number;
    name: string;
    width: number;   // meters
    height: number;  // meters
    quantity: number;
}

export interface NestingPiece {
    itemId: number;
    width: number;    // dimension along roll width axis
    height: number;   // dimension along roll length axis
    rotated: boolean;
    splitIndex?: number;
}

export interface NestingShelf {
    y: number;          // position on roll (meters from start)
    height: number;     // shelf height = tallest piece on this shelf
    pieces: NestingPiece[];
    usedWidth: number;  // how much of printWidth is consumed
}

export interface NestingResult {
    totalLength: number;   // meters of roll used
    totalArea: number;     // m² (totalLength × rollWidth)
    totalPrice: number;    // CZK
    usefulArea: number;    // m² of actual item areas (sum of w×h×qty)
    wastePercent: number;  // waste as percentage of totalArea
    shelves: NestingShelf[];
}

export interface MaterialNestingResult {
    materialKey: string;
    materialLabel: string;
    result: NestingResult;
}

export interface EstimateTotalResult {
    byMaterial: MaterialNestingResult[];
    grandTotal: number; // CZK
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Round to avoid floating-point drift in comparisons (6 decimal places). */
function r(n: number): number {
    return Math.round(n * 1_000_000) / 1_000_000;
}

/**
 * Split a piece along the roll-width axis into strips.
 * Each strip is (printWidth × stripeHeight), with `overlap` added to each
 * strip's width so adjacent strips share 1 cm of artwork.
 *
 * Returns an array of NestingPiece objects (all with rotated = false by
 * convention — the caller is responsible for the outer orientation decision).
 */
function splitIntoStrips(
    itemId: number,
    totalWidthOnRoll: number,  // the dimension that exceeds printWidth
    lengthOnRoll: number,      // the dimension along the roll length
    printWidth: number,
    overlap: number,
    rotated: boolean,
): NestingPiece[] {
    const effectiveStripWidth = printWidth - overlap;
    if (effectiveStripWidth <= 0) {
        // Degenerate config — return a single oversized piece as fallback
        return [{ itemId, width: totalWidthOnRoll, height: lengthOnRoll, rotated, splitIndex: 0 }];
    }

    const numStrips = Math.ceil(totalWidthOnRoll / effectiveStripWidth);
    const pieces: NestingPiece[] = [];

    for (let i = 0; i < numStrips; i++) {
        const remaining = r(totalWidthOnRoll - i * effectiveStripWidth);
        const stripWidth = Math.min(printWidth, remaining + overlap);
        pieces.push({
            itemId,
            width: r(Math.min(stripWidth, printWidth)),
            height: lengthOnRoll,
            rotated,
            splitIndex: i,
        });
    }

    return pieces;
}

// ---------------------------------------------------------------------------
// Step 1 — preparePieces
// ---------------------------------------------------------------------------

/**
 * Converts NestingItems into flat NestingPiece array, handling:
 *  - Quantity expansion
 *  - Optimal orientation (longer side along roll width to minimise roll length)
 *  - Splitting oversized dimensions into strips with overlap
 */
export function preparePieces(
    items: NestingItem[],
    printWidth: number,
    overlap = 0,
): NestingPiece[] {
    if (!items.length || printWidth <= 0) return [];

    const pieces: NestingPiece[] = [];

    for (const item of items) {
        const w = item.width;
        const h = item.height;

        if (w <= 0 || h <= 0 || item.quantity <= 0) continue;

        for (let q = 0; q < item.quantity; q++) {
            const generated = buildPiecesForItem(item.id, w, h, printWidth, overlap);
            pieces.push(...generated);
        }
    }

    return pieces;
}

function buildPiecesForItem(
    itemId: number,
    w: number,
    h: number,
    printWidth: number,
    overlap: number,
): NestingPiece[] {
    const bothFit = w <= printWidth && h <= printWidth;
    const neitherFits = w > printWidth && h > printWidth;
    const onlyOneFits = !bothFit && !neitherFits;

    if (bothFit) {
        // Orient longer side along roll width → minimises roll length consumed
        const rotated = h > w; // if height > width, rotate so h becomes the roll-width axis
        return [{
            itemId,
            width: rotated ? h : w,
            height: rotated ? w : h,
            rotated,
        }];
    }

    if (onlyOneFits) {
        // Exactly one dimension fits within printWidth.
        // Place the fitting dimension along roll width, the larger one along roll length.
        const fitsAlongWidth = w <= printWidth; // w fits, h does not
        if (fitsAlongWidth) {
            // w along roll width, h along roll length — no rotation needed
            return [{ itemId, width: w, height: h, rotated: false }];
        } else {
            // h fits as roll-width, w goes along roll length — rotate
            return [{ itemId, width: h, height: w, rotated: true }];
        }
    }

    // neitherFits — both dimensions exceed printWidth.
    // Strategy: orient so the shorter dimension goes along roll width (fewer strips needed).
    // Split the dimension along roll width into strips.
    const shorterIsW = w <= h;
    const widthOnRoll = shorterIsW ? w : h;   // goes along roll width (will be split)
    const lengthOnRoll = shorterIsW ? h : w;   // goes along roll length
    const rotated = !shorterIsW;               // rotated if we swapped w/h

    // widthOnRoll > printWidth → split into strips along roll width.
    // Roll length is continuous — no need to split along length axis.
    return splitIntoStrips(itemId, widthOnRoll, lengthOnRoll, printWidth, overlap, rotated);
}

// ---------------------------------------------------------------------------
// Step 2 — nestPieces (FFDH — First Fit Decreasing Height)
// ---------------------------------------------------------------------------

/**
 * Packs pieces onto a roll using the First Fit Decreasing Height algorithm.
 * Pieces are sorted by height descending before placement.
 * Returns shelves representing horizontal bands on the roll.
 */
export function nestPieces(pieces: NestingPiece[], printWidth: number): NestingShelf[] {
    if (!pieces.length || printWidth <= 0) return [];

    // Sort by height descending (tallest pieces placed first)
    const sorted = [...pieces].sort((a, b) => b.height - a.height);

    const shelves: NestingShelf[] = [];

    for (const piece of sorted) {
        const pieceWidth = r(piece.width);
        const pieceHeight = r(piece.height);

        // Find the first shelf with enough remaining width
        let placed = false;
        for (const shelf of shelves) {
            const remaining = r(printWidth - shelf.usedWidth);
            if (remaining >= pieceWidth) {
                shelf.pieces.push(piece);
                shelf.usedWidth = r(shelf.usedWidth + pieceWidth);
                // Shelf height is the tallest piece — already sorted desc so no update needed
                // but guard against floating-point edge cases:
                if (pieceHeight > shelf.height) {
                    shelf.height = pieceHeight;
                }
                placed = true;
                break;
            }
        }

        if (!placed) {
            // Open a new shelf
            const y = shelves.length === 0
                ? 0
                : r(shelves[shelves.length - 1].y + shelves[shelves.length - 1].height);

            shelves.push({
                y,
                height: pieceHeight,
                pieces: [piece],
                usedWidth: pieceWidth,
            });
        }
    }

    return shelves;
}

// ---------------------------------------------------------------------------
// Step 3 — calculateNesting
// ---------------------------------------------------------------------------

/**
 * Full nesting calculation for a list of items on a given material.
 * Returns roll usage metrics and the shelf layout.
 */
export function calculateNesting(
    items: NestingItem[],
    material: MaterialConfig,
    overlap = 0,
): NestingResult {
    const empty: NestingResult = {
        totalLength: 0,
        totalArea: 0,
        totalPrice: 0,
        usefulArea: 0,
        wastePercent: 0,
        shelves: [],
    };

    if (!items.length) return empty;

    const validItems = items.filter(i => i.width > 0 && i.height > 0 && i.quantity > 0);
    if (!validItems.length) return empty;

    const pieces = preparePieces(validItems, material.printWidth, overlap);
    if (!pieces.length) return empty;

    const shelves = nestPieces(pieces, material.printWidth);

    const totalLength = r(
        shelves.reduce((sum, s) => sum + s.height, 0),
    );
    const totalArea = r(totalLength * material.rollWidth);
    const totalPrice = r(totalArea * material.pricePerM2);

    const usefulArea = r(
        validItems.reduce((sum, i) => sum + i.width * i.height * i.quantity, 0),
    );

    const wastePercent = totalArea > 0
        ? r(((totalArea - usefulArea) / totalArea) * 100)
        : 0;

    return {
        totalLength,
        totalArea,
        totalPrice,
        usefulArea,
        wastePercent,
        shelves,
    };
}

// ---------------------------------------------------------------------------
// Step 4 — calculateEstimateTotal
// ---------------------------------------------------------------------------

/**
 * Groups items by material, runs nesting per group, returns per-material
 * results and a grand total price.
 *
 * @param items   Flat array of items, each carrying a `materialKey` property.
 * @param getMaterial  Resolves a materialKey to its MaterialConfig.
 */
export function calculateEstimateTotal(
    items: (NestingItem & { materialKey: string })[],
    getMaterial: (key: string) => MaterialConfig | undefined,
): EstimateTotalResult {
    if (!items.length) {
        return { byMaterial: [], grandTotal: 0 };
    }

    // Group by material
    const groups = new Map<string, (NestingItem & { materialKey: string })[]>();
    for (const item of items) {
        if (!item.materialKey) continue;
        if (!groups.has(item.materialKey)) {
            groups.set(item.materialKey, []);
        }
        groups.get(item.materialKey)!.push(item);
    }

    const byMaterial: MaterialNestingResult[] = [];
    let grandTotal = 0;

    for (const [materialKey, groupItems] of groups) {
        const material = getMaterial(materialKey);
        if (!material) continue;

        const result = calculateNesting(groupItems, material);
        grandTotal = r(grandTotal + result.totalPrice);

        byMaterial.push({
            materialKey,
            materialLabel: material.label,
            result,
        });
    }

    return { byMaterial, grandTotal };
}
