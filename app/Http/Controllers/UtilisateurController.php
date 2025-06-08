<?php

namespace App\Http\Controllers;

use App\Models\Utilisateur;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log;

class UtilisateurController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $users = Utilisateur::with('service')->get();
        return response()->json($users);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'designation' => 'required|string|max:255',
                'email' => 'required|email|unique:T_UTILISAT',
                'password' => 'required|min:6',
                'niveau' => 'required|in:1,2,3,4,5',
                'statut' => 'required|in:0,1',
                'id_service' => 'required_if:niveau,3,4|nullable|exists:T_SERVICE,id'
            ]);

            $user = Utilisateur::create([
                'designation' => $validated['designation'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'niveau' => $validated['niveau'],
                'statut' => $validated['statut'],
                'id_service' => $validated['id_service']
            ]);

            return response()->json([
                'message' => 'Utilisateur créé avec succès',
                'user' => $user
            ], 201);
        } catch (ValidationException $e) {
            Log::error('Validation error: ' . json_encode($e->errors()));
            return response()->json([
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error creating user: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Erreur lors de la création de l\'utilisateur',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Utilisateur $user)
    {
        return response()->json($user);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        try {
            $user = Utilisateur::findOrFail($id);
            
            Log::info('Début de la mise à jour de l\'utilisateur', [
                'user_id' => $user->id,
                'données_reçues' => $request->all()
            ]);

            // Vérification des données avant validation
            Log::info('Vérification des données:', [
                'niveau' => $request->input('niveau'),
                'statut' => $request->input('statut'),
                'id_service' => $request->input('id_service')
            ]);

            // Règles de validation de base
            $rules = [
                'designation' => 'sometimes|required|string|max:255',
                'email' => 'sometimes|required|email|unique:T_UTILISAT,email,' . $id,
                'niveau' => 'sometimes|required|integer|in:1,2,3,4,5',
                'statut' => 'sometimes|required|integer|in:0,1',
                'id_service' => 'sometimes|required_if:niveau,3,4,5|nullable|exists:T_SERVICE,id'
            ];

            // Filtrer les règles pour ne garder que les champs présents dans la requête
            $rules = array_intersect_key($rules, $request->all());

            $validated = $request->validate($rules);

            Log::info('Données validées avec succès:', $validated);

            // Si le niveau est 2 (Directeur Général), on met id_service à null
            if (isset($validated['niveau']) && $validated['niveau'] == 2) {
                $validated['id_service'] = null;
            }

            // Vérification des données avant la mise à jour
            Log::info('Données avant mise à jour:', [
                'validated' => $validated,
                'user_before' => $user->toArray()
            ]);

            $user->update($validated);

            Log::info('Utilisateur mis à jour avec succès:', [
                'user_id' => $user->id,
                'user_after' => $user->toArray()
            ]);

            // Charger le service pour la réponse
            $user->load('service');

            return response()->json([
                'message' => 'Utilisateur mis à jour avec succès',
                'user' => $user
            ]);
        } catch (ValidationException $e) {
            Log::error('Erreur de validation:', [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            return response()->json([
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la mise à jour:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);
            return response()->json([
                'message' => 'Erreur lors de la mise à jour de l\'utilisateur',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Utilisateur $user)
    {
        try {
            $user->delete();
            return response()->json([
                'message' => 'Utilisateur supprimé avec succès'
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting user: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Erreur lors de la suppression de l\'utilisateur',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function setStatut($id, Request $request)
    {
        $user = Utilisateur::findOrFail($id);
        $user->statut = $request->input('statut');
        $user->save();
        return response()->json(['success' => true, 'statut' => $user->statut]);
    }

    public function resetPassword($id, Request $request)
    {
        try {
            // Vérifier le mot de passe de l'administrateur
            if (!Hash::check($request->input('admin_password'), auth()->user()->password)) {
                return response()->json([
                    'message' => 'Mot de passe administrateur incorrect'
                ], 422);
            }

            $user = Utilisateur::findOrFail($id);
            $user->password = Hash::make('password');
            $user->save();

            return response()->json([
                'message' => 'Mot de passe réinitialisé avec succès',
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'designation' => $user->designation,
                    'niveau' => $user->niveau,
                    'statut' => $user->statut,
                    'is_default_password' => true
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur réinitialisation mot de passe: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erreur lors de la réinitialisation du mot de passe',
                'error' => $e->getMessage()
            ], 500);
        }
    }
} 