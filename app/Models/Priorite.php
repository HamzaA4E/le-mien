<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Priorite extends Model
{
    use HasFactory;

    protected $table = 'T_PRIORITE';
    protected $primaryKey = 'id';

    protected $fillable = [
        'designation',
        'ordre'
    ];
} 