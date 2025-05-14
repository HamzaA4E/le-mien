<?php

namespace App\Traits;

use Laravel\Sanctum\HasApiTokens as SanctumHasApiTokens;
use Laravel\Sanctum\NewAccessToken;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Laravel\Sanctum\PersonalAccessToken;

trait HasApiTokens
{
    use SanctumHasApiTokens;

    public function createToken(string $name, array $abilities = ['*'])
    {
        $plainTextToken = Str::random(64);
        $expiresAt = Carbon::now()->addDays(30)->format('Y-m-d H:i:s');
        
        Log::info('Creating token for user:', [
            'user_id' => $this->ID_UTILISAT,
            'user_class' => get_class($this),
            'key_name' => $this->getKeyName()
        ]);

        // Créer le token directement avec PersonalAccessToken
        $token = new PersonalAccessToken();
        $token->name = $name;
        $token->token = hash('sha256', $plainTextToken);
        $token->abilities = $abilities;
        $token->expires_at = $expiresAt;
        $token->tokenable_id = (int) $this->ID_UTILISAT;
        $token->tokenable_type = get_class($this);
        $token->created_at = Carbon::now();
        $token->updated_at = Carbon::now();
        
        Log::info('Token before save:', [
            'tokenable_id' => $token->tokenable_id,
            'tokenable_type' => $token->tokenable_type
        ]);
        
        $token->save();

        Log::info('Token created:', [
            'token_id' => $token->id,
            'tokenable_id' => $token->tokenable_id,
            'tokenable_type' => $token->tokenable_type
        ]);

        return new NewAccessToken($token, $token->getKey().'|'.$plainTextToken);
    }
} 