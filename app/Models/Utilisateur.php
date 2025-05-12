<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Utilisateur extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $table = 'T_UTILISAT';
    protected $primaryKey = 'id';

    protected $fillable = [
        'designation',
        'email',
        'password',
        'niveau',
        'statut'
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'niveau' => 'integer',
        'statut' => 'integer',
        'password' => 'hashed'
    ];
} 