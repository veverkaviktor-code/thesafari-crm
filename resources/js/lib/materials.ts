export interface MaterialConfig {
    key: string;
    label: string;
    rollWidth: number;    // meters - full roll width (for price calc)
    printWidth: number;   // meters - usable print width (for nesting)
    pricePerM2: number;   // CZK
    hasLamination: boolean;
}

export const MATERIALS: Record<string, MaterialConfig> = {
    folie_polymericka: {
        key: 'folie_polymericka',
        label: 'Fólie polymerická',
        rollWidth: 1.37,
        printWidth: 1.34,
        pricePerM2: 750,
        hasLamination: true,
    },
    folie_lita: {
        key: 'folie_lita',
        label: 'Fólie litá',
        rollWidth: 1.37,
        printWidth: 1.34,
        pricePerM2: 1050,
        hasLamination: true,
    },
    owv: {
        key: 'owv',
        label: 'One Way Vision',
        rollWidth: 1.37,
        printWidth: 1.34,
        pricePerM2: 550,
        hasLamination: true,
    },
    banner: {
        key: 'banner',
        label: 'Banner',
        rollWidth: 1.37,
        printWidth: 1.25,
        pricePerM2: 400,
        hasLamination: false,
    },
    rezana: {
        key: 'rezana',
        label: 'Řezaná fólie',
        rollWidth: 0.62,
        printWidth: 0.58,
        pricePerM2: 750,
        hasLamination: false,
    },
};

export const LAMINATION_OPTIONS = [
    { value: 'matna', label: 'Matná' },
    { value: 'leskla', label: 'Lesklá' },
] as const;

export type LaminationValue = (typeof LAMINATION_OPTIONS)[number]['value'];
