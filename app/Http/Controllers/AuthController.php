<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Utilisateur;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        try {
            $credentials = $request->validate([
                'email' => 'required|email|max:255',
                'password' => 'required|min:6'
            ]);

            $user = Utilisateur::where('email', $credentials['email'])->first();

            if (!$user || !Hash::check($credentials['password'], $user->password)) {
                throw ValidationException::withMessages([
                    'email' => ['Ces identifiants ne correspondent pas à nos enregistrements.'],
                ]);
            }

            if ($user->statut !== 1) {
                throw ValidationException::withMessages([
                    'email' => ['Ce compte est désactivé. Veuillez contacter l\'administrateur.'],
                ]);
            }

            // Supprimer les anciens tokens de manière asynchrone
            PersonalAccessToken::where('tokenable_id', $user->id)
                             ->where('tokenable_type', Utilisateur::class)
                             ->delete();

            // Créer un nouveau token
            $token = $user->createToken('auth-token');

            return response()->json([
                'token' => $token->plainTextToken,
                'user' => [
                    'id' => $user->id,
                    'designation' => $user->designation,
                    'email' => $user->email,
                    'niveau' => $user->niveau,
                    'statut' => $user->statut
                ]
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Identifiants invalides',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erreur de connexion: ' . $e->getMessage());
            return response()->json([
                'message' => 'Une erreur est survenue lors de la connexion.'
            ], 500);
        }
    }

    public function logout(Request $request)
    {
        try {
            if (!$request->user()) {
                return response()->json(['message' => 'Non authentifié'], 401);
            }

            $request->user()->currentAccessToken()->delete();
            return response()->json(['message' => 'Déconnexion réussie']);
        } catch (\Exception $e) {
            Log::error('Erreur de déconnexion: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la déconnexion'], 500);
        }
    }

    public function user(Request $request)
    {
        try {
            if (!$request->user()) {
                return response()->json(['message' => 'Non authentifié'], 401);
            }

            $user = $request->user()->load('service');
            return response()->json([
                'id' => $user->id,
                'designation' => $user->designation,
                'email' => $user->email,
                'niveau' => $user->niveau,
                'statut' => $user->statut,
                'service' => $user->service
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur récupération utilisateur: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la récupération des données utilisateur'], 500);
        }
    }
} 