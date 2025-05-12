<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Emplacement extends Model
{
    use HasFactory;

    protected $table = 'T_EMPLACEMENT';
    protected $primaryKey = 'id';

    protected $fillable = [
        'designation'
    ];
} 