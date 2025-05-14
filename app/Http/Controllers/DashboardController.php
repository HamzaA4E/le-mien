<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\Statut;
use App\Models\Priorite;
use App\Models\Categorie;
use App\Models\Utilisateur;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DashboardController extends Controller
{
    public function getStats()
    {
        try {
            Log::info('Début de la récupération des statistiques');

            // Total des tickets
            $total = Ticket::count();

            // Tickets par statut
            $en_cours = Ticket::whereHas('statut', function($query) {
                $query->where('designation', 'En cours');
            })->count();

            $en_instance = Ticket::whereHas('statut', function($query) {
                $query->where('designation', 'En instance');
            })->count();

            $cloture = Ticket::whereHas('statut', function($query) {
                $query->where('designation', 'Clôturé');
            })->count();

            // Statistiques des tickets par priorité
            $par_priorite = Priorite::select('T_PRIORITE.designation as priorite', DB::raw('count(T_TICKET.id) as total'))
                ->leftJoin('T_TICKET', 'T_PRIORITE.id', '=', 'T_TICKET.id_priorite')
                ->groupBy('T_PRIORITE.id', 'T_PRIORITE.designation')
                ->orderBy('T_PRIORITE.id')
                ->get();

            // Statistiques des tickets par catégorie
            $par_categorie = Categorie::select('T_CATEGORIE.designation as categorie', DB::raw('count(T_TICKET.id) as total'))
                ->leftJoin('T_TICKET', 'T_CATEGORIE.id', '=', 'T_TICKET.id_categorie')
                ->groupBy('T_CATEGORIE.id', 'T_CATEGORIE.designation')
                ->orderBy('T_CATEGORIE.id')
                ->get();

            $stats = [
                'total' => $total,
                'en_cours' => $en_cours,
                'en_instance' => $en_instance,
                'cloture' => $cloture,
                'par_priorite' => $par_priorite,
                'par_categorie' => $par_categorie
            ];

            Log::info('Statistiques récupérées avec succès', $stats);

            return response()->json($stats);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des statistiques: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Erreur lors de la récupération des statistiques',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getStatsByUser()
    {
        try {
            Log::info('Début de la récupération des statistiques par utilisateur');

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

            Log::info('Statistiques par utilisateur récupérées avec succès');

            return response()->json($stats);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des statistiques par utilisateur: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Erreur lors de la récupération des statistiques par utilisateur',
                'error' => $e->getMessage()
            ], 500);
        }
    }
} 