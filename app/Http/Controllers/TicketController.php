<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\Demandeur;
use App\Models\Emplacement;
use App\Models\Priorite;
use App\Models\Categorie;
use App\Models\Statut;
use App\Models\Utilisateur;
use App\Models\TicketReport;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Mail\TicketAssignedNotification;
use Illuminate\Support\Facades\Mail;

class TicketController extends Controller
{
    protected $relations = [
        'statut',
        'priorite',
        'demandeur.service',
        'emplacement',
        'categorie'
    ];

    public function index(Request $request)
    {
        try {
            $query = Ticket::with([
                'statut',
                'priorite',
                'demandeur',
                'emplacement',
                'categorie',
                'reports',
                'executant'
            ]);

            // Restriction pour les administrateurs : ils ne voient pas les tickets "Nouveau" et "Refusé"
            $user = auth()->user();
            if ($user && method_exists($user, 'isAdmin') && $user->isAdmin()) {
                $query->where('Id_Statut', '!=', 1) // Exclure les tickets avec statut "Nouveau"
                      ->whereHas('statut', function($q) {
                          $q->where('designation', '!=', 'Refusé'); // Exclure les tickets refusés
                      });
            }

            // Restriction pour les demandeurs : ils ne voient que leurs tickets
            if ($user && method_exists($user, 'isDemandeur') && $user->isDemandeur()) {
                $demandeur = \App\Models\Demandeur::where('designation', $user->designation)->first();
                if ($demandeur) {
                    $query->where('Id_Demandeur', $demandeur->id);
                } else {
                    // Aucun ticket si le demandeur n'est pas trouvé
                    $query->whereRaw('1=0');
                }
            }
            // Restriction pour les directeurs département : ils ne voient que les tickets de leur département
            else if ($user && method_exists($user, 'isDirecteurDepartement') && $user->isDirecteurDepartement()) {
                Log::info('Directeur de département connecté', [
                    'user_id' => $user->id,
                    'designation' => $user->designation,
                    'id_service' => $user->id_service
                ]);
                
                $query->join('T_DEMDEUR', 'T_TICKET.Id_Demandeur', '=', 'T_DEMDEUR.id')
                      ->where('T_DEMDEUR.id_service', $user->id_service)
                      ->select('T_TICKET.*');
            }

            // Restriction pour les exécutants : ils ne voient que les tickets qui leur sont assignés
            //Expliquant cette condition en detaillé:
            //1. $user c'est l'utilisateur connecté
            //methode exists c'est une methode qui permet de verifier si la methode isExecutant existe dans la classe Utilisateur
            //2. $user->isExecutant() c'est la methode qui permet de verifier si l'utilisateur connecté est un exécutant
            if ($user && method_exists($user, 'isExecutant') && $user->isExecutant()) {
                // On suppose que la désignation de l'utilisateur == désignation de l'exécutant
                $executant = \App\Models\Executant::where('designation', $user->designation)->first();
                if ($executant) {
                    $query->where('Id_Executant', $executant->id);
                } else {
                    // Aucun ticket si pas d'exécutant correspondant
                    $query->whereRaw('1=0');
                }
            }

            // Appliquer les filtres
            if ($request->filled('titre')) {
                $query->where('Titre', 'like', '%' . $request->titre . '%');
            }
            if ($request->filled('categorie')) {
                $query->where('Id_Categorie', $request->categorie);
            }
            if ($request->filled('demandeur')) {
                $query->where('Id_Demandeur', $request->demandeur);
            }
            if ($request->filled('emplacement')) {
                $query->where('Id_Emplacement', $request->emplacement);
            }
            if ($request->filled('statut')) {
                $query->where('Id_Statut', $request->statut);
            }
            if ($request->filled('priorite')) {
                $query->where('Id_Priorite', $request->priorite);
            }

            // Ajouter le filtre pour les rapports non lus si demandé
            if ($request->boolean('filter_unread_reports') && auth()->check()) {
                $userId = auth()->id();
                $query->whereHas('reports', function ($q) use ($userId) {
                    $q->where('is_viewed', false)
                      ->where('Id_Ticket', DB::raw('T_TICKET.id'))
                      ->whereHas('ticket', function ($t) use ($userId) {
                            $t->where('Id_Demandeur', $userId);
                       });
                });
            }

            // Filtres de dates
            if ($request->filled('dateDebut')) {
                $query->whereDate('DateDebut', '>=', $request->dateDebut);
            }
            if ($request->filled('dateDebutFin')) {
                $query->whereDate('DateDebut', '<=', $request->dateDebutFin);
            }
            if ($request->filled('dateFinPrevueDebut')) {
                $query->whereDate('DateFinPrevue', '>=', $request->dateFinPrevueDebut);
            }
            if ($request->filled('dateFinPrevueFin')) {
                $query->whereDate('DateFinPrevue', '<=', $request->dateFinPrevueFin);
            }
            if ($request->filled('dateFinReelleDebut')) {
                $query->whereDate('DateFinReelle', '>=', $request->dateFinReelleDebut);
            }
            if ($request->filled('dateFinReelleFin')) {
                $query->whereDate('DateFinReelle', '<=', $request->dateFinReelleFin);
            }

            // Tri par date de création décroissante
            $query->orderBy('DateCreation', 'desc');

            // Pagination
            $page = $request->input('page', 1);
            $perPage = $request->input('per_page', 10);
            $tickets = $query->paginate($perPage, ['*'], 'page', $page);

            // Ajout du formatage des commentaires pour chaque ticket de la pagination
            foreach ($tickets as $ticket) {
                if ($ticket->Commentaire) {
                    $comments = explode("\n\n", $ticket->Commentaire);
                    $formattedComments = [];
                    foreach ($comments as $comment) {
                        if (empty(trim($comment))) continue;
                        if (preg_match('/\[(.*?)\|(.*?)\](.*)/s', $comment, $matches)) {
                            $userName = $matches[1];
                            $date = $matches[2];
                            $content = trim($matches[3]);
                            $formattedComments[] = [
                                'user' => [
                                    'designation' => $userName
                                ],
                                'date' => $date,
                                'content' => $content
                            ];
                        }
                    }
                    $ticket->formatted_comments = $formattedComments;
                } else {
                    $ticket->formatted_comments = [];
                }
            }

            return response()->json($tickets);
        } catch (\Exception $e) {
            Log::error('Error fetching tickets', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Erreur lors de la récupération des tickets',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            Log::info('Début de la création du ticket');
            Log::info('Données reçues:', $request->all());

            // Validation des données
            $validated = $request->validate([
                'titre' => 'required|string|max:255',
                'description' => 'required|string',
                'commentaire' => 'nullable|string',
                'attachment' => 'nullable|file|max:10240', // max 10MB
                'date_debut' => 'nullable|date',
                'date_fin_prevue' => [
                    'nullable',
                    'date',
                    function ($attribute, $value, $fail) use ($request) {
                        if ($value && $request->date_debut && strtotime($value) < strtotime($request->date_debut)) {
                            $fail('La date de fin prévue ne peut pas être antérieure à la date de début.');
                        }
                    },
                ],
                'date_fin_reelle' => 'nullable|date',
                'id_demandeur' => 'required|exists:T_UTILISAT,id',
                'id_utilisateur' => 'required|exists:T_UTILISAT,id',
                'id_emplacement' => 'required|exists:T_EMPLACEMENT,id',
                'id_priorite' => 'required|exists:T_PRIORITE,id',
                'id_categorie' => 'required|exists:T_CATEGORIE,id',
                'id_statut' => 'required|exists:T_STATUT,id',
            ]);

            Log::info('Données validées:', $validated);

            DB::beginTransaction();

            try {
                // Récupérer l'utilisateur
                $utilisateur = Utilisateur::find($validated['id_demandeur']);
                if (!$utilisateur) {
                    throw new \Exception('Utilisateur non trouvé');
                }

                // Vérifier si un demandeur existe déjà avec cette désignation
                $demandeur = Demandeur::where('designation', $utilisateur->designation)->first();
                
                // Si aucun demandeur n'existe, en créer un
                if (!$demandeur) {
                    $demandeur = Demandeur::create([
                        'designation' => $utilisateur->designation,
                        'id_service' => $utilisateur->id_service ?? 1,
                        'statut' => 1, // Actif par défaut
                        'is_active' => true
                    ]);
                    Log::info('Nouveau demandeur créé:', ['id' => $demandeur->id, 'designation' => $demandeur->designation]);
                } else {
                    // Si le demandeur existe, s'assurer que id_service est à jour
                    if ($demandeur->id_service !== $utilisateur->id_service) {
                         $demandeur->update([
                            'id_service' => $utilisateur->id_service
                         ]);
                         Log::info('Demandeur existant mis à jour avec le service de l\'utilisateur:', ['demandeur_id' => $demandeur->id, 'id_service' => $utilisateur->id_service]);
                    }
                }

                // Mettre à jour l'id_demandeur avec l'ID du demandeur
                $validated['id_demandeur'] = $demandeur->id;

                Log::info('Valeurs brutes des dates:', [
                    'date_debut' => $validated['date_debut'] ?? null,
                    'date_fin_prevue' => $validated['date_fin_prevue'] ?? null,
                    'date_fin_reelle' => $validated['date_fin_reelle'] ?? null
                ]);
                // Convertir les dates en format SQL Server
                $dateDebut = !empty($validated['date_debut']) ? date('d/m/Y H:i:s', strtotime($validated['date_debut'])) : null;
                $dateFinPrevue = !empty($validated['date_fin_prevue']) ? date('d/m/Y H:i:s', strtotime($validated['date_fin_prevue'])) : null;
                $dateFinReelle = !empty($validated['date_fin_reelle']) ? date('d/m/Y H:i:s', strtotime($validated['date_fin_reelle'])) : null;
                $dateCreation = date('d/m/Y H:i:s');

                Log::info('Valeurs converties des dates:', [
                    'date_debut' => $dateDebut,
                    'date_fin_prevue' => $dateFinPrevue,
                    'date_fin_reelle' => $dateFinReelle,
                    'date_creation' => $dateCreation
                ]);
                // Gestion de la pièce jointe
                $attachmentPath = null;
                if ($request->hasFile('attachment')) {
                    $file = $request->file('attachment');
                    Log::info('Fichier reçu:', [
                        'name' => $file->getClientOriginalName(),
                        'size' => $file->getSize(),
                        'mime' => $file->getMimeType()
                    ]);
                    
                    try {
                        // Get the original filename
                        $originalName = $file->getClientOriginalName();
                        // Store the file with its original name
                        $attachmentPath = $file->storeAs('attachments', $originalName, 'public');
                        Log::info('Fichier stocké avec succès:', ['path' => $attachmentPath]);
                    } catch (\Exception $e) {
                        Log::error('Erreur lors du stockage du fichier:', [
                            'error' => $e->getMessage(),
                            'file' => $file->getClientOriginalName()
                        ]);
                        throw $e;
                    }
                } else {
                    Log::info('Aucun fichier n\'a été envoyé');
                }

                //Création du ticket
                $data = [
                    'Titre' => $validated['titre'],
                    'Description' => $validated['description'],
                    'Commentaire' => $validated['commentaire'] ?? null,
                    'attachment_path' => $attachmentPath,
                    'Id_Priorite' => (int)$validated['id_priorite'],
                    'Id_Statut' => (int)$validated['id_statut'],
                    'Id_Demandeur' => (int)$validated['id_demandeur'],
                    'Id_Emplacement' => (int)$validated['id_emplacement'],
                    'Id_Categorie' => (int)$validated['id_categorie'],
                    'Id_Utilisat' => (int)$validated['id_utilisateur'],
                    'DateDebut' => $dateDebut,
                    'DateFinPrevue' => $dateFinPrevue,
                    'DateFinReelle' => $dateFinReelle,
                    'DateCreation' => $dateCreation,
                    'created_at' => $dateCreation,
                    'updated_at' => $dateCreation,
                ];

                Log::info('Données formatées pour SQL Server:', $data);

                $ticket = Ticket::create($data);
                DB::commit();

                Log::info('Ticket créé avec succès:', ['id' => $ticket->id]);

                return response()->json([
                    'message' => 'Ticket créé avec succès',
                    'ticket' => $ticket
                ], 201);

            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('Erreur lors de la création du ticket dans la base de données: ' . $e->getMessage());
                Log::error('Stack trace: ' . $e->getTraceAsString());
                throw $e;
            }

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Erreur de validation:', ['errors' => $e->errors()]);
            return response()->json([
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la création du ticket: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Erreur lors de la création du ticket',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    //Affichage d'un ticket
    public function show($id)
    {
        try {
            $ticket = Ticket::with([
                'statut',
                'priorite',
                'categorie',
                'demandeur.service',
                'emplacement',
                'utilisateur',
                'reports',
                'executant'
            ])->findOrFail($id);

            // Si le ticket a des commentaires, récupérer les informations des utilisateurs
            if ($ticket->Commentaire) {
                $comments = explode("\n\n", $ticket->Commentaire);
                $formattedComments = [];
                
                foreach ($comments as $comment) {
                    if (empty(trim($comment))) continue;
                    
                    // Utiliser une regex qui préserve les sauts de ligne dans le contenu
                    if (preg_match('/\[(.*?)\|(.*?)\](.*)/s', $comment, $matches)) {
                        $userName = $matches[1];
                        $date = $matches[2];
                        $content = trim($matches[3]);
                        
                        // Au lieu de chercher par ID, on utilise directement le nom d'utilisateur
                        $formattedComments[] = [
                            'user' => [
                                'designation' => $userName
                            ],
                            'date' => $date,
                            'content' => $content
                        ];
                    }
                }
                
                $ticket->formatted_comments = $formattedComments;
            }

            return response()->json($ticket);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération du ticket: ' . $e->getMessage());
            return response()->json(['error' => 'Erreur lors de la récupération du ticket'], 500);
        }
    }
    //Modification d'un ticket
    public function update(Request $request, Ticket $ticket)
    {
        try {
            Log::info('Début de la mise à jour du ticket', [
                'ticket_id' => $ticket->id,
                'donnees_recues' => $request->all()
            ]);

            // Validation des données
            $validated = $request->validate([
                'Titre' => 'sometimes|string|max:255',
                'Description' => 'sometimes|string',
                'Commentaire' => 'nullable|string',
                'Id_Priorite' => 'sometimes|exists:T_PRIORITE,id',
                'Id_Statut' => 'sometimes|exists:T_STATUT,id',
                'Id_Demandeur' => 'sometimes|exists:T_UTILISAT,id',
                'Id_Emplacement' => 'sometimes|exists:T_EMPLACEMENT,id',
                'Id_Categorie' => 'sometimes|exists:T_CATEGORIE,id',
                'DateDebut' => 'sometimes|date_format:d/m/Y',
                'DateFinPrevue' => [
                    'sometimes',
                    'date_format:d/m/Y',
                    function ($attribute, $value, $fail) use ($request) {
                        if ($request->has('DateDebut') && strtotime($value) < strtotime($request->DateDebut)) {
                            $fail('La date de fin prévue ne peut pas être antérieure à la date de début.');
                        }
                    },
                ],
                'attachment' => 'nullable|file|max:10240', // max 10MB
            ]);

            Log::info('Données validées:', $validated);

            // Préparation des données pour la mise à jour
            $data = [];
            foreach ($validated as $key => $value) {
                if ($value !== null && $key !== 'attachment') {
                    $data[$key] = $value;
                }
            }

            // Autorisation pour l'exécutant
            $user = auth()->user();
            if ($user && method_exists($user, 'isExecutant') && $user->isExecutant()) {
                // Récupérer l'exécutant lié à l'utilisateur
                $executant = \App\Models\Executant::where('designation', $user->designation)->first();
                if (!$executant || $ticket->Id_Executant !== $executant->id) {
                    return response()->json([
                        'message' => 'Vous n\'êtes pas autorisé à modifier ce ticket'
                    ], 403);
                }
                // L'exécutant ne peut changer le statut que vers "En cours" ou "Terminé"
                if (isset($data['Id_Statut'])) {
                    $statutAutorises = \App\Models\Statut::whereIn('designation', ['En cours', 'Terminé'])->pluck('id')->toArray();
                    if (!in_array($data['Id_Statut'], $statutAutorises)) {
                        return response()->json([
                            'message' => 'Vous ne pouvez changer le statut que vers "En cours" ou "Terminé"'
                        ], 403);
                    }
                }
            }

            // Gestion de la pièce jointe
            if ($request->hasFile('attachment')) {
                $file = $request->file('attachment');
                Log::info('Nouvelle pièce jointe reçue:', [
                    'name' => $file->getClientOriginalName(),
                    'size' => $file->getSize(),
                    'mime' => $file->getMimeType()
                ]);
                try {
                    // Supprimer l'ancienne pièce jointe si elle existe
                    if ($ticket->attachment_path) {
                        $oldPath = storage_path('app/public/' . $ticket->attachment_path);
                        Log::info('Vérification de l\'ancienne pièce jointe à supprimer', ['oldPath' => $oldPath, 'exists' => file_exists($oldPath)]);
                        if (file_exists($oldPath)) {
                            unlink($oldPath);
                            Log::info('Ancienne pièce jointe supprimée', ['oldPath' => $oldPath]);
                        } else {
                            Log::warning('Ancienne pièce jointe non trouvée pour suppression', ['oldPath' => $oldPath]);
                        }
                    }
                    // Stocker la nouvelle pièce jointe
                    $originalName = $file->getClientOriginalName();
                    $attachmentPath = $file->storeAs('attachments', $originalName, 'public');
                    $data['attachment_path'] = $attachmentPath;
                    Log::info('Nouvelle pièce jointe stockée avec succès:', ['path' => $attachmentPath]);
                } catch (\Exception $e) {
                    Log::error('Erreur lors du stockage de la nouvelle pièce jointe:', [
                        'error' => $e->getMessage(),
                        'file' => $file->getClientOriginalName(),
                        'ticket_id' => $ticket->id
                    ]);
                    throw $e;
                }
            }

            Log::info('Données formatées pour la mise à jour:', $data);

            // Vérification avant la mise à jour
            Log::info('État du ticket avant mise à jour:', [
                'id' => $ticket->id,
                'statut_actuel' => $ticket->Id_Statut
            ]);

            // Ajout : renseigner DateFinReelle si le ticket passe à Clôturé
            $statutCloture = Statut::where('designation', 'Clôturé')->first();
            $idCloture = $statutCloture ? $statutCloture->id : null;
            if (
                (isset($data['Id_Statut']) && $idCloture && (int)$data['Id_Statut'] === (int)$idCloture) ||
                ($ticket->Id_Statut === $idCloture)
            ) {
                if (empty($ticket->DateFinReelle)) {
                    $data['DateFinReelle'] = date('d/m/Y H:i:s');
                }
            }

            Log::info('Données finales pour update:', $data);

            // Mise à jour du ticket
            DB::beginTransaction();
            try {
                $ticket->update($data);

                // Ajout d'un commentaire automatique si l'admin change le statut d'un ticket qui n'est pas assigné à lui-même
                $user = auth()->user();
                if ($user && method_exists($user, 'isAdmin') && $user->isAdmin()) {
                    $executant = \App\Models\Executant::where('designation', $user->designation)->first();
                    if (!$executant || $ticket->Id_Executant !== $executant->id) {
                        $comment = "\n\n[{$user->designation}|" . date('d/m/Y H:i:s') . "]Action admin : changement de statut du ticket (non assigné à lui-même).";
                        $ticket->Commentaire = ($ticket->Commentaire ?? '') . $comment;
                        $ticket->save();
                    }
                }

                DB::commit();
                
                Log::info('Ticket mis à jour avec succès', [
                    'ticket_id' => $ticket->id,
                    'nouveau_statut' => $ticket->Id_Statut
                ]);

                // Recharger le ticket avec ses relations
                $ticket = Ticket::with(['statut', 'priorite', 'demandeur', 'emplacement', 'categorie', 'executant'])->find($ticket->id);
                
                return response()->json($ticket);
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('Erreur lors de la mise à jour dans la base de données: ' . $e->getMessage());
                Log::error('Stack trace: ' . $e->getTraceAsString());
                throw $e;
            }
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Erreur de validation:', ['errors' => $e->errors()]);
            return response()->json([
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la mise à jour du ticket: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Erreur lors de la mise à jour du ticket',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy(Ticket $ticket)
    {
        try {
            // Vérifier si l'utilisateur est le créateur du ticket
            if (auth()->id() !== $ticket->Id_Utilisat) {
                return response()->json([
                    'message' => 'Vous n\'êtes pas autorisé à supprimer ce ticket'
                ], 403);
            }

            // Vérifier le statut (Nouveau ou En instance)
            if (!in_array($ticket->Id_Statut, [1, 2])) {
                return response()->json([
                    'message' => 'Vous ne pouvez supprimer que les tickets nouveaux ou en instance'
                ], 403);
            }

            // Supprimer la pièce jointe si elle existe
            if ($ticket->attachment_path) {
                $path = storage_path('app/public/' . $ticket->attachment_path);
                if (file_exists($path)) {
                    unlink($path);
                }
            }

            $ticket->delete();
            return response()->json(null, 204);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la suppression du ticket: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erreur lors de la suppression du ticket',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    //Récupérer les options
    public function getOptions()
    {
        return response()->json([
            'options' => [
                'statuts' => Statut::where('is_active', true)
                    ->where('id', '!=', 1) // Exclure le statut "Nouveau"
                    ->get(),
                'priorites' => Priorite::where('is_active', true)->get(),
                'demandeurs' => Demandeur::where('is_active', true)->get(),
                'emplacements' => Emplacement::where('is_active', true)->get(),
                'categories' => Categorie::where('is_active', true)->get()
            ]
        ]);
    }
    //Récupérer les statistiques
    public function getStats()
    {
        try {
            // Récupérer tous les statuts actifs
            $statuts = Statut::where('is_active', true)->get();
            
            // Initialiser le tableau des statistiques par statut
            $statsParStatut = [];
            foreach ($statuts as $statut) {
                $query = Ticket::where('Id_Statut', $statut->id);
                
                // Restriction pour les directeurs département : ils ne voient que les tickets de leur département
                $user = auth()->user();
                if ($user && method_exists($user, 'isDirecteurDepartement') && $user->isDirecteurDepartement()) {
                    $query->join('T_DEMDEUR', 'T_TICKET.Id_Demandeur', '=', 'T_DEMDEUR.id')
                          ->where('T_DEMDEUR.id_service', $user->id_service)
                          ->select('T_TICKET.*');
                }
                
                $statsParStatut[] = [
                    'id' => $statut->id,
                    'designation' => $statut->designation,
                    'total' => $query->count()
                ];
            }

            // Requête de base pour le total
            $totalQuery = Ticket::query();
            
            // Restriction pour les directeurs département
            $user = auth()->user();
            if ($user && method_exists($user, 'isDirecteurDepartement') && $user->isDirecteurDepartement()) {
                $totalQuery->join('T_DEMDEUR', 'T_TICKET.Id_Demandeur', '=', 'T_DEMDEUR.id')
                          ->where('T_DEMDEUR.id_service', $user->id_service)
                          ->select('T_TICKET.*');
            }

            $stats = [
                'total' => $totalQuery->count(),
                'par_statut' => $statsParStatut,
                //Récupérer les statistiques par priorité
                'par_priorite' => Priorite::where('is_active', true)
                    ->get()
                    ->map(function($priorite) use ($user) {
                        $query = $priorite->tickets();
                        if ($user && method_exists($user, 'isDirecteurDepartement') && $user->isDirecteurDepartement()) {
                            $query->join('T_DEMDEUR', 'T_TICKET.Id_Demandeur', '=', 'T_DEMDEUR.id')
                                  ->where('T_DEMDEUR.id_service', $user->id_service)
                                  ->select('T_TICKET.*');
                        }
                        return [
                            'priorite' => $priorite->designation,
                            'total' => $query->count()
                        ];
                    }),
                //Récupérer les statistiques par catégorie
                'par_categorie' => Categorie::where('is_active', true)
                    ->get()
                    ->map(function($categorie) use ($user) {
                        $query = $categorie->tickets();
                        if ($user && method_exists($user, 'isDirecteurDepartement') && $user->isDirecteurDepartement()) {
                            $query->join('T_DEMDEUR', 'T_TICKET.Id_Demandeur', '=', 'T_DEMDEUR.id')
                                  ->where('T_DEMDEUR.id_service', $user->id_service)
                                  ->select('T_TICKET.*');
                        }
                        return [
                            'categorie' => $categorie->designation,
                            'total' => $query->count()
                        ];
                    }),
                //Récupérer les statistiques par demandeur
                'par_demandeur' => Demandeur::where('is_active', true)
                    ->when($user && method_exists($user, 'isDirecteurDepartement') && $user->isDirecteurDepartement(), function($query) use ($user) {
                        return $query->where('id_service', $user->id_service);
                    })
                    ->get()
                    ->map(function($demandeur) {
                        return [
                            'demandeur' => $demandeur->designation,
                            'total' => $demandeur->tickets()->count()
                        ];
                    }),
            ];

            return response()->json($stats);
            
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des statistiques: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erreur lors de la récupération des statistiques',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Utilitaire pour la commande de rappel
    public static function ticketsFinPrevueDans24hNonCloture()
    {
        return \App\Models\Ticket::with(['statut', 'priorite', 'demandeur', 'emplacement', 'categorie', 'executant'])
            ->finPrevueDans24hNonCloture()
            ->get();
    }
    //Téléchargement de la pièce jointe
    public function downloadAttachment($id)
    {
        try {
            $ticket = Ticket::findOrFail($id);

            if (!$ticket->attachment_path) {
                return response()->json(['message' => 'Aucune pièce jointe trouvée'], 404);
            }

            $path = storage_path('app/public/' . $ticket->attachment_path);

            if (!file_exists($path)) {
                return response()->json(['message' => 'Le fichier n\'existe plus'], 404);
            }

            $mimeType = mime_content_type($path) ?: 'application/octet-stream'; //application/octet-stream : type de fichier par défaut

            return response()->download($path, basename($path), [
                'Content-Type' => $mimeType,
                'Content-Disposition' => 'attachment; filename="'.basename($path).'"',
                'Cache-Control' => 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0',
                'Pragma' => 'no-cache'
            ]);
        } catch (\Exception $e) {
            \Log::error('Erreur téléchargement fichier', [
                'error' => $e->getMessage(),
                'ticket_id' => $id,
                'path' => $path ?? null
            ]);
            return response()->json(['message' => 'Erreur lors du téléchargement'], 500);
        }
    }

    /**
     * Récupère toutes les données nécessaires pour la liste des tickets en une seule requête
     */
    public function getTicketListData(Request $request)
    {
        try {
            // Récupérer les données de filtrage
            $filterData = [
                'categories' => Categorie::where('is_active', true)->get(),
                'demandeurs' => Demandeur::where('is_active', true)->get(),
                'emplacements' => Emplacement::where('is_active', true)->get(),
                'statuts' => Statut::where('is_active', true)->get(),
                'priorites' => Priorite::where('is_active', true)->get(),
            ];

            // Construire la requête pour les tickets
            $query = Ticket::with([
                'statut',
                'priorite',
                'demandeur',
                'emplacement',
                'categorie',
                'executant'
            ]);

            // Appliquer les filtres
            if ($request->filled('categorie')) {
                $query->where('Id_Categorie', $request->categorie);
            }
            if ($request->filled('demandeur')) {
                $query->where('Id_Demandeur', $request->demandeur);
            }
            if ($request->filled('emplacement')) {
                $query->where('Id_Emplacement', $request->emplacement);
            }
            if ($request->filled('statut')) {
                $query->where('Id_Statut', $request->statut);
            }
            if ($request->filled('priorite')) {
                $query->where('Id_Priorite', $request->priorite);
            }

            // Ajouter le filtre pour les rapports non lus si demandé
            if ($request->boolean('filter_unread_reports') && auth()->check()) {
                $userId = auth()->id();
                $query->whereHas('reports', function ($q) use ($userId) {
                    $q->where('is_viewed', false) // Rapports non vus
                      ->where('Id_Ticket', DB::raw('T_TICKET.id')) // Assurez-vous que c'est pour le ticket parent
                      // Optionnel: Si seul le demandeur peut voir ses rapports non lus
                      ->whereHas('ticket', function ($t) use ($userId) {
                            $t->where('Id_Demandeur', $userId);
                       });
                });
            }

            // Filtres de dates
            if ($request->filled('dateDebut')) {
                $query->whereDate('DateDebut', '>=', $request->dateDebut);
            }
            if ($request->filled('dateDebutFin')) {
                $query->whereDate('DateDebut', '<=', $request->dateDebutFin);
            }
            if ($request->filled('dateFinPrevueDebut')) {
                $query->whereDate('DateFinPrevue', '>=', $request->dateFinPrevueDebut);
            }
            if ($request->filled('dateFinPrevueFin')) {
                $query->whereDate('DateFinPrevue', '<=', $request->dateFinPrevueFin);
            }
            if ($request->filled('dateFinReelleDebut')) {
                $query->whereDate('DateFinReelle', '>=', $request->dateFinReelleDebut);
            }
            if ($request->filled('dateFinReelleFin')) {
                $query->whereDate('DateFinReelle', '<=', $request->dateFinReelleFin);
            }

            // Pagination
            $page = $request->input('page', 1);
            $perPage = $request->input('per_page', 10);
            $tickets = $query->orderBy('DateCreation', 'desc')
                           ->paginate($perPage, ['*'], 'page', $page);

            return response()->json([
                'filter_data' => $filterData, 
                'tickets' => $tickets
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des données de la liste des tickets: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erreur lors de la récupération des données',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function addComment(Request $request, $id)
    {
        try {
            // Vérifier si l'utilisateur est authentifié
            if (!auth()->check()) {
                Log::error('Tentative d\'ajout de commentaire sans authentification');
                return response()->json(['error' => 'Vous devez être connecté pour ajouter un commentaire'], 401);
            }

            $ticket = Ticket::findOrFail($id);
            $user = auth()->user();
            
            Log::info('Tentative d\'ajout de commentaire', [
                'user_id' => $user->id,
                'user_designation' => $user->designation,
                'ticket_id' => $id
            ]);

            $demandeur = \App\Models\Demandeur::where('designation', $user->designation)->first();
            
            if (!$demandeur) {
                Log::warning('Demandeur non trouvé pour l\'utilisateur', [
                    'user_id' => $user->id,
                    'user_designation' => $user->designation
                ]);
            }

            $validated = $request->validate([
                'content' => 'required|string'
            ]);

            $currentComment = $ticket->Commentaire ? $ticket->Commentaire . "\n\n" : "";
            $newComment = $currentComment . "[" . ($demandeur ? $demandeur->designation : $user->designation) . "|" . now()->format('d/m/Y H:i') . "]" . $validated['content'];

            $ticket->Commentaire = $newComment;
            $ticket->save();

            Log::info('Commentaire ajouté avec succès', [
                'ticket_id' => $id,
                'user_id' => $user->id
            ]);

            return response()->json([
                'message' => 'Commentaire ajouté avec succès',
                'ticket' => $ticket
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur lors de l\'ajout du commentaire', [
                'error' => $e->getMessage(),
                'ticket_id' => $id,
                'user_id' => auth()->id(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'error' => 'Erreur lors de l\'ajout du commentaire',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function updateComment(Request $request, $ticketId, $commentId)
    {
        try {
            // Vérifier si l'utilisateur est authentifié
            if (!auth()->check()) {
                Log::error('Tentative de modification de commentaire sans authentification');
                return response()->json(['error' => 'Vous devez être connecté pour modifier un commentaire'], 401);
            }

            $ticket = Ticket::with([
                'statut',
                'priorite',
                'categorie',
                'demandeur.service',
                'emplacement',
                'utilisateur',
                'executant'
            ])->findOrFail($ticketId);
            
            $user = auth()->user();
            $demandeur = \App\Models\Demandeur::where('designation', $user->designation)->first();
            $userDesignation = $demandeur ? $demandeur->designation : $user->designation;

            Log::info('Tentative de modification de commentaire', [
                'user_id' => $user->id,
                'user_designation' => $userDesignation,
                'ticket_id' => $ticketId,
                'comment_id' => $commentId
            ]);

            $validated = $request->validate([
                'content' => 'required|string'
            ]);

            // Récupérer tous les commentaires
            $comments = explode("\n\n", $ticket->Commentaire);
            $updatedComments = [];

            foreach ($comments as $comment) {
                if (empty(trim($comment))) continue;

                // Extraire le nom d'utilisateur, la date et le contenu
                if (preg_match('/\[(.*?)\|(.*?)\](.*)/s', $comment, $matches)) {
                    $userName = $matches[1];
                    $date = $matches[2];
                    $content = trim($matches[3]);

                    // Si c'est le commentaire à modifier et que l'utilisateur est l'auteur
                    if ($userName === $userDesignation && $commentId == md5($userName . $date . $content)) {
                        $updatedComments[] = "[$userDesignation|$date]" . $validated['content'];
                        Log::info('Commentaire modifié', [
                            'user' => $userDesignation,
                            'date' => $date
                        ]);
                    } else {
                        $updatedComments[] = $comment;
                    }
                }
            }

            // Mettre à jour le ticket avec les commentaires modifiés
            $ticket->Commentaire = implode("\n\n", $updatedComments);
            $ticket->save();

            // Formater les commentaires pour la réponse
            if ($ticket->Commentaire) {
                $comments = explode("\n\n", $ticket->Commentaire);
                $formattedComments = [];
                
                foreach ($comments as $comment) {
                    if (empty(trim($comment))) continue;
                    
                    if (preg_match('/\[(.*?)\|(.*?)\](.*)/s', $comment, $matches)) {
                        $userName = $matches[1];
                        $date = $matches[2];
                        $content = trim($matches[3]);
                        
                        $formattedComments[] = [
                            'user' => [
                                'designation' => $userName
                            ],
                            'date' => $date,
                            'content' => $content
                        ];
                    }
                }
                
                $ticket->formatted_comments = $formattedComments;
            }

            Log::info('Commentaire modifié avec succès', [
                'ticket_id' => $ticketId,
                'user_id' => $user->id
            ]);

            return response()->json([
                'message' => 'Commentaire modifié avec succès',
                'ticket' => $ticket
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la modification du commentaire', [
                'error' => $e->getMessage(),
                'ticket_id' => $ticketId,
                'user_id' => auth()->id(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'error' => 'Erreur lors de la modification du commentaire',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function pending(Request $request)
    {
        try {
            $tickets = Ticket::with([
                'statut',
                'priorite',
                'demandeur',
                'emplacement',
                'categorie',
                'executant'
            ]);

            if ($request->boolean('show_rejected')) {
                // Filtrer par la désignation du statut "Refusé"
                $tickets->whereHas('statut', function($q) {
                    $q->where('designation', 'Refusé');
                });
            } else {
                $tickets->where('Id_Statut', 1); // Statut "Nouveau"
            }

            $tickets = $tickets->orderBy('DateCreation', 'desc')
                             ->get();

            return response()->json($tickets);
        } catch (\Exception $e) {
            \Log::error('Error fetching pending tickets', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Erreur lors de la récupération des tickets en attente',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getNextRejectedTicket(Request $request)
    {
        try {
            $lastTicketId = $request->input('last_ticket_id');
            
            $query = Ticket::with([
                'statut',
                'priorite',
                'demandeur',
                'emplacement',
                'categorie',
                'reports',
                'executant'
            ])->whereHas('statut', function($q) {
                $q->where('designation', 'Refusé');
            });

            if ($lastTicketId) {
                $query->where('id', '<', $lastTicketId);
            }

            $ticket = $query->orderBy('id', 'desc')
                          ->first();

            if (!$ticket) {
                return response()->json(['message' => 'Aucun ticket refusé trouvé'], 404);
            }

            // Formater les commentaires
            if ($ticket->Commentaire) {
                $comments = explode("\n\n", $ticket->Commentaire);
                $formattedComments = [];
                foreach ($comments as $comment) {
                    if (empty(trim($comment))) continue;
                    if (preg_match('/\[(.*?)\|(.*?)\](.*)/s', $comment, $matches)) {
                        $userName = $matches[1];
                        $date = $matches[2];
                        $content = trim($matches[3]);
                        $formattedComments[] = [
                            'user' => [
                                'designation' => $userName
                            ],
                            'date' => $date,
                            'content' => $content
                        ];
                    }
                }
                $ticket->formatted_comments = $formattedComments;
            }

            return response()->json($ticket);
        } catch (\Exception $e) {
            \Log::error('Error fetching next rejected ticket', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Erreur lors de la récupération du ticket refusé',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function approve($id)
    {
        try {
            $request = request();
            Log::info('Approbation du ticket', [
                'ticket_id' => $id,
                'request_data' => $request->all()
            ]);

            $validated = $request->validate([
                'DateDebut' => 'required|date_format:Y-m-d',
                'DateFinPrevue' => [
                    'required',
                    'date_format:Y-m-d',
                    'after:DateDebut'
                ],
                'executantId' => 'required|integer|exists:T_EXECUTANT,id'
            ]);

            $ticket = Ticket::with(['statut', 'priorite', 'categorie'])->findOrFail($id);
            
            // Log détaillé du statut du ticket
            Log::info('Statut du ticket', [
                'ticket_id' => $id,
                'statut_id' => $ticket->Id_Statut,
                'statut_designation' => $ticket->statut->designation,
                'statut_object' => $ticket->statut->toArray()
            ]);
            
            // Vérifier si le ticket est en attente ou nouveau
            if (!in_array($ticket->statut->designation, ['En attente', 'Nouveau'])) {
                Log::warning('Statut invalide pour l\'approbation', [
                    'ticket_id' => $id,
                    'statut_actuel' => $ticket->statut->designation,
                    'statuts_acceptes' => ['En attente', 'Nouveau']
                ]);
                return response()->json([
                    'message' => 'Seuls les tickets en attente ou nouveaux peuvent être approuvés.'
                ], 400);
            }

            // Convertir les dates au format attendu par la base de données
            $dateDebut = Carbon::createFromFormat('Y-m-d', $validated['DateDebut'])->format('d/m/Y H:i:s');
            $dateFinPrevue = Carbon::createFromFormat('Y-m-d', $validated['DateFinPrevue'])->format('d/m/Y H:i:s');

            // Log des données avant la mise à jour
            Log::info('Données de mise à jour du ticket', [
                'ticket_id' => $id,
                'nouveau_statut' => 3,
                'date_debut' => $dateDebut,
                'date_fin_prevue' => $dateFinPrevue,
                'executant_id' => $validated['executantId']
            ]);

            // Mettre à jour le ticket
            $ticket->update([
                'Id_Statut' => 3, // En instance
                'DateDebut' => $dateDebut,
                'DateFinPrevue' => $dateFinPrevue,
                'Id_Executant' => $validated['executantId']
            ]);

            // Ajouter un commentaire automatique
            $user = auth()->user();
            $comment = "\n\n[{$user->designation}|" . date('d/m/Y H:i:s') . "]Ticket approuvé et assigné à l'exécutant.";
            $ticket->Commentaire = ($ticket->Commentaire ?? '') . $comment;
            $ticket->save();

            // Récupérer l'exécutant pour l'email
            $executant = \App\Models\Executant::find($validated['executantId']);
            
            // Envoyer l'email de notification
            if ($executant) {
                try {
                    // Récupérer l'utilisateur associé à l'exécutant
                    $utilisateur = \App\Models\Utilisateur::where('designation', $executant->designation)->first();
                    
                    if ($utilisateur && $utilisateur->email) {
                        Mail::to($utilisateur->email)->send(new TicketAssignedNotification($ticket, $executant));
                        Log::info('Email de notification envoyé à l\'exécutant', [
                            'executant_id' => $executant->id,
                            'utilisateur_email' => $utilisateur->email
                        ]);
                    } else {
                        Log::warning('Email non trouvé pour l\'exécutant', [
                            'executant_id' => $executant->id,
                            'executant_designation' => $executant->designation
                        ]);
                    }
                } catch (\Exception $e) {
                    Log::error('Erreur lors de l\'envoi de l\'email de notification', [
                        'error' => $e->getMessage(),
                        'executant_id' => $executant->id
                    ]);
                }
            }

            Log::info('Ticket approuvé avec succès', [
                'ticket_id' => $id,
                'executant_id' => $validated['executantId']
            ]);

            return response()->json([
                'message' => 'Ticket approuvé avec succès',
                'ticket' => $ticket
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Erreur de validation lors de l\'approbation du ticket', [
                'errors' => $e->errors(),
                'ticket_id' => $id
            ]);
            return response()->json([
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erreur lors de l\'approbation du ticket', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'ticket_id' => $id
            ]);
            return response()->json([
                'message' => 'Erreur lors de l\'approbation du ticket',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function reject(Request $request, $id)
    {
        try {
            $request->validate([
                'raison' => 'required|string'
            ]);

            $ticket = Ticket::findOrFail($id);
            $refuseId = \App\Models\Statut::where('designation', 'Refusé')->value('id');
            $ticket->Id_Statut = $refuseId; // Statut "Refusé"
            $ticket->save();

            // Créer un report pour le refus
            TicketReport::create([
                'Id_Ticket' => $ticket->id,
                'Id_Responsable' => auth()->id(),
                'Raison' => $request->raison,
                'type' => 'rejet',
                'is_viewed' => false
            ]);

            return response()->json([
                'message' => 'Ticket refusé avec succès',
                'ticket' => $ticket
            ]);
        } catch (\Exception $e) {
            Log::error('Error rejecting ticket', [
                'error' => $e->getMessage(),
                'ticket_id' => $id
            ]);
            return response()->json([
                'message' => 'Erreur lors du refus du ticket',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function completed()
    {
        try {
            $user = auth()->user();
            $demandeur = \App\Models\Demandeur::where('designation', $user->designation)->first();

            if (!$demandeur) {
                return response()->json([
                    'message' => 'Demandeur non trouvé'
                ], 404);
            }

            $tickets = Ticket::with([
                'statut',
                'priorite',
                'demandeur',
                'emplacement',
                'categorie',
                'executant'
            ])
            ->where('Id_Demandeur', $demandeur->id)
            ->whereHas('statut', function($q) {
                $q->where('designation', 'Terminé');
            })
            ->orderBy('DateCreation', 'desc')
            ->get();

            return response()->json($tickets);
        } catch (\Exception $e) {
            Log::error('Error fetching completed tickets', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Erreur lors de la récupération des tickets terminés',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function demandeurApprove($id)
    {
        try {
            $ticket = Ticket::findOrFail($id);
            $user = auth()->user();
            $demandeur = \App\Models\Demandeur::where('designation', $user->designation)->first();

            // Vérifier que l'utilisateur est bien le demandeur du ticket
            if ($ticket->Id_Demandeur !== $demandeur->id) {
                return response()->json([
                    'message' => 'Vous n\'êtes pas autorisé à approuver ce ticket'
                ], 403);
            }

            // Vérifier que le ticket est bien en statut "Terminé"
            if ($ticket->statut->designation !== 'Terminé') {
                return response()->json([
                    'message' => 'Seuls les tickets terminés peuvent être approuvés'
                ], 400);
            }

            // Mettre à jour le statut du ticket
            $statutCloture = Statut::where('designation', 'Clôturé')->first();
            $ticket->Id_Statut = $statutCloture->id;
            $ticket->DateFinReelle = date('d/m/Y H:i:s');
            $ticket->save();

            return response()->json([
                'message' => 'Ticket approuvé avec succès',
                'ticket' => $ticket
            ]);
        } catch (\Exception $e) {
            Log::error('Error approving ticket by demandeur', [
                'error' => $e->getMessage(),
                'ticket_id' => $id
            ]);
            return response()->json([
                'message' => 'Erreur lors de l\'approbation du ticket',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function demandeurReject($id)
    {
        try {
            Log::info('Début du rejet du ticket par le demandeur', ['ticket_id' => $id]);
            
            $request = request();
            $request->validate([
                'raison' => 'required|string'
            ]);
            
            $ticket = Ticket::with(['statut'])->findOrFail($id);
            Log::info('Ticket trouvé', ['ticket' => $ticket->toArray()]);
            
            $user = auth()->user();
            Log::info('Utilisateur connecté', ['user' => $user->toArray()]);
            
            $demandeur = \App\Models\Demandeur::where('designation', $user->designation)->first();
            Log::info('Demandeur trouvé', ['demandeur' => $demandeur ? $demandeur->toArray() : null]);

            if (!$demandeur) {
                Log::error('Demandeur non trouvé pour l\'utilisateur', ['user' => $user->toArray()]);
                return response()->json([
                    'message' => 'Demandeur non trouvé'
                ], 404);
            }

            // Vérifier que l'utilisateur est bien le demandeur du ticket
            if ($ticket->Id_Demandeur !== $demandeur->id) {
                Log::warning('Tentative de rejet non autorisée', [
                    'ticket_demandeur_id' => $ticket->Id_Demandeur,
                    'user_demandeur_id' => $demandeur->id
                ]);
                return response()->json([
                    'message' => 'Vous n\'êtes pas autorisé à refuser ce ticket'
                ], 403);
            }

            // Vérifier que le ticket est bien en statut "Terminé"
            if ($ticket->statut->designation !== 'Terminé') {
                Log::warning('Tentative de rejet d\'un ticket non terminé', [
                    'ticket_statut' => $ticket->statut->designation
                ]);
                return response()->json([
                    'message' => 'Seuls les tickets terminés peuvent être refusés'
                ], 400);
            }

            // Mettre à jour le statut du ticket
            $statutEnCours = Statut::where('designation', 'En cours')->first();
            if (!$statutEnCours) {
                throw new \Exception('Statut "En cours" non trouvé dans la base de données');
            }
            
            $ticket->Id_Statut = $statutEnCours->id;
            $ticket->save();

            // Créer un report de type "rejet" pour garder l'historique du refus
            \App\Models\TicketReport::create([
                'Id_Ticket' => $ticket->id,
                'Id_Responsable' => $user->id,
                'Raison' => $request->raison,
                'type' => 'rejet',
                'is_viewed' => false
            ]);

            return response()->json([
                'message' => 'Ticket remis en cours',
                'ticket' => $ticket->load(['statut'])
            ]);

        } catch (\Exception $e) {
            Log::error('Error rejecting ticket by demandeur', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'ticket_id' => $id
            ]);
            return response()->json([
                'message' => 'Erreur lors du refus du ticket',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function countPending()
    {
        try {
            $count = Ticket::where('Id_Statut', 1)->count();
            return response()->json(['count' => $count]);
        } catch (\Exception $e) {
            Log::error('Erreur lors du comptage des tickets en attente', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Une erreur est survenue lors du comptage des tickets'
            ], 500);
        }
    }

    public function countCompleted()
    {
        try {
            $user = auth()->user();
            $demandeur = \App\Models\Demandeur::where('designation', $user->designation)->first();

            if (!$demandeur) {
                return response()->json(['count' => 0]);
            }

            $count = Ticket::where('Id_Demandeur', $demandeur->id)
                ->whereHas('statut', function($q) {
                    $q->where('designation', 'Terminé');
                })
                ->whereDoesntHave('reports', function($q) {
                    $q->whereIn('type', ['approbation', 'rejet']);
                })
                ->count();

            return response()->json(['count' => $count]);
        } catch (\Exception $e) {
            Log::error('Erreur lors du comptage des tickets terminés', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Une erreur est survenue lors du comptage des tickets terminés'
            ], 500);
        }
    }
} 
