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
        $users = Utilisateur::all();
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
                'niveau' => 'required|in:1,2,3,4',
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
    public function update(Request $request, Utilisateur $user)
    {
        try {
            $validated = $request->validate([
                'designation' => 'sometimes|required|string|max:255',
                'email' => 'sometimes|required|email|unique:T_UTILISAT,email,' . $user->id,
                'password' => 'sometimes|required|min:6',
                'niveau' => 'sometimes|required|in:1,2,3,4',
                'statut' => 'sometimes|required|in:0,1'
            ]);

            if (isset($validated['password'])) {
                $validated['password'] = Hash::make($validated['password']);
            }

            $user->update($validated);

            return response()->json([
                'message' => 'Utilisateur mis à jour avec succès',
                'user' => $user
            ]);
        } catch (ValidationException $e) {
            Log::error('Validation error: ' . json_encode($e->errors()));
            return response()->json([
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error updating user: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
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
} 