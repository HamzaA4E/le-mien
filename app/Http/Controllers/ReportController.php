<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Support\Facades\Schema;

class ReportController extends Controller
{
    public function generateReport(Request $request)
    {
        try {
            $type = $request->input('type');
            $startDate = $request->input('start_date');
            $endDate = $request->input('end_date');
            $serviceId = $request->input('service');
            $statusId = $request->input('status');
            $priorityId = $request->input('priority');
            $demandeurId = $request->input('demandeur');

            \Log::info('Début de la génération du rapport', [
                'type' => $type,
                'startDate' => $startDate,
                'endDate' => $endDate,
                'serviceId' => $serviceId,
                'statusId' => $statusId,
                'priorityId' => $priorityId,
                'demandeurId' => $demandeurId
            ]);

            $query = Ticket::query();

            // Log du nombre de tickets avant filtres
            \Log::info('Nombre de tickets avant filtres', ['count' => $query->count()]);

            // Exclure les tickets "Nouveau" (Id_Statut = 1) et "Refusé" (designation = 'Refusé')
            $query->where('T_TICKET.Id_Statut', '!=', 1)
                  ->whereHas('statut', function($q) {
                      $q->where('designation', '!=', 'Refusé');
                  });

            // Log du nombre de tickets après filtres d'exclusion
            \Log::info('Nombre de tickets après filtres d\'exclusion', ['count' => $query->count()]);

            // Restriction pour l'exécutant : ne voir que ses tickets
            $user = $request->user();
            if ($user && method_exists($user, 'isExecutant') && $user->isExecutant()) {
                $query->where('Id_Executant', $user->id);
                \Log::info('Filtrage des tickets pour l\'exécutant', [
                    'userId' => $user->id,
                    'ticketsCount' => $query->count()
                ]);
            }

            // Log du nombre de tickets après filtres d'exécutant
            \Log::info('Nombre de tickets après filtres d\'exécutant', ['count' => $query->count()]);

            // Appliquer les filtres
            if ($startDate) {
                $query->where('T_TICKET.DateCreation', '>=', Carbon::parse($startDate)->startOfDay());
            }
            if ($endDate) {
                $query->where('T_TICKET.DateCreation', '<=', Carbon::parse($endDate)->endOfDay());
            }
            if ($serviceId) {
                $query->where('T_DEMDEUR.id_service', $serviceId);
            }
            if ($statusId) {
                $query->where('T_TICKET.id_statut', $statusId);
            }
            if ($priorityId) {
                $query->where('T_TICKET.id_priorite', $priorityId);
            }
            if ($demandeurId) {
                $query->where('T_TICKET.id_demandeur', $demandeurId);
            }

            // Log du nombre de tickets après tous les filtres
            \Log::info('Nombre de tickets après tous les filtres', ['count' => $query->count()]);

            $result = null;
            switch ($type) {
                case 'tickets_by_service':
                    $result = $this->getTicketsByService($query);
                    break;
                case 'tickets_by_status':
                    $result = $this->getTicketsByStatus($query);
                    break;
                case 'tickets_by_priority':
                    $result = $this->getTicketsByPriority($query);
                    break;
                case 'tickets_by_demandeur':
                    $result = $this->getTicketsByDemandeur($query);
                    break;
                case 'tickets_by_period':
                    $result = $this->getTicketsByPeriod($query);
                    break;
                case 'tickets_by_type_demande':
                    $result = $this->getTicketsByTypeDemande($query);
                    break;
                case 'tickets_detailed':
                    $result = $this->getDetailedTickets($query);
                    break;
                default:
                    throw new \Exception('Type de rapport invalide');
            }

            \Log::info('Rapport généré avec succès', ['type' => $type, 'result_count' => count($result)]);
            return response()->json($result);
        } catch (\Exception $e) {
            \Log::error('Erreur lors de la génération du rapport', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Erreur lors de la génération du rapport',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    private function getTicketsByService($query)
    {
        try {
            // Debug : log les tickets, demandeurs et services avant group by
            $debugQuery = clone $query;
            $debugTickets = $debugQuery->select('T_TICKET.id as ticket_id', 'T_TICKET.Titre', 'dem.id as demandeur_id', 'dem.designation as demandeur', 'srv.id as service_id', 'srv.designation as service')
                ->leftJoin('T_DEMDEUR as dem', 'T_TICKET.Id_Demandeur', '=', 'dem.id')
                ->leftJoin('T_SERVICE as srv', 'dem.id_service', '=', 'srv.id')
                ->get();
            \Log::info('DEBUG tickets_by_service', ['tickets' => $debugTickets]);

            // Vérifier si les tables existent
            if (!Schema::hasTable('T_DEMDEUR') || !Schema::hasTable('T_SERVICE')) {
                \Log::error('Tables manquantes', [
                    'T_DEMDEUR_exists' => Schema::hasTable('T_DEMDEUR'),
                    'T_SERVICE_exists' => Schema::hasTable('T_SERVICE')
                ]);
                throw new \Exception('Tables requises manquantes');
            }

            // Utiliser le $query d'origine pour le group by (sans join déjà appliqué)
            $result = $query->select('srv.designation as Service', DB::raw('count(*) as Nombre'))
                ->leftJoin('T_DEMDEUR as dem', 'T_TICKET.Id_Demandeur', '=', 'dem.id')
                ->leftJoin('T_SERVICE as srv', 'dem.id_service', '=', 'srv.id')
                ->groupBy('srv.id', 'srv.designation')
                ->get();

            \Log::info('Résultat de la requête tickets_by_service', ['result' => $result]);
            return $result;
        } catch (\Exception $e) {
            \Log::error('Erreur dans getTicketsByService', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    private function getTicketsByStatus($query)
    {
        return $query->select('T_STATUT.designation as Statut', DB::raw('count(*) as Nombre'))
            ->leftJoin('T_DEMDEUR', 'T_TICKET.Id_Demandeur', '=', 'T_DEMDEUR.id')
            ->leftJoin('T_STATUT', 'T_TICKET.Id_Statut', '=', 'T_STATUT.id')
            ->groupBy('T_STATUT.id', 'T_STATUT.designation')
            ->get();
    }

    private function getTicketsByPriority($query)
    {
        return $query->select('T_PRIORITE.designation as Priorité', DB::raw('count(*) as Nombre'))
            ->leftJoin('T_DEMDEUR', 'T_TICKET.Id_Demandeur', '=', 'T_DEMDEUR.id')
            ->leftJoin('T_PRIORITE', 'T_TICKET.Id_Priorite', '=', 'T_PRIORITE.id')
            ->groupBy('T_PRIORITE.id', 'T_PRIORITE.designation')
            ->get();
    }

    private function getTicketsByDemandeur($query)
    {
        // On utilise directement la requête déjà filtrée par l'exécutant si nécessaire
        return $query->select('T_DEMDEUR.designation as Demandeur', DB::raw('count(*) as Nombre'))
            ->leftJoin('T_DEMDEUR', 'T_TICKET.Id_Demandeur', '=', 'T_DEMDEUR.id')
            ->groupBy('T_DEMDEUR.id', 'T_DEMDEUR.designation')
            ->get();
    }

    private function getTicketsByPeriod($query)
    {
        return $query->select(
            DB::raw('CONVERT(varchar, DateCreation, 103) as Période'),
            DB::raw('count(*) as Nombre')
        )
            ->leftJoin('T_DEMDEUR', 'T_TICKET.Id_Demandeur', '=', 'T_DEMDEUR.id')
            ->groupBy(DB::raw('CONVERT(varchar, DateCreation, 103)'))
            ->orderBy('Période')
            ->get();
    }

    private function getTicketsByTypeDemande($query)
    {
        return $query->select('T_CATEGORIE.designation as Catégorie', DB::raw('count(*) as Nombre'))
            ->leftJoin('T_CATEGORIE', 'T_TICKET.Id_Categorie', '=', 'T_CATEGORIE.id')
            ->groupBy('T_CATEGORIE.id', 'T_CATEGORIE.designation')
            ->get();
    }

    private function getDetailedTickets($query)
    {
        return $query->select([
            'T_TICKET.id',
            'T_TICKET.Titre as sujet',
            'T_TICKET.Description as description',
            'T_SERVICE.designation as Service',
            'T_STATUT.designation as Statut',
            'T_PRIORITE.designation as Priorité',
            'T_CATEGORIE.designation as Catégorie',
            'T_DEMDEUR.designation as Demandeur',
            'T_EXECUTANT.designation as Exécutant',
            'T_TICKET.DateCreation as "Date de création"',
            'T_TICKET.DateFinReelle as "Dernière mise à jour"'
        ])
            ->leftJoin('T_DEMDEUR', 'T_TICKET.Id_Demandeur', '=', 'T_DEMDEUR.id')
            ->leftJoin('T_SERVICE', 'T_DEMDEUR.id_service', '=', 'T_SERVICE.id')
            ->leftJoin('T_STATUT', 'T_TICKET.Id_Statut', '=', 'T_STATUT.id')
            ->leftJoin('T_PRIORITE', 'T_TICKET.Id_Priorite', '=', 'T_PRIORITE.id')
            ->leftJoin('T_CATEGORIE', 'T_TICKET.Id_Categorie', '=', 'T_CATEGORIE.id')
            ->leftJoin('T_EXECUTANT', 'T_TICKET.Id_Executant', '=', 'T_EXECUTANT.id')
            ->get();
    }
} 