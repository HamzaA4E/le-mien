<?php

namespace App\Http\Controllers;

use App\Models\Priorite;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PrioriteController extends Controller
{
    public function index()
    {
        return Priorite::all();
    }

    public function store(Request $request)
    {
        $request->validate(['designation' => 'required|string|max:255']);
        return Priorite::create($request->all());
    }

    public function update(Request $request, $id)
    {
        $priorite = Priorite::findOrFail($id);
        $priorite->update($request->all());
        return $priorite;
    }

    public function destroy($id)
    {
        $priorite = Priorite::findOrFail($id);
        $priorite->delete();
        return response()->json(['success' => true]);
    }
} 