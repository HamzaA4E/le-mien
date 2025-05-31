<?php

namespace App\Http\Controllers;

use App\Models\Service;
use App\Traits\ReferentialControllerTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ServiceController extends Controller
{
    use ReferentialControllerTrait;

    protected function getModel()
    {
        return Service::class;
    }

    public function index(Request $request)
    {
        $query = Service::query();
        
        // Si on demande explicitement tous les éléments (pour l'admin)
        if ($request->has('all') && $request->all) {
            return $query->get();
        }
        
        // Par défaut, on ne retourne que les éléments actifs
        return $query->where('is_active', true)->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'designation' => 'required|string|max:255',
            'is_active' => 'boolean'
        ]);
        
        $data = $request->all();
        // Par défaut, les nouvelles entités sont actives
        if (!isset($data['is_active'])) {
            $data['is_active'] = true;
        }
        
        return Service::create($data);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'designation' => 'required|string|max:255',
            'is_active' => 'boolean'
        ]);
        
        $service = Service::findOrFail($id);
        $service->update($request->all());
        return $service;
    }

    public function destroy($id)
    {
        $service = Service::findOrFail($id);
        // Au lieu de supprimer, on désactive l'entité
        $service->update(['is_active' => false]);
        return response()->json(['success' => true]);
    }

    public function publicIndex()
    {
        try {
            $services = Service::select('id', 'designation as name')
                             ->where('is_active', true)
                             ->orderBy('designation')
                             ->get();
            
            return response()->json($services);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des services: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erreur lors de la récupération des services',
                'error' => $e->getMessage()
            ], 500);
        }
    }
} 