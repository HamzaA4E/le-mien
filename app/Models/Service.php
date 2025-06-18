<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\SqlServerTimestamps;

class Service extends Model
{
    use SqlServerTimestamps;

    protected $table = 'T_SERVICE';
    protected $primaryKey = 'id';
    public $timestamps = true;

    protected $fillable = [
        'designation',
        'is_active'
    ];
}