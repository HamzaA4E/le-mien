<?php

namespace App\Http\Controllers;

use App\Models\Emplacement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class EmplacementController extends Controller
{
    public function index()
    {
        $emplacements = Emplacement::all();
        return response()->json($emplacements);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'designation' => 'required|string|max:50',
        ]);

        $emplacement = Emplacement::create($validated);
        return response()->json($emplacement, 201);
    }
} 