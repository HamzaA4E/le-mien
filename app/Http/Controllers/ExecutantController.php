<?php

namespace App\Http\Controllers;

use App\Models\Executant;
use Illuminate\Http\Request;

class ExecutantController extends Controller
{
    public function index()
    {
        return Executant::all();
    }

    public function store(Request $request)
    {
        $request->validate(['designation' => 'required|string|max:255']);
        return Executant::create($request->all());
    }
} 