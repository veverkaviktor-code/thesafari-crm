<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class WebsiteCredential extends Model
{
    use LogsActivity;

    protected $fillable = [
        'website_id',
        'label',
        'login',
        'password',
        'email',
        'notes',
        'sort_order',
    ];

    protected $hidden = ['password'];

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
            ->logOnlyDirty()
            ->dontLogIfAttributesChangedOnly(['password']);
    }

    public function website(): BelongsTo
    {
        return $this->belongsTo(Website::class);
    }
}
