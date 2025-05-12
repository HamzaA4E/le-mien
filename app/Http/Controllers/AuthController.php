<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Utilisateur;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        try {
            $credentials = $request->validate([
                'email' => ['required', 'email'],
                'password' => ['required'],
            ]);

            // Vérifier si l'utilisateur existe
            $user = Utilisateur::where('email', $credentials['email'])->first();
            
            if (!$user) {
                return response()->json([
                    'message' => 'Aucun compte trouvé avec cet email.'
                ], 422);
            }

            // Vérifier le mot de passe
            if (!password_verify($credentials['password'], $user->password)) {
                return response()->json([
                    'message' => 'Le mot de passe est incorrect.'
                ], 422);
            }

            // Créer le token
            $token = $user->createToken('auth-token')->plainTextToken;

            return response()->json([
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'designation' => $user->designation,
                    'email' => $user->email,
                    'niveau' => $user->niveau,
                    'statut' => $user->statut
                ],
                'message' => 'Connexion réussie'
            ]);

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
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Déconnexion réussie']);
    }

    public function user(Request $request)
    {
        $user = $request->user();
        return response()->json([
            'id' => $user->id,
            'designation' => $user->designation,
            'email' => $user->email,
            'niveau' => $user->niveau,
            'statut' => $user->statut
        ]);
    }
} 