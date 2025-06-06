<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Emplacement extends Model
{
    use HasFactory;

    protected $table = 'T_EMPLACEMENT';
    protected $primaryKey = 'id';
    public $timestamps = true;

    protected $fillable = [
        'designation',
        'is_active',
        'created_at',
        'updated_at'
    ];

    public function tickets()
    {
        return $this->hasMany(Ticket::class, 'Id_Emplacement');
    }
} 