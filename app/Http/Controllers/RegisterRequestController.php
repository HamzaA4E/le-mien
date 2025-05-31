<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use App\Mail\RegisterRequestNotification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use App\Models\Service;
use App\Models\RegisterRequest;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class RegisterRequestController extends Controller
{
    public function store(Request $request)
    {
        try {
            Log::info('Début du traitement de la demande d\'inscription', [
                'request_data' => $request->all()
            ]);

            $request->validate([
                'fullName' => 'required|string|max:255',
                'email' => 'required|email|max:255',
                'level' => 'required|string|in:employe,directeur_departement,directeur_general',
                'service' => 'required_if:level,employe,directeur_departement|nullable|exists:T_SERVICE,id'
            ]);

            Log::info('Validation réussie, vérification des demandes récentes');

            // Vérifier si une demande similaire a été envoyée dans les 48 dernières heures
            try {
                $recentRequest = DB::table('register_requests')
                    ->where('email', $request->email)
                    ->where('full_name', $request->fullName)
                    ->where('level', $request->level)
                    ->where('service_id', $request->service)
                    ->whereRaw('created_at >= DATEADD(hour, -48, GETDATE())')
                    ->first();

                if ($recentRequest) {
                    Log::warning('Tentative d\'envoi d\'une demande similaire dans les 48 dernières heures', [
                        'email' => $request->email,
                        'fullName' => $request->fullName,
                        'level' => $request->level,
                        'service' => $request->service
                    ]);
                    return response()->json([
                        'message' => 'Une demande similaire a déjà été envoyée dans les dernières 48 heures. Veuillez patienter.'
                    ], 422);
                }
            } catch (\Exception $e) {
                Log::error('Erreur lors de la vérification des demandes récentes', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                throw $e;
            }

            // Récupérer l'email de l'administrateur depuis la configuration
            $adminEmail = Config::get('mail.admin_email', 'admin@example.com');
            
            if (!$adminEmail) {
                Log::error('Email administrateur non configuré');
                return response()->json([
                    'message' => 'Configuration email manquante. Veuillez contacter l\'administrateur.'
                ], 500);
            }

            Log::info('Email administrateur récupéré', ['admin_email' => $adminEmail]);

            // Récupérer le nom du service si un service est sélectionné
            $serviceName = null;
            if ($request->service) {
                try {
                    $service = Service::find($request->service);
                    $serviceName = $service ? $service->designation : null;
                    Log::info('Service trouvé', [
                        'service_id' => $request->service,
                        'service_name' => $serviceName
                    ]);
                } catch (\Exception $e) {
                    Log::error('Erreur lors de la récupération du service', [
                        'error' => $e->getMessage(),
                        'service_id' => $request->service
                    ]);
                    throw $e;
                }
            }

            $requestData = $request->all();
            $requestData['service_name'] = $serviceName;

            Log::info('Création de la demande d\'inscription', [
                'request_data' => $requestData
            ]);

            // Enregistrer la demande dans la base de données
            try {
                $registerRequest = RegisterRequest::create([
                    'full_name' => $request->fullName,
                    'email' => $request->email,
                    'level' => $request->level,
                    'service_id' => in_array($request->level, ['employe', 'directeur_departement']) ? $request->service : null,
                    'status' => 'pending'
                ]);

                Log::info('Demande d\'inscription créée avec succès', [
                    'request_id' => $registerRequest->id
                ]);
            } catch (\Exception $e) {
                Log::error('Erreur lors de la création de la demande d\'inscription', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'request_data' => $requestData
                ]);
                throw $e;
            }

            // Envoyer l'email à l'administrateur
            try {
                Mail::to($adminEmail)->send(new RegisterRequestNotification($requestData));
                Log::info('Email envoyé avec succès à l\'administrateur', [
                    'admin_email' => $adminEmail
                ]);
            } catch (\Exception $e) {
                Log::error('Erreur lors de l\'envoi de l\'email', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'admin_email' => $adminEmail
                ]);
                throw $e;
            }

            return response()->json([
                'message' => 'Votre demande d\'inscription a été envoyée avec succès.'
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Erreur de validation', [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            return response()->json([
                'message' => 'Données invalides',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erreur lors de l\'envoi de la demande d\'inscription', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);
            return response()->json([
                'message' => 'Une erreur est survenue lors de l\'envoi de la demande: ' . $e->getMessage()
            ], 500);
        }
    }
} 