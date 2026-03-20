<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SyncBlacklist extends Model
{
    public $timestamps = false;

    protected $table = 'sync_blacklist';

    protected $fillable = [
        'domain_name',
        'reason',
    ];
}
