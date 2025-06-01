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

    // Constantes pour les niveaux d'utilisateur
    const NIVEAU_ADMINISTRATEUR = 1;
    const NIVEAU_directeur_general = 2;
    const NIVEAU_DIRECTEUR_DEPARTEMENT = 3;
    const NIVEAU_DEMANDEUR = 4;

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
        'id_service',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'id' => 'integer',
        'niveau' => 'integer',
        'statut' => 'integer',
        'id_service' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Vérifie si l'utilisateur est un administrateur
     */
    public function isAdmin()
    {
        return $this->niveau === self::NIVEAU_ADMINISTRATEUR;
    }

    /**
     * Vérifie si l'utilisateur est un directeur général
     */
    public function isDirecteurGeneral()
    {
        return $this->niveau === self::NIVEAU_directeur_general;
    }

    /**
     * Vérifie si l'utilisateur est un directeur département
     */
    public function isDirecteurDepartement()
    {
        return $this->niveau === self::NIVEAU_DIRECTEUR_DEPARTEMENT;
    }

    /**
     * Vérifie si l'utilisateur est un demandeur
     */
    public function isDemandeur()
    {
        return $this->niveau === self::NIVEAU_DEMANDEUR;
    }

    /**
     * Get the demandeur associated with the user.
     */
    public function demandeur()
    {
        return $this->hasOne(Demandeur::class, 'designation', 'designation');
    }

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

    /**
     * Get the service associated with the user.
     */
    public function service()
    {
        return $this->belongsTo(\App\Models\Service::class, 'id_service');
    }
} 