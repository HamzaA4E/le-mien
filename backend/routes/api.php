<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\FilterController;

// Route pour récupérer tous les filtres en une seule requête
Route::get('filters', [FilterController::class, 'getAllFilters']); 