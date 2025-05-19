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

            if (!$user || $user->niveau !== 2) {
                Log::error('Unauthorized report creation attempt - User level check failed', [
                    'userId' => $userId,
                    'userLevel' => $user ? $user->niveau : 'not found'
                ]);
                return response()->json([
                    'message' => 'Seuls les responsables peuvent créer un report',
                    'error' => 'Unauthorized'
                ], 403);
            }

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
                
                // Envoyer l'e-mail à l'exécutant
                try {
                    $executant = $ticket->executant;
                    $responsable = \App\Models\Utilisateur::find($userId);

                    // Temporarily send to a specific email for testing if executant email is missing
                    $recipientEmail = $executant && $executant->email ? $executant->email : 'herohamza24@gmail.com';

                    if ($recipientEmail) {
                        \Illuminate\Support\Facades\Mail::to($recipientEmail)->send(new \App\Mail\ReportCreatedNotification($ticket, $responsable, $validated['raison']));
                        Log::info('Report notification email sent', ['ticketId' => $ticket->id, 'recipientEmail' => $recipientEmail]);
                    } else {
                        Log::warning('Executant not found and no fallback email provided for report notification', ['ticketId' => $ticket->id]);
                    }
                } catch (\Exception $mailException) {
                    Log::error('Error sending report notification email', [
                        'error' => $mailException->getMessage(),
                        'ticketId' => $ticket->id,
                        'trace' => $mailException->getTraceAsString()
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
} 