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

            if (!$user) {
                throw ValidationException::withMessages([
                    'email' => ['Ces identifiants ne correspondent pas à nos enregistrements.'],
                ]);
            }

            if (!Hash::check($credentials['password'], $user->password)) {
                throw ValidationException::withMessages([
                    'password' => ['Le mot de passe est incorrect.'],
                ]);
            }

            if ($user->statut !== 1) {
                throw ValidationException::withMessages([
                    'email' => ['Ce compte est désactivé. Veuillez contacter l\'administrateur.'],
                ]);
            }

            Log::info('User found:', [
                'id' => $user->id,
                'email' => $user->email,
                'statut' => $user->statut
            ]);

            // Supprimer les anciens tokens
            PersonalAccessToken::where('tokenable_id', $user->id)
                             ->where('tokenable_type', Utilisateur::class)
                             ->delete();

            // Créer un nouveau token
            $token = $user->createToken('auth-token');
            
            Log::info('Token created:', [
                'token_id' => $token->accessToken->id,
                'tokenable_id' => $token->accessToken->tokenable_id,
                'tokenable_type' => $token->accessToken->tokenable_type
            ]);

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
            Log::warning('Tentative de connexion invalide:', [
                'email' => $request->email,
                'errors' => $e->errors()
            ]);
            return response()->json([
                'message' => 'Identifiants invalides',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erreur de connexion: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'message' => 'Une erreur est survenue lors de la connexion.',
                'error' => $e->getMessage()
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

            $user = $request->user();
            return response()->json([
                'id' => $user->id,
                'designation' => $user->designation,
                'email' => $user->email,
                'niveau' => $user->niveau,
                'statut' => $user->statut
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur récupération utilisateur: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la récupération des données utilisateur'], 500);
        }
    }
} 