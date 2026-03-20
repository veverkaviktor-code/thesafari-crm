<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SubscriptionFolder extends Model
{
    protected $fillable = [
        'name',
        'color',
        'is_collapsed',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_collapsed' => 'boolean',
        ];
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class, 'folder_id');
    }
}
