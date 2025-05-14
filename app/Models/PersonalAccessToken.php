<?php

namespace App\Models;

use Laravel\Sanctum\PersonalAccessToken as SanctumPersonalAccessToken;
use Illuminate\Support\Facades\Log;

class PersonalAccessToken extends SanctumPersonalAccessToken
{
    protected $dateFormat = 'Y-m-d H:i:s';

    protected $casts = [
        'abilities' => 'json',
        'last_used_at' => 'datetime:Y-m-d H:i:s',
        'expires_at' => 'datetime:Y-m-d H:i:s',
        'created_at' => 'datetime:Y-m-d H:i:s',
        'updated_at' => 'datetime:Y-m-d H:i:s',
        'tokenable_id' => 'integer'
    ];

    protected $fillable = [
        'name',
        'token',
        'abilities',
        'tokenable_id',
        'tokenable_type',
        'last_used_at',
        'expires_at',
        'created_at',
        'updated_at'
    ];

    protected function serializeDate(\DateTimeInterface $date)
    {
        return $date->format('Y-m-d H:i:s');
    }
} 