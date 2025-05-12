<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Categorie extends Model
{
    use HasFactory;

    protected $table = 'T_CATEGORIE';
    protected $primaryKey = 'id';

    protected $fillable = [
        'designation'
    ];
} 