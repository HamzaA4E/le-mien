<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Societe extends Model
{
    protected $table = 'T_SOCIETE';
    protected $primaryKey = 'id';

    protected $fillable = [
        'designation'
    ];
} 