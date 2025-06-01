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
    public function getStats(Request $request)
    {
        try {
            Log::info('Début de la récupération des statistiques');

            $statut = $request->query('statut');
            $priorite = $request->query('priorite');
            $demandeur = $request->query('demandeur');
            $categorie = $request->query('categorie');
            $user = auth()->user();

            // Requête pour les tickets par statut
            $ticketsByStatut = DB::table('T_STATUT')
                ->leftJoin('T_TICKET', function($join) use ($statut, $priorite, $demandeur, $categorie, $user) {
                    $join->on('T_STATUT.id', '=', 'T_TICKET.Id_Statut');
                    if ($statut) $join->where('T_TICKET.Id_Statut', $statut);
                    if ($priorite) $join->where('T_TICKET.Id_Priorite', $priorite);
                    if ($demandeur) $join->where('T_TICKET.Id_Demandeur', $demandeur);
                    if ($categorie) $join->where('T_TICKET.Id_Categorie', $categorie);
                })
                ->select('T_STATUT.designation', DB::raw('COUNT(T_TICKET.id) as count'))
                ->groupBy('T_STATUT.designation')
                ->get();

            // Requête pour les tickets par priorité
            $ticketsByPriorite = DB::table('T_PRIORITE')
                ->leftJoin('T_TICKET', function($join) use ($statut, $priorite, $demandeur, $categorie, $user) {
                    $join->on('T_PRIORITE.id', '=', 'T_TICKET.Id_Priorite');
                    if ($statut) $join->where('T_TICKET.Id_Statut', $statut);
                    if ($priorite) $join->where('T_TICKET.Id_Priorite', $priorite);
                    if ($demandeur) $join->where('T_TICKET.Id_Demandeur', $demandeur);
                    if ($categorie) $join->where('T_TICKET.Id_Categorie', $categorie);
                })
                ->select('T_PRIORITE.designation', DB::raw('COUNT(T_TICKET.id) as count'))
                ->groupBy('T_PRIORITE.designation')
                ->get();

            // Requête pour les tickets par catégorie
            $ticketsByCategorie = DB::table('T_CATEGORIE')
                ->leftJoin('T_TICKET', function($join) use ($statut, $priorite, $demandeur, $categorie, $user) {
                    $join->on('T_CATEGORIE.id', '=', 'T_TICKET.Id_Categorie');
                    if ($statut) $join->where('T_TICKET.Id_Statut', $statut);
                    if ($priorite) $join->where('T_TICKET.Id_Priorite', $priorite);
                    if ($demandeur) $join->where('T_TICKET.Id_Demandeur', $demandeur);
                    if ($categorie) $join->where('T_TICKET.Id_Categorie', $categorie);
                })
                ->select('T_CATEGORIE.designation', DB::raw('COUNT(T_TICKET.id) as count'))
                ->groupBy('T_CATEGORIE.designation')
                ->get();

            $stats = [
                'ticketsByStatut' => $ticketsByStatut,
                'ticketsByPriorite' => $ticketsByPriorite,
                'ticketsByCategorie' => $ticketsByCategorie
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

            $query = Utilisateur::select(
                'T_UTILISATEUR.id as userId',
                'T_UTILISATEUR.Nom as userName',
                DB::raw('COUNT(T_TICKET.id) as totalTickets'),
                DB::raw('SUM(CASE WHEN T_TICKET.Id_Statut = 1 THEN 1 ELSE 0 END) as openTickets'),
                DB::raw('SUM(CASE WHEN T_TICKET.Id_Statut = 2 THEN 1 ELSE 0 END) as inProgressTickets'),
                DB::raw('SUM(CASE WHEN T_TICKET.Id_Statut = 3 THEN 1 ELSE 0 END) as resolvedTickets')
            )
            ->leftJoin('T_TICKET', 'T_UTILISATEUR.id', '=', 'T_TICKET.Id_Utilisat');

            // Restriction pour les directeurs département : ils ne voient que les tickets de leur département
            $user = auth()->user();
            if ($user && method_exists($user, 'isDirecteurDepartement') && $user->isDirecteurDepartement()) {
                $query->whereExists(function($query) use ($user) {
                    $query->select(DB::raw(1))
                        ->from('T_DEMDEUR')
                        ->whereRaw('T_DEMDEUR.id = T_TICKET.Id_Demandeur')
                        ->where('T_DEMDEUR.id_service', $user->id_service);
                });
            }

            $stats = $query->groupBy('T_UTILISATEUR.id', 'T_UTILISATEUR.Nom')
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

    public function total() {
        $total = \App\Models\Ticket::count();
        return response()->json(['total' => $total]);
    }

    public function enCours() {
        $statut = \App\Models\Statut::where('designation', 'En cours')->first();
        $total = 0;
        if ($statut) {
            $total = \App\Models\Ticket::where('Id_Statut', $statut->id)->count();
        }
        return response()->json(['total' => $total]);
    }

    public function enInstance() {
        $statut = \App\Models\Statut::where('designation', 'En instance')->first();
        $total = 0;
        if ($statut) {
            $total = \App\Models\Ticket::where('Id_Statut', $statut->id)->count();
        }
        return response()->json(['total' => $total]);
    }

    public function cloture() {
        $statut = \App\Models\Statut::where('designation', 'Clôturé')->first();
        $total = 0;
        if ($statut) {
            $total = \App\Models\Ticket::where('Id_Statut', $statut->id)->count();
        }
        return response()->json(['total' => $total]);
    }
} 