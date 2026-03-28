<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ManagementPlan extends Model
{
    protected $fillable = [
        'name',
        'price_monthly',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'price_monthly' => 'decimal:2',
        ];
    }

    public function hostings(): HasMany
    {
        return $this->hasMany(Hosting::class);
    }
}
