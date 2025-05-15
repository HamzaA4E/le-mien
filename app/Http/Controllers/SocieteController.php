<?php

namespace App\Http\Controllers;

use App\Models\Societe;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SocieteController extends Controller
{
    public function index()
    {
        return Societe::all();
    }

    public function store(Request $request)
    {
        $request->validate(['designation' => 'required|string|max:255']);
        return Societe::create($request->all());
    }

    public function update(Request $request, $id)
    {
        $societe = Societe::findOrFail($id);
        $societe->update($request->all());
        return $societe;
    }

    public function destroy($id)
    {
        $societe = Societe::findOrFail($id);
        $societe->delete();
        return response()->json(['success' => true]);
    }
} 