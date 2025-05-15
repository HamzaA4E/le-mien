<?php

namespace App\Http\Controllers;

use App\Models\TypeDemande;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TypeDemandeController extends Controller
{
    public function index()
    {
        return TypeDemande::all();
    }

    public function store(Request $request)
    {
        $request->validate(['designation' => 'required|string|max:255']);
        return TypeDemande::create($request->all());
    }

    public function update(Request $request, $id)
    {
        $type = TypeDemande::findOrFail($id);
        $type->update($request->all());
        return $type;
    }

    public function destroy($id)
    {
        $type = TypeDemande::findOrFail($id);
        $type->delete();
        return response()->json(['success' => true]);
    }
} 