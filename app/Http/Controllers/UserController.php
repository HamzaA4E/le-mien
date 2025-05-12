<?php

namespace App\Http\Controllers;

use App\Models\Utilisateur;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index()
    {
        $users = Utilisateur::select('id', 'designation', 'email', 'niveau', 'statut')
            ->get();
        
        return response()->json($users);
    }

    public function destroy($id)
    {
        try {
            $user = Utilisateur::findOrFail($id);
            $user->delete();
            
            return response()->json([
                'message' => 'Utilisateur supprimé avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la suppression de l\'utilisateur',
                'error' => $e->getMessage()
            ], 500);
        }
    }
} 