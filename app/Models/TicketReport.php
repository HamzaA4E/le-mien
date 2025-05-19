<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class TicketReport extends Model
{
    use HasFactory;

    protected $table = 'T_TICKET_REPORT';
    protected $primaryKey = 'id';
    public $timestamps = true;

    protected $fillable = [
        'Id_Ticket',
        'Id_Responsable',
        'Raison',
        'DateReport'
    ];

    protected $casts = [
        'Id_Ticket' => 'integer',
        'Id_Responsable' => 'integer',
        'DateReport' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($report) {
            \Illuminate\Support\Facades\Log::info('Creating ticket report', [
                'report' => $report->toArray()
            ]);
            
            if (empty($report->DateReport)) {
                $report->DateReport = DB::raw('GETDATE()');
            }
        });

        static::created(function ($report) {
            \Illuminate\Support\Facades\Log::info('Ticket report created', [
                'report' => $report->toArray()
            ]);
        });
    }

    public function ticket()
    {
        return $this->belongsTo(Ticket::class, 'Id_Ticket');
    }

    public function responsable()
    {
        return $this->belongsTo(Utilisateur::class, 'Id_Responsable', 'id');
    }
} 