<?php

namespace App\Http\Controllers;

use App\Models\SyncBlacklist;

class SyncBlacklistController extends Controller
{
    public function destroy(SyncBlacklist $blacklist)
    {
        $domain = $blacklist->domain_name;
        $blacklist->delete();

        return back()->with('success', "Domena \"{$domain}\" odebrana z vyjimek.");
    }
}
