<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Demandeur extends Model
{
    use HasFactory;

    protected $table = 'T_DEMDEUR';
    protected $primaryKey = 'id';

    protected $fillable = [
        'designation',
        'id_service',
        'statut'
    ];

    protected $casts = [
        'id_service' => 'integer',
        'statut' => 'integer'
    ];

    public function service()
    {
        return $this->belongsTo(Service::class, 'id_service');
    }
} 