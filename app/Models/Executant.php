<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Executant extends Model
{
    use HasFactory;

    protected $table = 'T_EXECUTANT';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = [
        'designation',
    ];
} 