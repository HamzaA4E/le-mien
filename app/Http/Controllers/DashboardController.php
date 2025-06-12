<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\Statut;
use App\Models\Priorite;
use App\Models\Categorie;
use App\Models\Utilisateur;
use App\Models\Demandeur;
use App\Models\Emplacement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    private $cacheDuration = 300; // 5 minutes en secondes

    public function getStats(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                Log::error('Utilisateur non authentifié');
                return response()->json(['error' => 'Non authentifié'], 401);
            }

            $cacheKey = "dashboard_stats_{$user->id}";
            $forceRefresh = $request->query('refresh', false);

            // Si forceRefresh est true, on efface le cache
            if ($forceRefresh) {
                Cache::forget($cacheKey);
                Log::info('Cache effacé pour le rafraîchissement', ['cache_key' => $cacheKey]);
            }

            // Vérifier si les données sont en cache
            if (!$forceRefresh && Cache::has($cacheKey)) {
                return response()->json(Cache::get($cacheKey));
            }

            try {
                // Requête de base optimisée avec les jointures nécessaires
                $baseQuery = DB::table('T_TICKET')
                    ->select([
                        'T_TICKET.id',
                        'T_TICKET.Id_Statut',
                        'T_TICKET.Id_Priorite',
                        'T_TICKET.Id_Categorie',
                        'T_STATUT.designation as statut_designation',
                        'T_PRIORITE.designation as priorite_designation',
                        'T_CATEGORIE.designation as categorie_designation'
                    ])
                    ->join('T_STATUT', 'T_TICKET.Id_Statut', '=', 'T_STATUT.id')
                    ->join('T_PRIORITE', 'T_TICKET.Id_Priorite', '=', 'T_PRIORITE.id')
                    ->join('T_CATEGORIE', 'T_TICKET.Id_Categorie', '=', 'T_CATEGORIE.id')
                    ->where('T_TICKET.Id_Statut', '!=', 1); // Exclure le statut "Nouveau" (ID 1)

                // Appliquer les filtres selon le type d'utilisateur
                if ($user->isDemandeur()) {
                    $demandeur = Demandeur::where('designation', $user->designation)->first();
                    if ($demandeur) {
                        $baseQuery->where('T_TICKET.Id_Demandeur', $demandeur->id);
                    } else {
                        return $this->getEmptyResponse($cacheKey);
                    }
                
                    $baseQuery->join('T_DEMDEUR', 'T_TICKET.Id_Demandeur', '=', 'T_DEMDEUR.id')
                        ->where('T_DEMDEUR.id_service', $user->id_service);
                } elseif ($user->isExecutant()) {
                    // On suppose que la désignation de l'utilisateur == désignation de l'exécutant
                    $executant = \App\Models\Executant::where('designation', $user->designation)->first();
                    if ($executant) {
                        $baseQuery->where('T_TICKET.Id_Executant', $executant->id);
                    } else {
                        // Aucun ticket si pas d'exécutant correspondant
                        $baseQuery->whereRaw('1=0');
                    }
                }

                // Exécuter la requête une seule fois
                $tickets = $baseQuery->get();

                // Calculer les statistiques à partir des résultats
                $stats = [
                    'total' => $tickets->count(),
                    'ticketsByStatut' => $this->groupByDesignation($tickets, 'statut_designation'),
                    'ticketsByPriorite' => $this->groupByDesignation($tickets, 'priorite_designation'),
                    'ticketsByCategorie' => $this->groupByDesignation($tickets, 'categorie_designation'),
                    'par_demandeur' => Demandeur::where('is_active', true)
                        ->when($user && method_exists($user, 'isDirecteurDepartement') && $user->isDirecteurDepartement(), function($query) use ($user) {
                            return $query->where('id_service', $user->id_service);
                        })
                        ->when($user && method_exists($user, 'isExecutant') && $user->isExecutant(), function($query) use ($user) {
                            $executant = \App\Models\Executant::where('designation', $user->designation)->first();
                            if ($executant) {
                                return $query->whereHas('tickets', function($q) use ($executant) {
                                    $q->where('Id_Executant', $executant->id);
                                });
                            }
                            return $query->whereRaw('1=0');
                        })
                        ->get()
                        ->map(function($demandeur) use ($user) {
                            $query = $demandeur->tickets();
                            if ($user && method_exists($user, 'isExecutant') && $user->isExecutant()) {
                                $executant = \App\Models\Executant::where('designation', $user->designation)->first();
                                if ($executant) {
                                    $query->where('Id_Executant', $executant->id);
                                }
                            }
                            return [
                                'demandeur' => $demandeur->designation,
                                'total' => $query->count(),
                                'service_id' => $demandeur->id_service
                            ];
                        }),
                    'par_emplacement' => Emplacement::where('is_active', true)
                        ->get()
                        ->map(function($emplacement) use ($user) {
                            $query = $emplacement->tickets();
                            if ($user && method_exists($user, 'isDirecteurDepartement') && $user->isDirecteurDepartement()) {
                                $query->join('T_DEMDEUR', 'T_TICKET.Id_Demandeur', '=', 'T_DEMDEUR.id')
                                      ->where('T_DEMDEUR.id_service', $user->id_service)
                                      ->select('T_TICKET.*');
                            }
                            return [
                                'emplacement' => $emplacement->designation,
                                'total' => $query->count()
                            ];
                        }),
                ];

                // Trier les statuts par ID
                usort($stats['ticketsByStatut'], function($a, $b) {
                    return $a['id'] - $b['id'];
                });

                // Mettre en cache la réponse
                Cache::put($cacheKey, $stats, $this->cacheDuration);

                return response()->json($stats);
            } catch (\Exception $e) {
                Log::error('Erreur lors de l\'exécution des requêtes', [
                    'message' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'user_id' => $user->id,
                    'sql_state' => $e->getCode(),
                    'error_info' => $e->errorInfo ?? null
                ]);
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('Erreur dans getStats', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $user->id ?? null,
                'sql_state' => $e->getCode(),
                'error_info' => $e->errorInfo ?? null
            ]);
            return response()->json([
                'error' => 'Une erreur est survenue lors de la récupération des statistiques',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function clearCache(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'Non authentifié'], 401);
            }

            $cacheKey = "dashboard_stats_{$user->id}";
            Cache::forget($cacheKey);

            return response()->json([
                'message' => 'Cache effacé avec succès',
                'cache_key' => $cacheKey
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur lors de l\'effacement du cache', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'error' => 'Une erreur est survenue lors de l\'effacement du cache',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    private function getEmptyResponse($cacheKey)
    {
        $emptyResponse = [
            'total' => 0,
            'ticketsByStatut' => [],
            'ticketsByPriorite' => [],
            'ticketsByCategorie' => [],
            'par_demandeur' => [],
            'par_emplacement' => []
        ];
        Cache::put($cacheKey, $emptyResponse, $this->cacheDuration);
        return response()->json($emptyResponse);
    }

    private function groupByDesignation($tickets, $designationField)
    {
        $idFieldMap = [
            'statut_designation' => 'Id_Statut',
            'priorite_designation' => 'Id_Priorite',
            'categorie_designation' => 'Id_Categorie'
        ];

        return $tickets->groupBy($designationField)
            ->map(function ($group) use ($designationField, $idFieldMap) {
                $firstTicket = $group->first();
                $idField = $idFieldMap[$designationField] ?? null;
                return [
                    'id' => $idField ? $firstTicket->$idField : null,
                    'designation' => $firstTicket->$designationField,
                    'count' => $group->count()
                ];
            })
            ->values()
            ->toArray();
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