<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\SqlServerTimestamps;

class Statut extends Model
{
    use HasFactory, SqlServerTimestamps;

    protected $table = 'T_STATUT';
    protected $primaryKey = 'id';
    public $timestamps = true;

    protected $fillable = [
        'designation',
        'is_active'
    ];
}