<?php

namespace App\Http\Controllers;

use App\Models\Priorite;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PrioriteController extends Controller
{
    public function index()
    {
        $priorites = Priorite::all();
        return response()->json($priorites);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'designation' => 'required|string|max:50',
        ]);

        $priorite = Priorite::create($validated);
        return response()->json($priorite, 201);
    }
} 