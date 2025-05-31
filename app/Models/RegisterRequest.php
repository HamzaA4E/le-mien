<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class RegisterRequest extends Model
{
    protected $table = 'register_requests';
    public $timestamps = true;

    protected $fillable = [
        'full_name',
        'email',
        'level',
        'service_id',
        'status'
    ];

    protected $casts = [
        'service_id' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    public static function create(array $attributes = [])
    {
        $query = "INSERT INTO register_requests 
            (full_name, email, level, service_id, status, created_at, updated_at)
            VALUES (:full_name, :email, :level, :service_id, :status, GETDATE(), GETDATE())";
            
        DB::insert($query, [
            'full_name' => $attributes['full_name'],
            'email' => $attributes['email'],
            'level' => $attributes['level'],
            'service_id' => $attributes['service_id'],
            'status' => $attributes['status'] ?? 'pending'
        ]);

        return static::where('email', $attributes['email'])->latest()->first();
    }

    public function getCreatedAtAttribute($value)
    {
        return $value ? Carbon::parse($value)->format('Y-m-d H:i:s') : null;
    }

    public function getUpdatedAtAttribute($value)
    {
        return $value ? Carbon::parse($value)->format('Y-m-d H:i:s') : null;
    }

    public function setCreatedAtAttribute($value)
    {
        $this->attributes['created_at'] = $value ? Carbon::parse($value)->format('Y-m-d H:i:s') : null;
    }

    public function setUpdatedAtAttribute($value)
    {
        $this->attributes['updated_at'] = $value ? Carbon::parse($value)->format('Y-m-d H:i:s') : null;
    }

    public function service()
    {
        return $this->belongsTo(Service::class, 'service_id');
    }
} 