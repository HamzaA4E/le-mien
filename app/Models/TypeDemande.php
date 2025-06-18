<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\SqlServerTimestamps;

class TypeDemande extends Model
{
    use HasFactory, SqlServerTimestamps;

    protected $table = 'T_TYPEDEMANDE';
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
        return $this->hasMany(Ticket::class, 'Id_TypeDemande');
    }
} 