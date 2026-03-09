<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Customer extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $fillable = [
        'type',
        'name',
        'company',
        'ico',
        'dic',
        'contact_person',
        'email',
        'phone',
        'web',
        'billing_address',
        'delivery_address',
        'notes',
        'tags',
        'avatar_path',
    ];

    protected function casts(): array
    {
        return [
            'billing_address' => 'array',
            'delivery_address' => 'array',
            'tags' => 'array',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty();
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function vpsServers(): HasMany
    {
        return $this->hasMany(VpsServer::class);
    }

    public function scopeSearch($query, ?string $term)
    {
        if (! $term) {
            return $query;
        }

        return $query->where(function ($q) use ($term) {
            $q->where('name', 'ilike', "%{$term}%")
              ->orWhere('company', 'ilike', "%{$term}%")
              ->orWhere('email', 'ilike', "%{$term}%")
              ->orWhere('phone', 'ilike', "%{$term}%")
              ->orWhere('ico', 'ilike', "%{$term}%");
        });
    }
}
