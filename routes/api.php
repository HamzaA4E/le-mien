<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\TicketController;
use App\Http\Controllers\UtilisateurController;
use App\Http\Controllers\DemandeurController;
use App\Http\Controllers\SocieteController;
use App\Http\Controllers\EmplacementController;
use App\Http\Controllers\PrioriteController;
use App\Http\Controllers\CategorieController;
use App\Http\Controllers\TypeDemandeController;
use App\Http\Controllers\StatutController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\TicketStatsController;

// Routes publiques
Route::post('/login', [AuthController::class, 'login']);

// Routes protégées
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    
    // Routes pour le dashboard
    Route::get('/dashboard/stats', [DashboardController::class, 'getStats']);
    Route::get('/tickets/stats', [DashboardController::class, 'getStatsByUser']);
    
    // Routes pour les tickets
    Route::apiResource('tickets', TicketController::class);
    Route::get('/tickets/options', [TicketController::class, 'getOptions']);

    // Routes pour les utilisateurs
    Route::apiResource('utilisateurs', UtilisateurController::class);

    // Routes pour les listes déroulantes
    Route::get('/demandeurs', [DemandeurController::class, 'index']);
    Route::post('/demandeurs', [DemandeurController::class, 'store']);
    Route::get('/societes', [SocieteController::class, 'index']);
    Route::post('/societes', [SocieteController::class, 'store']);
    Route::get('/emplacements', [EmplacementController::class, 'index']);
    Route::post('/emplacements', [EmplacementController::class, 'store']);
    Route::get('/priorites', [PrioriteController::class, 'index']);
    Route::post('/priorites', [PrioriteController::class, 'store']);
    Route::get('/categories', [CategorieController::class, 'index']);
    Route::post('/categories', [CategorieController::class, 'store']);
    Route::get('/types-demande', [TypeDemandeController::class, 'index']);
    Route::post('/types-demande', [TypeDemandeController::class, 'store']);
    Route::get('/statuts', [StatutController::class, 'index']);
    Route::post('/statuts', [StatutController::class, 'store']);
    Route::get('/services', [ServiceController::class, 'index']);
    Route::post('/services', [ServiceController::class, 'store']);

    // Routes pour la gestion des utilisateurs
    Route::get('/users', [UserController::class, 'index']);
    Route::delete('/users/{id}', [UserController::class, 'destroy']);
}); 