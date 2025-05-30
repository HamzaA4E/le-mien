<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Demandeur extends Model
{
    use HasFactory;

    protected $table = 'T_DEMDEUR';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = [
        'designation',
        'id_service',
        'statut',
        'is_active'
    ];

    protected $casts = [
        'id_service' => 'integer',
        'statut' => 'integer',
        'is_active' => 'boolean'
    ];

    public function service()
    {
        return $this->belongsTo(Service::class, 'id_service');
    }

    public function tickets()
    {
        return $this->hasMany(Ticket::class, 'Id_Demandeur');
    }

    public function utilisateur()
    {
        return $this->hasOne(Utilisateur::class, 'designation', 'designation');
    }
} 