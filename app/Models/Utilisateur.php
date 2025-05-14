<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Support\Facades\Log;
use Laravel\Sanctum\PersonalAccessToken;

class Utilisateur extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'T_UTILISAT';
    protected $primaryKey = 'id';
    public $incrementing = true;
    protected $keyType = 'integer';

    protected $fillable = [
        'designation',
        'email',
        'password',
        'niveau',
        'statut',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'id' => 'integer',
        'niveau' => 'integer',
        'statut' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the tokens that belong to the user.
     */
    public function tokens()
    {
        Log::info('Utilisateur::tokens() - User ID: ' . $this->id);
        Log::info('Utilisateur::tokens() - User Class: ' . get_class($this));
        return $this->morphMany(PersonalAccessToken::class, 'tokenable');
    }

    /**
     * Get the primary key for the model.
     */
    public function getKey()
    {
        Log::info('Utilisateur::getKey() - Primary Key: ' . $this->id);
        return $this->id;
    }

    /**
     * Get the name of the primary key for the model.
     */
    public function getKeyName()
    {
        return 'id';
    }
} 