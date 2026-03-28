<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Hosting;
use App\Models\VpsServer;
use Illuminate\Http\Request;
use Inertia\Inertia;

class VpsServerController extends Controller
{
    public function index()
    {
        $vpsServers = VpsServer::with('customer')
            ->withCount('hostings')
            ->get()
            ->map(function ($server) {
                $server->storage_used_mb = (int) Hosting::where('server_id', $server->id)
                    ->where('status', 'aktivni')
                    ->sum('storage_used_mb');
                return $server;
            });

        $customers = Customer::orderBy('name')
            ->select('id', 'name', 'company')
            ->get();

        return Inertia::render('Vps/Index', [
            'vpsServers' => $vpsServers,
            'customers' => $customers,
        ]);
    }

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
            'expires_at'       => 'nullable|date',
            'auto_invoice'     => 'boolean',
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
            'expires_at'       => 'nullable|date',
            'auto_invoice'     => 'boolean',
        ]);

        $validated['price_yearly']    = $validated['price_yearly'] ?? 0;
        $validated['storage_total_gb'] = $validated['storage_total_gb'] ?? 0;

        $vp->update($validated);

        return back()->with('success', 'VPS server aktualizován.');
    }

    public function destroy(VpsServer $vp)
    {
        // Unlink all hostings from this VPS before soft-deleting
        Hosting::where('server_id', $vp->id)->update(['server_id' => null]);
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
        $serverNames = Hosting::where('status', '!=', 'zruseno')
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
            $count = Hosting::where('server', $serverName)
                ->whereNull('server_id')
                ->update(['server_id' => $vps->id]);

            $assigned += $count;
        }

        $msg = "VPS sync dokončen: {$created} nových serverů, {$assigned} hostingů přiřazeno.";

        return back()->with('success', $msg);
    }
}
