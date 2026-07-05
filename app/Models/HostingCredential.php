<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class HostingCredential extends Model
{
    use LogsActivity;

    protected $table = 'hosting_credentials';

    protected $fillable = [
        'hosting_id',
        'label',
        'login',
        'password',
        'email',
        'notes',
        'sort_order',
    ];

    protected $hidden = ['password'];

    protected $logFillable = true;

    protected $logOnlyDirty = true;

    protected function casts(): array
    {
        return [
            'password' => 'encrypted',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logExcept(['password'])
            ->logOnlyDirty();
    }

    public function hosting(): BelongsTo
    {
        return $this->belongsTo(Hosting::class);
    }
}
