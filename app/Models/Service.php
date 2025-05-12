<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    protected $table = 'T_SERVICE';
    protected $primaryKey = 'id';

    protected $fillable = [
        'designation'
    ];
} 