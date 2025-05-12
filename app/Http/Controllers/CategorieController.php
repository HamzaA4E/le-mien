<?php

namespace App\Http\Controllers;

use App\Models\Categorie;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CategorieController extends Controller
{
    public function index()
    {
        $categories = Categorie::all();
        return response()->json($categories);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'designation' => 'required|string|max:50',
        ]);

        $categorie = Categorie::create($validated);
        return response()->json($categorie, 201);
    }
} 