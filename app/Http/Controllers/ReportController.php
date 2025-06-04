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
        $societeId = $request->input('societe');

        $query = Ticket::query();

        // Appliquer les filtres
        if ($startDate) {
            $query->where('created_at', '>=', Carbon::parse($startDate)->startOfDay());
        }
        if ($endDate) {
            $query->where('created_at', '<=', Carbon::parse($endDate)->endOfDay());
        }
        if ($serviceId) {
            $query->where('service_id', $serviceId);
        }
        if ($statusId) {
            $query->where('statut_id', $statusId);
        }
        if ($priorityId) {
            $query->where('priorite_id', $priorityId);
        }
        if ($societeId) {
            $query->where('societe_id', $societeId);
        }

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
        return $query->select('T_SERVICE.designation as Service', DB::raw('count(*) as Nombre'))
            ->join('T_DEMDEUR', 'T_TICKET.Id_Demandeur', '=', 'T_DEMDEUR.id')
            ->join('T_SERVICE', 'T_DEMDEUR.id_service', '=', 'T_SERVICE.id')
            ->groupBy('T_SERVICE.id', 'T_SERVICE.designation')
            ->get();
    }

    private function getTicketsByStatus($query)
    {
        return $query->select('T_STATUT.designation as Statut', DB::raw('count(*) as Nombre'))
            ->join('T_STATUT', 'T_TICKET.Id_Statut', '=', 'T_STATUT.id')
            ->groupBy('T_STATUT.id', 'T_STATUT.designation')
            ->get();
    }

    private function getTicketsByPriority($query)
    {
        return $query->select('T_PRIORITE.designation as Priorité', DB::raw('count(*) as Nombre'))
            ->join('T_PRIORITE', 'T_TICKET.Id_Priorite', '=', 'T_PRIORITE.id')
            ->groupBy('T_PRIORITE.id', 'T_PRIORITE.designation')
            ->get();
    }

    private function getTicketsByDemandeur($query)
    {
        return $query->select('T_DEMDEUR.designation as Demandeur', DB::raw('count(*) as Nombre'))
            ->join('T_DEMDEUR', 'T_TICKET.Id_Demandeur', '=', 'T_DEMDEUR.id')
            ->groupBy('T_DEMDEUR.id', 'T_DEMDEUR.designation')
            ->get();
    }

    private function getTicketsByPeriod($query)
    {
        return $query->select(
            DB::raw('DATE(DateCreation) as Période'),
            DB::raw('count(*) as Nombre')
        )
            ->groupBy(DB::raw('DATE(DateCreation)'))
            ->orderBy('Période')
            ->get();
    }

    private function getTicketsByTypeDemande($query)
    {
        return $query->select('T_CATEGORIE.designation as "Type de demande"', DB::raw('count(*) as Nombre'))
            ->join('T_CATEGORIE', 'T_TICKET.Id_Categorie', '=', 'T_CATEGORIE.id')
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
            'T_DEMDEUR.designation as Demandeur',
            'T_TICKET.DateCreation as "Date de création"',
            'T_TICKET.DateFinReelle as "Dernière mise à jour"'
        ])
            ->join('T_SERVICE', 'T_TICKET.Id_Service', '=', 'T_SERVICE.id')
            ->join('T_STATUT', 'T_TICKET.Id_Statut', '=', 'T_STATUT.id')
            ->join('T_PRIORITE', 'T_TICKET.Id_Priorite', '=', 'T_PRIORITE.id')
            ->join('T_DEMDEUR', 'T_TICKET.Id_Demandeur', '=', 'T_DEMDEUR.id')
            ->get();
    }
} 