<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Executant extends Model
{
    use HasFactory;

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
} 