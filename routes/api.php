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
use App\Http\Controllers\ExecutantController;
use App\Http\Controllers\TicketReportController;
use App\Http\Controllers\RegisterRequestController;

// Routes publiques
Route::post('/login', [AuthController::class, 'login']);
Route::get('/public/services', [ServiceController::class, 'publicIndex']);
Route::post('/public/register-request', [RegisterRequestController::class, 'store']);

// Routes protégées
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    
    // Routes pour les reports de tickets
    Route::get('/tickets/{ticket}/reports', [TicketReportController::class, 'index']);
    Route::post('/tickets/{ticket}/reports', [TicketReportController::class, 'store']);
    Route::post('/tickets/{ticket}/reports/mark-as-viewed', [TicketReportController::class, 'markAsViewed']);
    // Nouvelle route pour télécharger la pièce jointe d'un rapport
    Route::get('/reports/{report}/download-attachment', [TicketReportController::class, 'downloadAttachment']);

    // Routes pour le dashboard
    Route::get('/dashboard/stats', [TicketController::class, 'getStats']);
    Route::get('/tickets/stats', [DashboardController::class, 'getStatsByUser']);
    
    // Routes pour les tickets
    Route::get('/tickets/options', [TicketController::class, 'getOptions']);
    Route::get('/tickets/{id}/download', [TicketController::class, 'downloadAttachment']);
    Route::get('/tickets/pending', [TicketController::class, 'pending']);
    Route::get('/tickets/pending/count', [TicketController::class, 'countPending']);
    Route::get('/tickets/completed', [TicketController::class, 'completed']);
    Route::post('/tickets/{id}/approve', [TicketController::class, 'approve']);
    Route::post('/tickets/{id}/reject', [TicketController::class, 'reject']);
    Route::post('/tickets/{id}/demandeur-approve', [TicketController::class, 'demandeurApprove']);
    Route::post('/tickets/{id}/demandeur-reject', [TicketController::class, 'demandeurReject']);
    Route::apiResource('tickets', TicketController::class);

    // Routes pour les utilisateurs
    Route::apiResource('utilisateurs', UtilisateurController::class);
    Route::patch('utilisateurs/{id}/statut', [UtilisateurController::class, 'setStatut']);

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
    Route::get('/statuts', [StatutController::class, 'index']);
    Route::post('/statuts', [StatutController::class, 'store']);
    Route::get('/services', [ServiceController::class, 'index']);
    Route::post('/services', [ServiceController::class, 'store']);

    // Routes pour la gestion des utilisateurs
    Route::get('/users', [UserController::class, 'index']);
    Route::delete('/users/{id}', [UserController::class, 'destroy']);

    // Routes pour les entités modifiables
    Route::apiResource('categories', CategorieController::class);
    Route::apiResource('emplacements', EmplacementController::class);
    Route::apiResource('societes', SocieteController::class);
    Route::apiResource('demandeurs', DemandeurController::class);
    Route::apiResource('services', ServiceController::class);
    Route::apiResource('priorites', PrioriteController::class);
    Route::apiResource('statuts', StatutController::class);
    Route::apiResource('executants', ExecutantController::class);

    // Nouvelle route pour les tests de performance
    Route::get('/test-performance/{id}', [SocieteController::class, 'testPerformance']);

    // Route pour récupérer toutes les données de la liste des tickets en une seule requête
    Route::get('/tickets/list-data', [TicketController::class, 'getTicketListData']);

    // Route pour ajouter un commentaire à un ticket
    Route::post('/tickets/{id}/comment', [TicketController::class, 'addComment']);

    // Route pour modifier un commentaire d'un ticket
    Route::put('/tickets/{ticketId}/comment/{commentId}', [TicketController::class, 'updateComment']);

    // Routes pour la gestion des demandes d'inscription
    Route::get('/admin/register-requests', [RegisterRequestController::class, 'index']);
    Route::get('/admin/register-requests/count', [RegisterRequestController::class, 'count']);
    Route::post('/admin/register-requests/{id}/approve', [RegisterRequestController::class, 'approve']);
    Route::post('/admin/register-requests/{id}/reject', [RegisterRequestController::class, 'reject']);
}); 