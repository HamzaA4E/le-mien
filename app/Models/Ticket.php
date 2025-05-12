<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Ticket extends Model
{
    use HasFactory;

    protected $table = 'T_TICKET';
    protected $primaryKey = 'id';
    public $timestamps = true;

    protected $fillable = [
        'titre',
        'description',
        'commentaire',
        'id_priorite',
        'id_statut',
        'id_demandeur',
        'id_societe',
        'id_emplacement',
        'id_categorie',
        'id_type_demande',
        'id_utilisateur',
        'date_debut',
        'date_fin_prevue',
        'date_fin_reelle',
        'date_creation'
    ];

    protected $casts = [
        'date_debut' => 'datetime:Y-m-d H:i:s',
        'date_fin_prevue' => 'datetime:Y-m-d H:i:s',
        'date_fin_reelle' => 'datetime:Y-m-d H:i:s',
        'date_creation' => 'datetime:Y-m-d H:i:s',
        'created_at' => 'datetime:Y-m-d H:i:s',
        'updated_at' => 'datetime:Y-m-d H:i:s'
    ];

    public function priorite()
    {
        return $this->belongsTo(Priorite::class, 'id_priorite');
    }

    public function statut()
    {
        return $this->belongsTo(Statut::class, 'id_statut');
    }

    public function demandeur()
    {
        return $this->belongsTo(Demandeur::class, 'id_demandeur');
    }

    public function societe()
    {
        return $this->belongsTo(Societe::class, 'id_societe');
    }

    public function emplacement()
    {
        return $this->belongsTo(Emplacement::class, 'id_emplacement');
    }

    public function categorie()
    {
        return $this->belongsTo(Categorie::class, 'id_categorie');
    }

    public function typeDemande()
    {
        return $this->belongsTo(TypeDemande::class, 'id_type_demande');
    }

    public function utilisateur()
    {
        return $this->belongsTo(Utilisateur::class, 'id_utilisateur');
    }

    public function getDateDebutAttribute($value)
    {
        return $value ? Carbon::parse($value)->format('Y-m-d H:i:s') : null;
    }

    public function getDateFinPrevueAttribute($value)
    {
        return $value ? Carbon::parse($value)->format('Y-m-d H:i:s') : null;
    }

    public function getDateFinReelleAttribute($value)
    {
        return $value ? Carbon::parse($value)->format('Y-m-d H:i:s') : null;
    }

    public function getDateCreationAttribute($value)
    {
        return $value ? Carbon::parse($value)->format('Y-m-d H:i:s') : null;
    }

    public function setDateDebutAttribute($value)
    {
        $this->attributes['date_debut'] = $value ? Carbon::parse($value)->format('Y-m-d H:i:s') : null;
    }

    public function setDateFinPrevueAttribute($value)
    {
        $this->attributes['date_fin_prevue'] = $value ? Carbon::parse($value)->format('Y-m-d H:i:s') : null;
    }

    public function setDateFinReelleAttribute($value)
    {
        $this->attributes['date_fin_reelle'] = $value ? Carbon::parse($value)->format('Y-m-d H:i:s') : null;
    }

    public function setDateCreationAttribute($value)
    {
        $this->attributes['date_creation'] = $value ? Carbon::parse($value)->format('Y-m-d H:i:s') : null;
    }
} 