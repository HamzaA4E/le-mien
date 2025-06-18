<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\SqlServerTimestamps;

class Priorite extends Model
{
    use HasFactory, SqlServerTimestamps;

    protected $table = 'T_PRIORITE';
    protected $primaryKey = 'id';
    public $timestamps = true;

    protected $fillable = [
        'designation',
        'is_active'
    ];

    public function tickets()
    {
        return $this->hasMany(\App\Models\Ticket::class, 'Id_Priorite');
    }
}