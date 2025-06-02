<?php

namespace App\Http\Controllers;

use App\Models\Categorie;
use App\Traits\ReferentialControllerTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CategorieController extends Controller
{
    use ReferentialControllerTrait;

    protected function getModel()
    {
        return Categorie::class;
    }

    //Affichage des categories
    public function index(Request $request)
    {
        $query = Categorie::query();
        
        //si tous les categories sont actives (pour l'admin)
        if ($request->has('all') && $request->all) {
            return $query->get();
        }
        
        //Par défaut, on ne retourne que les categories actives
        return $query->where('is_active', true)->get();
    }

    public function destroy($id)
    {
        $categorie = Categorie::findOrFail($id);
        // Au lieu de supprimer, on désactive l'entité
        $categorie->update(['is_active' => false]);
        return response()->json(['success' => true]);
    }
} 