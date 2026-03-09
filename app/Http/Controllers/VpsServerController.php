<?php

namespace App\Http\Controllers;

use App\Models\Subscription;
use App\Models\VpsServer;
use Illuminate\Http\Request;

class VpsServerController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'             => 'required|string|max:255',
            'customer_id'      => 'nullable|exists:customers,id',
            'price_yearly'    => 'nullable|numeric|min:0',
            'api_hostname'     => 'nullable|string|max:255',
            'ip_address'       => 'nullable|string|max:45',
            'storage_total_gb' => 'nullable|integer|min:0',
            'notes'            => 'nullable|string',
            'status'           => 'required|in:aktivni,neaktivni',
        ]);

        $validated['price_yearly']    = $validated['price_yearly'] ?? 0;
        $validated['storage_total_gb'] = $validated['storage_total_gb'] ?? 0;

        VpsServer::create($validated);

        return back()->with('success', 'VPS server vytvořen.');
    }

    public function update(Request $request, VpsServer $vp)
    {
        $validated = $request->validate([
            'name'             => 'required|string|max:255',
            'customer_id'      => 'nullable|exists:customers,id',
            'price_yearly'    => 'nullable|numeric|min:0',
            'api_hostname'     => 'nullable|string|max:255',
            'ip_address'       => 'nullable|string|max:45',
            'storage_total_gb' => 'nullable|integer|min:0',
            'notes'            => 'nullable|string',
            'status'           => 'required|in:aktivni,neaktivni',
        ]);

        $validated['price_yearly']    = $validated['price_yearly'] ?? 0;
        $validated['storage_total_gb'] = $validated['storage_total_gb'] ?? 0;

        $vp->update($validated);

        return back()->with('success', 'VPS server aktualizován.');
    }

    public function destroy(VpsServer $vp)
    {
        // Unlink all subscriptions from this VPS before soft-deleting
        Subscription::where('vps_server_id', $vp->id)->update(['vps_server_id' => null]);
        $vp->delete();

        return back()->with('success', 'VPS server smazán.');
    }

    /**
     * Semi-auto sync: Create VPS records from unique 'server' values on hostings,
     * then assign hostings to their VPS by matching the server field.
     */
    public function syncFromHostings()
    {
        $created  = 0;
        $assigned = 0;

        // Get unique server hostnames from active hostings
        $serverNames = Subscription::where('type', 'hosting')
            ->where('status', '!=', 'zruseno')
            ->whereNotNull('server')
            ->where('server', '!=', '')
            ->distinct()
            ->pluck('server');

        foreach ($serverNames as $serverName) {
            // Find or create VPS record (including soft-deleted)
            $vps = VpsServer::withTrashed()->where('name', $serverName)->first();

            if (!$vps) {
                $vps = VpsServer::create([
                    'name'         => $serverName,
                    'api_hostname' => $serverName,
                    'status'       => 'aktivni',
                ]);
                $created++;
            } elseif ($vps->trashed()) {
                $vps->restore();
                $created++;
            }

            // Assign all hostings with this server name to this VPS
            $count = Subscription::where('type', 'hosting')
                ->where('server', $serverName)
                ->whereNull('vps_server_id')
                ->update(['vps_server_id' => $vps->id]);

            $assigned += $count;
        }

        $msg = "VPS sync dokončen: {$created} nových serverů, {$assigned} hostingů přiřazeno.";

        return back()->with('success', $msg);
    }
}
