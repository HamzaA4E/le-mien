<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReportController extends Controller
{
    public function generateReport(Request $request)
    {
        $type = $request->input('type');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $serviceId = $request->input('service');
        $statusId = $request->input('status');
        $priorityId = $request->input('priority');
        $demandeurId = $request->input('demandeur');

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
            $executant = \App\Models\Executant::where('designation', $user->designation)->first();
            if ($executant) {
                $query->where('Id_Executant', $executant->id);
            } else {
                $query->whereRaw('1=0');
            }
        }

        // Log du nombre de tickets après filtres d'exécutant
        \Log::info('Nombre de tickets après filtres d\'exécutant', ['count' => $query->count()]);

        // Appliquer les filtres
        if ($startDate) {
            $query->where('created_at', '>=', Carbon::parse($startDate)->startOfDay());
        }
        if ($endDate) {
            $query->where('created_at', '<=', Carbon::parse($endDate)->endOfDay());
        }
        if ($serviceId) {
            $query->where('T_DEMDEUR.id_service', $serviceId);
        }
        if ($statusId) {
            $query->where('id_statut', $statusId);
        }
        if ($priorityId) {
            $query->where('id_priorite', $priorityId);
        }
        if ($demandeurId) {
            $query->where('id_demandeur', $demandeurId);
        }

        // Log du nombre de tickets après tous les filtres
        \Log::info('Nombre de tickets après tous les filtres', ['count' => $query->count()]);

        switch ($type) {
            case 'tickets_by_service':
                return $this->getTicketsByService($query);
            case 'tickets_by_status':
                return $this->getTicketsByStatus($query);
            case 'tickets_by_priority':
                return $this->getTicketsByPriority($query);
            case 'tickets_by_demandeur':
                return $this->getTicketsByDemandeur($query);
            case 'tickets_by_period':
                return $this->getTicketsByPeriod($query);
            case 'tickets_by_type_demande':
                return $this->getTicketsByTypeDemande($query);
            case 'tickets_detailed':
                return $this->getDetailedTickets($query);
            default:
                return response()->json(['error' => 'Type de rapport invalide'], 400);
        }
    }

    private function getTicketsByService($query)
    {
        // Debug : log les tickets, demandeurs et services avant group by
        $debugQuery = clone $query;
        $debugTickets = $debugQuery->select('T_TICKET.id as ticket_id', 'T_TICKET.Titre', 'dem.id as demandeur_id', 'dem.designation as demandeur', 'srv.id as service_id', 'srv.designation as service')
            ->leftJoin('T_DEMDEUR as dem', 'T_TICKET.Id_Demandeur', '=', 'dem.id')
            ->leftJoin('T_SERVICE as srv', 'dem.id_service', '=', 'srv.id')
            ->get();
        \Log::info('DEBUG tickets_by_service', ['tickets' => $debugTickets]);

        // Utiliser le $query d'origine pour le group by (sans join déjà appliqué)
        return $query->select('srv.designation as Service', DB::raw('count(*) as Nombre'))
            ->leftJoin('T_DEMDEUR as dem', 'T_TICKET.Id_Demandeur', '=', 'dem.id')
            ->leftJoin('T_SERVICE as srv', 'dem.id_service', '=', 'srv.id')
            ->groupBy('srv.id', 'srv.designation')
            ->get();
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
            DB::raw('DATE(DateCreation) as Période'),
            DB::raw('count(*) as Nombre')
        )
            ->leftJoin('T_DEMDEUR', 'T_TICKET.Id_Demandeur', '=', 'T_DEMDEUR.id')
            ->groupBy(DB::raw('DATE(DateCreation)'))
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