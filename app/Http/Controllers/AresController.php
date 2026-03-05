<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

class AresController extends Controller
{
    public function lookup(string $ico): JsonResponse
    {
        // Validate IČO format (8 digits)
        if (!preg_match('/^\d{8}$/', $ico)) {
            return response()->json(['error' => 'Neplatné IČO. Musí obsahovat 8 číslic.'], 422);
        }

        try {
            $response = Http::timeout(10)
                ->get("https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/{$ico}");

            if ($response->status() === 404) {
                return response()->json(['error' => 'Subjekt s tímto IČO nebyl nalezen.'], 404);
            }

            if (!$response->successful()) {
                return response()->json(['error' => 'Chyba při komunikaci s ARES.'], 502);
            }

            $data = $response->json();
            $sidlo = $data['sidlo'] ?? [];

            // Build street from components
            $street = '';
            if (!empty($sidlo['nazevUlice'])) {
                $street = $sidlo['nazevUlice'];
                if (!empty($sidlo['cisloDomovni'])) {
                    $street .= ' ' . $sidlo['cisloDomovni'];
                }
                if (!empty($sidlo['cisloOrientacni'])) {
                    $street .= '/' . $sidlo['cisloOrientacni'];
                    if (!empty($sidlo['cisloOrientacniPismeno'])) {
                        $street .= $sidlo['cisloOrientacniPismeno'];
                    }
                }
            }

            // Determine if VAT payer
            $registrations = $data['seznamRegistraci'] ?? [];
            $isVatPayer = ($registrations['stavZdrojeDph'] ?? '') === 'AKTIVNI';

            return response()->json([
                'ico' => $data['ico'] ?? $ico,
                'name' => $data['obchodniJmeno'] ?? '',
                'dic' => $data['dic'] ?? '',
                'is_vat_payer' => $isVatPayer,
                'street' => $street,
                'city' => $sidlo['nazevObce'] ?? '',
                'zip' => isset($sidlo['psc']) ? (string) $sidlo['psc'] : '',
                'country' => $sidlo['nazevStatu'] ?? 'Česká republika',
                'full_address' => $sidlo['textovaAdresa'] ?? '',
                'legal_form' => $data['pravniForma'] ?? '',
                'date_created' => $data['datumVzniku'] ?? '',
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Nepodařilo se připojit k ARES.'], 503);
        }
    }
}
