<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\Utilisateur;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TicketStatsController extends Controller
{
    public function getStats()
    {
        $stats = Utilisateur::select(
            'T_UTILISATEUR.id as userId',
            'T_UTILISATEUR.Nom as userName',
            DB::raw('COUNT(T_TICKET.id) as totalTickets'),
            DB::raw('SUM(CASE WHEN T_TICKET.Id_Statut = 1 THEN 1 ELSE 0 END) as openTickets'),
            DB::raw('SUM(CASE WHEN T_TICKET.Id_Statut = 2 THEN 1 ELSE 0 END) as inProgressTickets'),
            DB::raw('SUM(CASE WHEN T_TICKET.Id_Statut = 3 THEN 1 ELSE 0 END) as resolvedTickets')
        )
        ->leftJoin('T_TICKET', 'T_UTILISATEUR.id', '=', 'T_TICKET.Id_Utilisat')
        ->groupBy('T_UTILISATEUR.id', 'T_UTILISATEUR.Nom')
        ->get();

        return response()->json($stats);
    }
} 