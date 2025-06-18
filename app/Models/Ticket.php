<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use App\Traits\SqlServerTimestamps;

class Ticket extends Model
{
    use HasFactory, SqlServerTimestamps;

    protected $table = 'T_TICKET';
    protected $primaryKey = 'id';
    public $timestamps = true;

    protected $fillable = [
        'Titre',
        'Description',
        'Commentaire',
        'attachment_path',
        'Id_Priorite',
        'Id_Statut',
        'Id_Demandeur',
        'Id_Emplacement',
        'Id_Categorie',
        'Id_Utilisat',
        'Id_Executant',
        'Id_TypeDemande',
        'DateDebut',
        'DateFinPrevue',
        'DateFinReelle',
        'DateCreation'
    ];

    protected $casts = [
        'Id_Priorite' => 'integer',
        'Id_Statut' => 'integer',
        'Id_Demandeur' => 'integer',
        'Id_Emplacement' => 'integer',
        'Id_Categorie' => 'integer',
        'Id_Utilisat' => 'integer',
        'Id_Executant' => 'integer',
<<<<<<< HEAD
        'Id_TypeDemande' => 'integer',
=======
<<<<<<< HEAD
        'DateDebut' => 'datetime:Y-m-d H:i:s',
        'DateFinPrevue' => 'datetime:Y-m-d H:i:s',
        'DateFinReelle' => 'datetime:Y-m-d H:i:s',
        'DateCreation' => 'datetime:Y-m-d H:i:s'
=======
>>>>>>> 8176dcaab4dae6463e2f4422e7dd488ba8fe330b
        'DateDebut' => 'datetime',
        'DateFinPrevue' => 'datetime',
        'DateFinReelle' => 'datetime',
        'DateCreation' => 'datetime'
<<<<<<< HEAD
=======
>>>>>>> 46cd5876bf4b7d239f618da105529430663a7e10
>>>>>>> 8176dcaab4dae6463e2f4422e7dd488ba8fe330b
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($ticket) {
            if (empty($ticket->DateCreation)) {
                $ticket->DateCreation = now();
            }
            // Si un commentaire est fourni, on le formate comme un commentaire normal avec l'ID du demandeur
            if (!empty($ticket->Commentaire) && !empty($ticket->Id_Demandeur)) {
                $ticket->Commentaire = sprintf(
                    "[%d|%s]%s",
                    $ticket->Id_Demandeur,
                    now()->format('Y-m-d H:i:s'),
                    $ticket->Commentaire
                );
            }
        });

        static::saving(function ($ticket) {
<<<<<<< HEAD
            // Format all dates to SQL Server compatible format
            $dateFields = ['DateDebut', 'DateFinPrevue', 'DateFinReelle', 'DateCreation'];
            
            foreach ($dateFields as $field) {
                if ($ticket->isDirty($field) && $ticket->$field) {
                    try {
                        $date = \Carbon\Carbon::parse($ticket->$field);
                        $ticket->$field = $date->format('Y-m-d H:i:s');
                    } catch (\Exception $e) {
                        \Log::error("Error formatting date for field {$field}: " . $e->getMessage());
                    }
                }
=======
            // Convertir les dates au format SQL Server si elles sont modifiées
            if ($ticket->isDirty('DateDebut')) {
                $ticket->DateDebut = DB::raw("CONVERT(datetime, '{$ticket->DateDebut}', 120)");
            }
            if ($ticket->isDirty('DateFinPrevue')) {
                $ticket->DateFinPrevue = DB::raw("CONVERT(datetime, '{$ticket->DateFinPrevue}', 120)");
            }
            if ($ticket->isDirty('DateFinReelle')) {
                $ticket->DateFinReelle = DB::raw("CONVERT(datetime, '{$ticket->DateFinReelle}', 120)");
            }
            if ($ticket->isDirty('DateCreation')) {
                $ticket->DateCreation = DB::raw("CONVERT(datetime, '{$ticket->DateCreation}', 120)");
>>>>>>> 46cd5876bf4b7d239f618da105529430663a7e10
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

    public function reports()
    {
        return $this->hasMany(TicketReport::class, 'Id_Ticket');
    }

    public function setCreatedAtAttribute($value)
    {
        if (!$value) {
            $this->attributes['created_at'] = null;
            return;
        }
        $this->attributes['created_at'] = \Carbon\Carbon::parse($value)->format('Y-m-d');
    }

    public function setUpdatedAtAttribute($value)
    {
        if (!$value) {
            $this->attributes['updated_at'] = null;
            return;
        }
        $this->attributes['updated_at'] = \Carbon\Carbon::parse($value)->format('Y-m-d');
    }

    public function setDateCreationAttribute($value)
    {
        if (!$value) {
            $this->attributes['DateCreation'] = null;
            return;
        }
        $this->attributes['DateCreation'] = \Carbon\Carbon::parse($value)->format('Y-m-d');
    }

    public function setDateDebutAttribute($value)
    {
        if (!$value) {
            $this->attributes['DateDebut'] = null;
            return;
        }
        $this->attributes['DateDebut'] = \Carbon\Carbon::parse($value)->format('Y-m-d');
    }

    public function setDateFinPrevueAttribute($value)
    {
        if (!$value) {
            $this->attributes['DateFinPrevue'] = null;
            return;
        }
        $this->attributes['DateFinPrevue'] = \Carbon\Carbon::parse($value)->format('Y-m-d');
    }

    public function setDateFinReelleAttribute($value)
    {
        if (!$value) {
            $this->attributes['DateFinReelle'] = null;
            return;
        }
        $this->attributes['DateFinReelle'] = \Carbon\Carbon::parse($value)->format('Y-m-d');
    }
} 