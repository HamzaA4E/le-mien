<?php

namespace App\Http\Controllers;

use App\Models\Statut;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class StatutController extends Controller
{
    public function index()
    {
        return Statut::all();
    }

    public function store(Request $request)
    {
        $request->validate(['designation' => 'required|string|max:255']);
        return Statut::create($request->all());
    }

    public function update(Request $request, $id)
    {
        $statut = Statut::findOrFail($id);
        $statut->update($request->all());
        return $statut;
    }

    public function destroy($id)
    {
        $statut = Statut::findOrFail($id);
        $statut->delete();
        return response()->json(['success' => true]);
    }
} 