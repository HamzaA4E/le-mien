<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\SqlServerTimestamps;

class Executant extends Model
{
    use HasFactory, SqlServerTimestamps;

    protected $table = 'T_EXECUTANT';
    protected $primaryKey = 'id';
    public $timestamps = true;

    protected $fillable = [
        'designation',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean'
    ];

    public function tickets()
    {
        return $this->hasMany(Ticket::class, 'Id_Executant');
    }
<<<<<<< HEAD
}
=======

    public function utilisateur()
    {
        return $this->belongsTo(Utilisateur::class, 'designation', 'designation');
    }
} 
>>>>>>> 8176dcaab4dae6463e2f4422e7dd488ba8fe330b
