<?php

namespace App\Http\Controllers;

use App\Models\Emplacement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class EmplacementController extends Controller
{
    public function index()
    {
        return Emplacement::all();
    }

    public function store(Request $request)
    {
        $request->validate(['designation' => 'required|string|max:255']);
        return Emplacement::create($request->all());
    }

    public function update(Request $request, $id)
    {
        $emplacement = Emplacement::findOrFail($id);
        $emplacement->update($request->all());
        return $emplacement;
    }

    public function destroy($id)
    {
        $emplacement = Emplacement::findOrFail($id);
        $emplacement->delete();
        return response()->json(['success' => true]);
    }
} 