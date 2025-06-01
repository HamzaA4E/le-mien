<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\Statut;
use App\Models\Priorite;
use App\Models\Categorie;
use App\Models\Utilisateur;
use App\Models\Demandeur;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DashboardController extends Controller
{
    public function getStats(Request $request)
    {
        try {
            $user = $request->user();
            $baseTicketQuery = Ticket::query()
                ->where('Id_Statut', '!=', 1);

            // Appliquer les filtres selon le type d'utilisateur
            if ($user->isDemandeur()) {
                // Trouver l'ID du demandeur correspondant à l'utilisateur
                $demandeur = Demandeur::where('designation', $user->designation)->first();
                if ($demandeur) {
                    $baseTicketQuery->where('Id_Demandeur', $demandeur->id);
                } else {
                    // Si aucun demandeur n'est trouvé, retourner des statistiques vides
                    return response()->json([
                        'total' => 0,
                        'ticketsByStatut' => [],
                        'ticketsByPriorite' => [],
                        'ticketsByCategorie' => []
                    ]);
                }
            } elseif ($user->isDirecteurDepartement()) {
                $baseTicketQuery->join('T_DEMDEUR', 'T_TICKET.Id_Demandeur', '=', 'T_DEMDEUR.id')
                    ->where('T_DEMDEUR.id_service', $user->id_service);
            }

            // Statistiques par statut
            $ticketsByStatut = Statut::select('T_STATUT.designation', DB::raw('COUNT(filtered_tickets.id) as count'))
                ->leftJoinSub($baseTicketQuery->select('T_TICKET.id', 'T_TICKET.Id_Statut'), 'filtered_tickets', function($join) {
                    $join->on('T_STATUT.id', '=', 'filtered_tickets.Id_Statut');
                })
                ->groupBy('T_STATUT.designation')
                ->get();

            // Statistiques par priorité
            $ticketsByPriorite = Priorite::select('T_PRIORITE.designation', DB::raw('COUNT(filtered_tickets.id) as count'))
                ->leftJoinSub($baseTicketQuery->select('T_TICKET.id', 'T_TICKET.Id_Priorite'), 'filtered_tickets', function($join) {
                    $join->on('T_PRIORITE.id', '=', 'filtered_tickets.Id_Priorite');
                })
                ->groupBy('T_PRIORITE.designation')
                ->get();

            // Statistiques par catégorie
            $ticketsByCategorie = Categorie::select('T_CATEGORIE.designation', DB::raw('COUNT(filtered_tickets.id) as count'))
                ->leftJoinSub($baseTicketQuery->select('T_TICKET.id', 'T_TICKET.Id_Categorie'), 'filtered_tickets', function($join) {
                    $join->on('T_CATEGORIE.id', '=', 'filtered_tickets.Id_Categorie');
                })
                ->groupBy('T_CATEGORIE.designation')
                ->get();

            // Total des tickets
            $total = $baseTicketQuery->count();

            \Log::info('Statistiques récupérées', [
                'user_id' => $user->id,
                'user_designation' => $user->designation,
                'demandeur_id' => $demandeur->id ?? null,
                'total' => $total
            ]);

            return response()->json([
                'total' => $total,
                'ticketsByStatut' => $ticketsByStatut,
                'ticketsByPriorite' => $ticketsByPriorite,
                'ticketsByCategorie' => $ticketsByCategorie
            ]);
        } catch (\Exception $e) {
            \Log::error('Erreur dans getStats: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json(['error' => 'Erreur lors de la récupération des statistiques: ' . $e->getMessage()], 500);
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