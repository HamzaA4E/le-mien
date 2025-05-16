<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Societe extends Model
{
    protected $table = 'T_SOCIETE';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = [
        'designation',
        'is_active',
    ];

   
} 