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
            $request->validate([
                'email' => 'required|email',
                'password' => 'required'
            ]);

            $user = Utilisateur::where('email', $request->email)->first();

            if (!$user) {
                Log::info('Tentative de connexion échouée - Email non trouvé: ' . $request->email);
                return response()->json([
                    'message' => 'Email ou mot de passe incorrect'
                ], 401);
            }

            if (!Hash::check($request->password, $user->password)) {
                Log::info('Tentative de connexion échouée - Mot de passe incorrect pour: ' . $request->email);
                return response()->json([
                    'message' => 'Email ou mot de passe incorrect'
                ], 401);
            }

            if ($user->statut !== 1) {
                Log::info('Tentative de connexion échouée - Compte inactif: ' . $request->email);
                return response()->json([
                    'message' => 'Votre compte est inactif. Veuillez contacter l\'administrateur.'
                ], 403);
            }

            // Vérifier si le mot de passe est "password"
            $isDefaultPassword = Hash::check('password', $user->password);
            Log::info('Connexion réussie pour: ' . $request->email . ' - Mot de passe par défaut: ' . ($isDefaultPassword ? 'Oui' : 'Non'));

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'access_token' => $token,
                'token_type' => 'Bearer',
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'designation' => $user->designation,
                    'niveau' => $user->niveau,
                    'statut' => $user->statut,
                    'is_default_password' => $isDefaultPassword
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la connexion: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Une erreur est survenue lors de la connexion'
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
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Non authentifié'], 401);
            }

            return response()->json([
                'user' => $user
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des données utilisateur: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la récupération des données utilisateur'], 500);
        }
    }

    public function changePassword(Request $request)
    {
        try {
            if (!auth()->check()) {
                return response()->json(['message' => 'Non authentifié'], 401);
            }

            $validated = $request->validate([
                'current_password' => 'required',
                'new_password' => [
                    'required',
                    'min:8',
                    'confirmed',
                    'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/'
                ]
            ], [
                'new_password.regex' => 'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial.'
            ]);

            $user = auth()->user();

            if (!Hash::check($validated['current_password'], $user->password)) {
                return response()->json([
                    'message' => 'Mot de passe actuel incorrect'
                ], 422);
            }

            $user->password = Hash::make($validated['new_password']);
            $user->save();

            return response()->json([
                'message' => 'Mot de passe modifié avec succès'
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erreur changement mot de passe: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Erreur lors du changement de mot de passe',
                'error' => $e->getMessage()
            ], 500);
        }
    }
} 