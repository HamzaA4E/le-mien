<?php

namespace App\Http\Controllers;

use App\Models\Statut;
use App\Traits\ReferentialControllerTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class StatutController extends Controller
{
    use ReferentialControllerTrait;

    protected function getModel()
    {
        return Statut::class;
    }

    public function index(Request $request)
    {
        $query = Statut::query();
        
        // Si on demande explicitement tous les éléments (pour l'admin)
        if ($request->has('all') && $request->all) {
            return $query->get();
        }
        
        // Par défaut, on ne retourne que les éléments actifs
        return $query->where('is_active', true)->get();
    }

    public function destroy($id)
    {
        $statut = Statut::findOrFail($id);
        // Au lieu de supprimer, on désactive l'entité
        $statut->update(['is_active' => false]);
        return response()->json(['success' => true]);
    }
} 