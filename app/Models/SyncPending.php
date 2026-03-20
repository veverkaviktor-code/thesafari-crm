<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SyncPending extends Model
{
    public $timestamps = false;

    protected $table = 'sync_pending';

    protected $fillable = [
        'domain_name',
        'source',
    ];
}
