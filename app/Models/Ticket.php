<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ticket extends Model
{
    use HasFactory;

    protected $table = 'T_TICKET';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = [
        'Titre',
        'Description',
        'Commentaire',
        'attachment_path',
        'Id_Priorite',
        'Id_Statut',
        'Id_Demandeur',
        'Id_Societe',
        'Id_Emplacement',
        'Id_Categorie',
        'Id_TypeDemande',
        'Id_Utilisat',
        'Id_Executant',
        'DateDebut',
        'DateFinPrevue',
        'DateFinReelle',
        'DateCreation'
    ];

    protected $casts = [
        'Id_Priorite' => 'integer',
        'Id_Statut' => 'integer',
        'Id_Demandeur' => 'integer',
        'Id_Societe' => 'integer',
        'Id_Emplacement' => 'integer',
        'Id_Categorie' => 'integer',
        'Id_TypeDemande' => 'integer',
        'Id_Utilisat' => 'integer'
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($ticket) {
            if (empty($ticket->DateCreation)) {
                $ticket->DateCreation = now();
            }
        });
    }

    public function priorite()
    {
        return $this->belongsTo(Priorite::class, 'Id_Priorite');
    }

    public function statut()
    {
        return $this->belongsTo(Statut::class, 'Id_Statut');
    }

    public function demandeur()
    {
        return $this->belongsTo(Demandeur::class, 'Id_Demandeur');
    }

    public function societe()
    {
        return $this->belongsTo(Societe::class, 'Id_Societe');
    }

    public function emplacement()
    {
        return $this->belongsTo(Emplacement::class, 'Id_Emplacement');
    }

    public function categorie()
    {
        return $this->belongsTo(Categorie::class, 'Id_Categorie');
    }

    public function typeDemande()
    {
        return $this->belongsTo(TypeDemande::class, 'Id_TypeDemande');
    }

    public function utilisateur()
    {
        return $this->belongsTo(Utilisateur::class, 'Id_Utilisat');
    }

    public function executant()
    {
        return $this->belongsTo(Executant::class, 'Id_Executant');
    }

    public function scopeFinPrevueDans24hNonCloture($query)
    {
        $now = now();
        $in24h = $now->copy()->addDay();
        $clotureId = \App\Models\Statut::where('designation', 'Clôturé')->value('id');
        return $query->where('Id_Statut', '!=', $clotureId)
            ->whereRaw("CONVERT(datetime, DateFinPrevue, 103) BETWEEN ? AND ?", [
                $now->format('d/m/Y H:i:s'),
                $in24h->format('d/m/Y H:i:s')
            ]);
    }
} 