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

            // Récupération des filtres
            $statut = $request->query('statut');
            $priorite = $request->query('priorite');
            $demandeur = $request->query('demandeur');
            $societe = $request->query('societe');
            $categorie = $request->query('categorie');

            // Construction de la requête filtrée
            $ticketQuery = Ticket::query();

            // Restriction pour les directeurs département : ils ne voient que les tickets de leur département
            $user = auth()->user();
            if ($user && method_exists($user, 'isDirecteurDepartement') && $user->isDirecteurDepartement()) {
                $ticketQuery->whereHas('demandeur', function($q) use ($user) {
                    $q->where('id_service', $user->id_service);
                });
            }

            if ($statut) $ticketQuery->where('Id_Statut', $statut);
            if ($priorite) $ticketQuery->where('Id_Priorite', $priorite);
            if ($demandeur) $ticketQuery->where('Id_Demandeur', $demandeur);
            if ($societe) $ticketQuery->where('Id_Societe', $societe);
            if ($categorie) $ticketQuery->where('Id_Categorie', $categorie);

            // Total des tickets filtrés
            $total = (clone $ticketQuery)->count();

            // Tickets par statut
            $en_cours = (clone $ticketQuery)->whereHas('statut', function($query) {
                $query->where('designation', 'En cours');
            })->count();
            $en_instance = (clone $ticketQuery)->whereHas('statut', function($query) {
                $query->where('designation', 'En instance');
            })->count();
            $cloture = (clone $ticketQuery)->whereHas('statut', function($query) {
                $query->where('designation', 'Clôturé');
            })->count();

            // Statistiques des tickets par priorité
            $par_priorite = Priorite::select('T_PRIORITE.designation as priorite', DB::raw('count(T_TICKET.id) as total'))
                ->leftJoin('T_TICKET', function($join) use ($statut, $priorite, $demandeur, $societe, $categorie, $user) {
                    $join->on('T_PRIORITE.id', '=', 'T_TICKET.id_priorite');
                    if ($statut) $join->where('T_TICKET.Id_Statut', $statut);
                    if ($priorite) $join->where('T_TICKET.Id_Priorite', $priorite);
                    if ($demandeur) $join->where('T_TICKET.Id_Demandeur', $demandeur);
                    if ($societe) $join->where('T_TICKET.Id_Societe', $societe);
                    if ($categorie) $join->where('T_TICKET.Id_Categorie', $categorie);
                    if ($user && method_exists($user, 'isDirecteurDepartement') && $user->isDirecteurDepartement()) {
                        $join->whereExists(function($query) use ($user) {
                            $query->select(DB::raw(1))
                                ->from('T_DEMDEUR')
                                ->whereRaw('T_DEMDEUR.id = T_TICKET.Id_Demandeur')
                                ->where('T_DEMDEUR.id_service', $user->id_service);
                        });
                    }
                })
                ->groupBy('T_PRIORITE.id', 'T_PRIORITE.designation')
                ->orderBy('T_PRIORITE.id')
                ->get();

            // Statistiques des tickets par catégorie
            $par_categorie = Categorie::select('T_CATEGORIE.designation as categorie', DB::raw('count(T_TICKET.id) as total'))
                ->leftJoin('T_TICKET', function($join) use ($statut, $priorite, $demandeur, $societe, $categorie, $user) {
                    $join->on('T_CATEGORIE.id', '=', 'T_TICKET.id_categorie');
                    if ($statut) $join->where('T_TICKET.Id_Statut', $statut);
                    if ($priorite) $join->where('T_TICKET.Id_Priorite', $priorite);
                    if ($demandeur) $join->where('T_TICKET.Id_Demandeur', $demandeur);
                    if ($societe) $join->where('T_TICKET.Id_Societe', $societe);
                    if ($categorie) $join->where('T_TICKET.Id_Categorie', $categorie);
                    if ($user && method_exists($user, 'isDirecteurDepartement') && $user->isDirecteurDepartement()) {
                        $join->whereExists(function($query) use ($user) {
                            $query->select(DB::raw(1))
                                ->from('T_DEMDEUR')
                                ->whereRaw('T_DEMDEUR.id = T_TICKET.Id_Demandeur')
                                ->where('T_DEMDEUR.id_service', $user->id_service);
                        });
                    }
                })
                ->groupBy('T_CATEGORIE.id', 'T_CATEGORIE.designation')
                ->orderBy('T_CATEGORIE.id')
                ->get();

            // Statistiques des tickets par demandeur
            $par_demandeur = \App\Models\Demandeur::select('T_DEMDEUR.designation as demandeur', DB::raw('count(T_TICKET.id) as total'))
                ->leftJoin('T_TICKET', function($join) use ($statut, $priorite, $demandeur, $societe, $categorie, $user) {
                    $join->on('T_DEMDEUR.id', '=', 'T_TICKET.id_demandeur');
                    if ($statut) $join->where('T_TICKET.Id_Statut', $statut);
                    if ($priorite) $join->where('T_TICKET.Id_Priorite', $priorite);
                    if ($demandeur) $join->where('T_TICKET.Id_Demandeur', $demandeur);
                    if ($societe) $join->where('T_TICKET.Id_Societe', $societe);
                    if ($categorie) $join->where('T_TICKET.Id_Categorie', $categorie);
                    if ($user && method_exists($user, 'isDirecteurDepartement') && $user->isDirecteurDepartement()) {
                        $join->where('T_DEMDEUR.id_service', $user->id_service);
                    }
                })
                ->groupBy('T_DEMDEUR.id', 'T_DEMDEUR.designation')
                ->orderBy('T_DEMDEUR.designation')
                ->get();

            $stats = [
                'total' => $total,
                'en_cours' => $en_cours,
                'en_instance' => $en_instance,
                'cloture' => $cloture,
                'par_priorite' => $par_priorite,
                'par_categorie' => $par_categorie,
                'par_demandeur' => $par_demandeur,
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