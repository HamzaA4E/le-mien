<?php

namespace App\Traits;

use Carbon\Carbon;

trait SqlServerTimestamps
{
    // Gestion des timestamps pour SQL Server - Utilisation de la date seulement
    public function getCreatedAtAttribute($value)
    {
        if (!$value) return null;
        
        // Si c'est déjà une date au format Y-m-d, la retourner directement
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return $value;
        }
        
        // Sinon, parser et formater
        return Carbon::parse($value)->format('Y-m-d');
    }

    public function getUpdatedAtAttribute($value)
    {
        if (!$value) return null;
        
        // Si c'est déjà une date au format Y-m-d, la retourner directement
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return $value;
        }
        
        // Sinon, parser et formater
        return Carbon::parse($value)->format('Y-m-d');
    }

    public function setCreatedAtAttribute($value)
    {
        if (!$value) {
            $this->attributes['created_at'] = null;
            return;
        }
        
        // S'assurer que c'est au format Y-m-d
        $this->attributes['created_at'] = Carbon::parse($value)->format('Y-m-d');
    }

    public function setUpdatedAtAttribute($value)
    {
        if (!$value) {
            $this->attributes['updated_at'] = null;
            return;
        }
        
        // S'assurer que c'est au format Y-m-d
        $this->attributes['updated_at'] = Carbon::parse($value)->format('Y-m-d');
    }
}