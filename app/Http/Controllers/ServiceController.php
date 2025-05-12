<?php

namespace App\Http\Controllers;

use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ServiceController extends Controller
{
    public function index()
    {
        try {
            $services = Service::all();
            return response()->json($services);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des services: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Erreur lors de la récupération des services',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'designation' => 'required|string|max:50'
            ]);

            $service = Service::create($validated);

            return response()->json($service, 201);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la création du service: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Erreur lors de la création du service',
                'error' => $e->getMessage()
            ], 500);
        }
    }
} 