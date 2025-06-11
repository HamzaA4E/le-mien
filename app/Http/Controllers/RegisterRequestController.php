<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use App\Mail\RegisterRequestNotification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use App\Models\Service;
use App\Models\RegisterRequest;
use App\Models\Utilisateur;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;

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
            $adminEmail = Config::get('mail.admin_email', 'herohamza24@gmail.com');
            
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

    public function index()
    {
        try {
            $requests = RegisterRequest::with('service')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json($requests);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des demandes d\'inscription', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Une erreur est survenue lors de la récupération des demandes'
            ], 500);
        }
    }

    public function approve(Request $request, $id)
    {
        try {
            Log::info('Début de l\'approbation de la demande', [
                'request_id' => $id,
                'request_data' => $request->all()
            ]);

            $request->validate([
                'password' => 'required|string|min:8'
            ]);

            $registerRequest = RegisterRequest::findOrFail($id);
            Log::info('Demande trouvée', [
                'request' => $registerRequest->toArray()
            ]);

            if ($registerRequest->status !== 'pending') {
                Log::warning('Tentative d\'approbation d\'une demande déjà traitée', [
                    'request_id' => $id,
                    'status' => $registerRequest->status
                ]);
                return response()->json([
                    'message' => 'Cette demande a déjà été traitée'
                ], 400);
            }

            // Vérifier si l'utilisateur existe déjà
            $existingUser = Utilisateur::where('email', $registerRequest->email)->first();
            if ($existingUser) {
                Log::warning('Tentative de création d\'un utilisateur avec un email existant', [
                    'email' => $registerRequest->email
                ]);
                return response()->json([
                    'message' => 'Un utilisateur avec cet email existe déjà'
                ], 400);
            }

            // Créer l'utilisateur avec le mot de passe fourni
            try {
                $user = new Utilisateur();
                $user->designation = $registerRequest->full_name;
                $user->email = $registerRequest->email;
                $user->password = Hash::make($request->password);
                $user->niveau = $this->getNiveauFromLevel($registerRequest->level);
                $user->id_service = $registerRequest->service_id;
                $user->save();

                Log::info('Utilisateur créé avec succès', [
                    'user_id' => $user->id,
                    'email' => $user->email
                ]);
            } catch (\Exception $e) {
                Log::error('Erreur lors de la création de l\'utilisateur', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'user_data' => [
                        'designation' => $registerRequest->full_name,
                        'email' => $registerRequest->email,
                        'niveau' => $this->getNiveauFromLevel($registerRequest->level),
                        'service_id' => $registerRequest->service_id
                    ]
                ]);
                throw $e;
            }

            // Mettre à jour le statut de la demande
            try {
                DB::update(
                    "UPDATE register_requests SET status = ?, updated_at = GETDATE() WHERE id = ?",
                    ['approved', $registerRequest->id]
                );
                Log::info('Statut de la demande mis à jour', [
                    'request_id' => $registerRequest->id,
                    'new_status' => 'approved'
                ]);
            } catch (\Exception $e) {
                Log::error('Erreur lors de la mise à jour du statut de la demande', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'request_id' => $registerRequest->id
                ]);
                throw $e;
            }

            // Envoyer un email à l'utilisateur avec ses identifiants
            try {
                Mail::to($registerRequest->email)->send(new \App\Mail\RegistrationApproved($registerRequest->full_name, $registerRequest->email, $request->password));
                Log::info('Email envoyé avec succès', [
                    'email' => $registerRequest->email
                ]);
            } catch (\Exception $e) {
                Log::error('Erreur lors de l\'envoi de l\'email', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'email' => $registerRequest->email
                ]);
                // Ne pas échouer si l'email ne peut pas être envoyé
            }

            return response()->json([
                'message' => 'Demande approuvée avec succès'
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
            Log::error('Erreur lors de l\'approbation de la demande', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_id' => $id,
                'request_data' => $request->all()
            ]);
            return response()->json([
                'message' => 'Une erreur est survenue lors de l\'approbation de la demande: ' . $e->getMessage()
            ], 500);
        }
    }

    public function reject($id)
    {
        try {
            Log::info('Début du rejet de la demande', ['request_id' => $id]);

            $registerRequest = RegisterRequest::findOrFail($id);
            Log::info('Demande trouvée', ['request' => $registerRequest->toArray()]);

            if ($registerRequest->status !== 'pending') {
                Log::warning('Tentative de rejet d\'une demande déjà traitée', [
                    'request_id' => $id,
                    'status' => $registerRequest->status
                ]);
                return response()->json([
                    'message' => 'Cette demande a déjà été traitée'
                ], 400);
            }

            // Mettre à jour le statut de la demande avec GETDATE()
            try {
                DB::update(
                    "UPDATE register_requests SET status = 'rejected', updated_at = GETDATE() WHERE id = ?",
                    [$id]
                );
                Log::info('Statut de la demande mis à jour avec succès', ['request_id' => $id]);
            } catch (\Exception $e) {
                Log::error('Erreur lors de la mise à jour du statut de la demande', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'request_id' => $id
                ]);
                throw $e;
            }

            return response()->json([
                'message' => 'La demande a été rejetée avec succès'
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur lors du rejet de la demande', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_id' => $id
            ]);
            return response()->json([
                'message' => 'Une erreur est survenue lors du rejet de la demande'
            ], 500);
        }
    }

    public function count()
    {
        try {
            $count = RegisterRequest::where('status', 'pending')->count();
            return response()->json(['count' => $count]);
        } catch (\Exception $e) {
            Log::error('Erreur lors du comptage des demandes en attente', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Une erreur est survenue lors du comptage des demandes'
            ], 500);
        }
    }

    private function getNiveauFromLevel($level)
    {
        switch ($level) {
            case 'employe':
                return 4;
            case 'directeur_departement':
                return 3;
            case 'directeur_general':
                return 2;
            default:
                return 4;
        }
    }
} 