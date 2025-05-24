<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\TicketReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class TicketReportController extends Controller
{
    public function store(Request $request, Ticket $ticket)
    {
        try {
            Log::info('Attempting to create ticket report', [
                'ticketId' => $ticket->id,
                'requestData' => $request->all()
            ]);

            // Vérifier si l'utilisateur a le rôle responsable (basé sur le niveau)
            $userId = Auth::id();
            Log::info('Authenticated user ID:', ['userId' => $userId]);
            $user = \App\Models\Utilisateur::find($userId);
            
            if (!$user) {
                Log::error('User object is null after finding by ID', ['userId' => $userId]);
            } else {
                Log::info('User object found:', ['user' => $user->toArray()]);
                Log::info('User level from backend:', ['userLevel' => $user->niveau]);
            }

            // if (!$user || $user->niveau !== 2) {
            //     Log::error('Unauthorized report creation attempt - User level check failed', [
            //         'userId' => $userId,
            //         'userLevel' => $user ? $user->niveau : 'not found'
            //     ]);
            //     return response()->json([
            //         'message' => 'Seuls les responsables peuvent créer un report',
            //         'error' => 'Unauthorized'
            //     ], 403);
            // }

            // Validation des données
            $validated = $request->validate([
                'raison' => 'required|string'
            ]);

            try {
                DB::beginTransaction();
                
                $report = DB::insert('INSERT INTO T_TICKET_REPORT (Id_Ticket, Id_Responsable, Raison, DateReport, created_at, updated_at) VALUES (?, ?, ?, GETDATE(), GETDATE(), GETDATE())', [
                    $ticket->id,
                    $userId,
                    $validated['raison']
                ]);

                DB::commit();
                
                // Envoyer l'e-mail au créateur du ticket
                try {
                    
                    $creator = $ticket->utilisateur;
                    $responsable = \App\Models\Utilisateur::find($userId);

                    Log::info('Email notification details:', [
                        'ticketId' => $ticket->id,
                        'creatorEmail' => $creator ? $creator->email : 'Not found',
                        'creatorName' => $creator ? $creator->designation : 'Not found',
                        'responsableEmail' => $responsable ? $responsable->email : 'Not found',
                        'responsableName' => $responsable ? $responsable->designation : 'Not found',
                        'message' => $validated['raison']
                    ]);

                    if ($creator && $creator->email) {
                        \Illuminate\Support\Facades\Mail::to($creator->email)
                            ->send(new \App\Mail\ReportCreatedNotification($ticket, $responsable, $validated['raison']));
                            
                        Log::info('Email sent successfully to ticket creator', [
                            'creatorEmail' => $creator->email,
                            'ticketId' => $ticket->id
                        ]);
                    } else {
                        Log::warning('Cannot send email: Creator not found or has no email', [
                            'ticketId' => $ticket->id,
                            'creatorExists' => $creator ? 'yes' : 'no',
                            'hasEmail' => $creator && $creator->email ? 'yes' : 'no'
                        ]);
                    }
                } catch (\Exception $mailException) {
                    Log::error('Failed to send email', [
                        'error' => $mailException->getMessage(),
                        'ticketId' => $ticket->id,
                        'creatorEmail' => $creator ? $creator->email : 'not found'
                    ]);
                }

                return response()->json([
                    'message' => 'Report créé avec succès',
                    'report' => $report
                ], 201);

            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('Error in TicketReport::create', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                throw $e;
            }

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation error in ticket report', [
                'errors' => $e->errors(),
                'ticketId' => $ticket->id
            ]);
            return response()->json([
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error creating ticket report', [
                'error' => $e->getMessage(),
                'ticketId' => $ticket->id,
                'trace' => $e->getTraceAsString(),
                'line' => $e->getLine(),
                'file' => $e->getFile()
            ]);
            return response()->json([
                'message' => 'Erreur lors de la création du report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function index(Ticket $ticket)
    {
        try {
            $reports = $ticket->reports()
                ->with('responsable:id,designation')
                ->orderBy('DateReport', 'desc')
                ->get();

            return response()->json($reports);
        } catch (\Exception $e) {
            Log::error('Error fetching ticket reports', [
                'error' => $e->getMessage(),
                'ticketId' => $ticket->id,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Erreur lors de la récupération des reports',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function markAsViewed(Ticket $ticket)
    {
        try {
            $userId = Auth::id();
            
            // Vérifier si l'utilisateur est le créateur du ticket
            if ($ticket->Id_Demandeur !== $userId) {
                return response()->json([
                    'message' => 'Seul le créateur du ticket peut marquer les rapports comme vus'
                ], 403);
            }

            // Mettre à jour uniquement les rapports non vus
            $updated = DB::table('T_TICKET_REPORT')
                ->where('Id_Ticket', $ticket->id)
                ->where('is_viewed', false)
                ->update([
                    'is_viewed' => true,
                    'updated_at' => DB::raw('GETDATE()')
                ]);

            return response()->json([
                'message' => 'Rapports marqués comme vus avec succès',
                'updated_count' => $updated
            ]);
        } catch (\Exception $e) {
            Log::error('Error marking reports as viewed', [
                'error' => $e->getMessage(),
                'ticketId' => $ticket->id,
                'userId' => Auth::id()
            ]);
            return response()->json([
                'message' => 'Erreur lors du marquage des rapports comme vus',
                'error' => $e->getMessage()
            ], 500);
        }
    }
} 