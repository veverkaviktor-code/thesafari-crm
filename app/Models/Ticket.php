<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Ticket extends Model
{
    use HasFactory, SoftDeletes, MassPrunable, LogsActivity;

    protected $fillable = [
        'customer_id',
        'subject',
        'status',
        'priority',
        'source_email',
        'resolved_at',
        'source',
        'phone',
        'website',
        'first_name',
        'last_name',
        'content',
    ];

    protected function casts(): array
    {
        return [
            'resolved_at' => 'datetime',
        ];
    }

    public function prunable()
    {
        return static::onlyTrashed()->where('deleted_at', '<=', now()->subDays(30));
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty();
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(TicketMessage::class)->orderBy('created_at');
    }

    public function latestMessage()
    {
        return $this->hasOne(TicketMessage::class)->latestOfMany();
    }

    public function scopeOpen($query)
    {
        return $query->whereIn('status', ['novy', 'v_reseni', 'ceka_na_zakaznika']);
    }

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByPriority($query, string $priority)
    {
        return $query->where('priority', $priority);
    }

    public static function matchCustomerByEmail(string $email): ?int
    {
        $customer = Customer::where('email', $email)->first();
        return $customer?->id;
    }
}
