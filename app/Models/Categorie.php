<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Categorie extends Model
{
    use HasFactory;

    protected $table = 'T_CATEGORIE';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = [
        'designation',
        'is_active'
    ];

    public function tickets()
    {
        return $this->hasMany(\App\Models\Ticket::class, 'Id_Categorie');
    }
} 