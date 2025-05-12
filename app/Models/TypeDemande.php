<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TypeDemande extends Model
{
    use HasFactory;

    protected $table = 'T_TYPEDEMANDE';
    protected $primaryKey = 'id';

    protected $fillable = [
        'designation'
    ];
} 