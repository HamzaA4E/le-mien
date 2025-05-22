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

    //Creation d'une nouvelle categorie
    public function store(Request $request)
    {
        $request->validate([
            'designation' => 'required|string|max:255',
            'is_active' => 'boolean'
        ]);
        
        $data = $request->all();
        //Par défaut, les nouvelles categories sont actives
        if (!isset($data['is_active'])) {
            $data['is_active'] = true;
        }
        
        return Categorie::create($data);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'designation' => 'required|string|max:255',
            'is_active' => 'boolean'
        ]);
        
        //Trouver la categorie par son id et la modifier
        $categorie = Categorie::findOrFail($id);
        $categorie->update($request->all());
        return $categorie;
    }

    public function destroy($id)
    {
        $categorie = Categorie::findOrFail($id);
        // Au lieu de supprimer, on désactive l'entité
        $categorie->update(['is_active' => false]);
        return response()->json(['success' => true]);
    }
} 