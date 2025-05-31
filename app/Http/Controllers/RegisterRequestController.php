<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use App\Mail\RegisterRequestNotification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use App\Models\Service;

class RegisterRequestController extends Controller
{
    public function store(Request $request)
    {
        try {
            $request->validate([
                'fullName' => 'required|string|max:255',
                'email' => 'required|email|max:255',
                'level' => 'required|string|in:employe,directeur_departement,directeur_general',
                'service' => 'required_if:level,employe,directeur_departement|nullable|exists:T_SERVICE,id'
            ]);

            // Récupérer l'email de l'administrateur depuis la configuration
            $adminEmail = Config::get('mail.admin_email');
            
            if (!$adminEmail) {
                Log::error('Email administrateur non configuré');
                return response()->json([
                    'message' => 'Configuration email manquante. Veuillez contacter l\'administrateur.'
                ], 500);
            }

            // Récupérer le nom du service si un service est sélectionné
            $serviceName = null;
            if ($request->service) {
                $service = Service::find($request->service);
                $serviceName = $service ? $service->designation : null;
            }

            $requestData = $request->all();
            $requestData['service_name'] = $serviceName;

            Log::info('Tentative d\'envoi d\'email à l\'administrateur', [
                'admin_email' => $adminEmail,
                'request_data' => $requestData
            ]);

            // Envoyer l'email à l'administrateur
            Mail::to($adminEmail)->send(new RegisterRequestNotification($requestData));

            Log::info('Email envoyé avec succès à l\'administrateur', [
                'admin_email' => $adminEmail
            ]);

            return response()->json([
                'message' => 'Votre demande d\'inscription a été envoyée avec succès.'
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Erreur de validation', [
                'errors' => $e->errors()
            ]);
            return response()->json([
                'message' => 'Données invalides',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erreur lors de l\'envoi de la demande d\'inscription', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Une erreur est survenue lors de l\'envoi de la demande.'
            ], 500);
        }
    }
} 