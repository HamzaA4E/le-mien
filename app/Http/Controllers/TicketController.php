<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\Demandeur;
use App\Models\Societe;
use App\Models\Emplacement;
use App\Models\Priorite;
use App\Models\Categorie;
use App\Models\Statut;
use App\Models\Utilisateur;
use App\Models\Executant;
use App\Models\TicketReport;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TicketController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Ticket::with([
                'statut',
                'priorite',
                'demandeur',
                'societe',
                'emplacement',
                'categorie',
                'executant',
                'reports'
            ]);

            // Restriction pour les demandeurs : ils ne voient que leurs tickets
            $user = auth()->user();
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
            if ($request->filled('societe')) {
                $query->where('Id_Societe', $request->societe);
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
            if ($request->filled('executant')) {
                $query->where('Id_Executant', $request->executant);
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

            // Tri par date de création décroissante
            $query->orderBy('DateCreation', 'desc');

            // Pagination
            $page = $request->input('page', 1);
            $perPage = $request->input('per_page', 10);
            $tickets = $query->paginate($perPage, ['*'], 'page', $page);

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
                'date_debut' => 'required|date',
                'date_fin_prevue' => [
                    'required',
                    'date',
                    function ($attribute, $value, $fail) use ($request) {
                        if (strtotime($value) < strtotime($request->date_debut)) {
                            $fail('La date de fin prévue ne peut pas être antérieure à la date de début.');
                        }
                    },
                ],
                'date_fin_reelle' => 'nullable|date',
                'id_demandeur' => 'required|exists:T_UTILISAT,id',
                'id_utilisateur' => 'required|exists:T_UTILISAT,id',
                'id_societe' => 'required|exists:T_SOCIETE,id',
                'id_emplacement' => 'required|exists:T_EMPLACEMENT,id',
                'id_priorite' => 'required|exists:T_PRIORITE,id',
                'id_categorie' => 'required|exists:T_CATEGORIE,id',
                'id_statut' => 'required|exists:T_STATUT,id',
                'id_executant' => 'required|exists:T_EXECUTANT,id',
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
                        'statut' => 1,
                        'is_active' => true
                    ]);
                    Log::info('Nouveau demandeur créé:', ['id' => $demandeur->id, 'designation' => $demandeur->designation]);
                }

                // Mettre à jour l'id_demandeur avec l'ID du demandeur
                $validated['id_demandeur'] = $demandeur->id;

                Log::info('Valeurs brutes des dates:', [
                    'date_debut' => $validated['date_debut'],
                    'date_fin_prevue' => $validated['date_fin_prevue'],
                    'date_fin_reelle' => $validated['date_fin_reelle']
                ]);
                // Convertir les dates en format SQL Server
                $dateDebut = date('d/m/Y H:i:s', strtotime($validated['date_debut']));
                $dateFinPrevue = date('d/m/Y H:i:s', strtotime($validated['date_fin_prevue']));
                $dateFinReelle = $validated['date_fin_reelle'] ? date('d/m/Y H:i:s', strtotime($validated['date_fin_reelle'])) : null;
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
                    'Id_Societe' => (int)$validated['id_societe'],
                    'Id_Emplacement' => (int)$validated['id_emplacement'],
                    'Id_Categorie' => (int)$validated['id_categorie'],
                    'Id_Utilisat' => (int)$validated['id_utilisateur'],
                    'Id_Executant' => (int)$validated['id_executant'],
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
                'demandeur',
                'societe',
                'emplacement',
                'executant',
                'reports.responsable',
                'utilisateur'
            ])->findOrFail($id);

            // Si le ticket a des commentaires, récupérer les informations des utilisateurs
            if ($ticket->Commentaire) {
                $comments = explode("\n\n", $ticket->Commentaire);
                $formattedComments = [];
                
                foreach ($comments as $comment) {
                    if (empty(trim($comment))) continue;
                    
                    // Utiliser une regex qui préserve les sauts de ligne dans le contenu
                    if (preg_match('/\[(.*?)\|(.*?)\](.*)/s', $comment, $matches)) {
                        $userId = $matches[1];
                        $date = $matches[2];
                        $content = trim($matches[3]);
                        
                        // Récupérer l'utilisateur
                        $user = Utilisateur::find($userId);
                        
                        $formattedComments[] = [
                            'user' => $user ? [
                                'id' => $user->id,
                                'designation' => $user->designation
                            ] : null,
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
                'Id_Societe' => 'sometimes|exists:T_SOCIETE,id',
                'Id_Emplacement' => 'sometimes|exists:T_EMPLACEMENT,id',
                'Id_Categorie' => 'sometimes|exists:T_CATEGORIE,id',
                'Id_Executant' => 'sometimes|exists:T_EXECUTANT,id',
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
                DB::commit();
                
                Log::info('Ticket mis à jour avec succès', [
                    'ticket_id' => $ticket->id,
                    'nouveau_statut' => $ticket->Id_Statut
                ]);

                // Recharger le ticket avec ses relations
                $ticket = Ticket::with(['statut', 'priorite', 'demandeur', 'societe', 'emplacement', 'categorie', 'executant'])->find($ticket->id);
                
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
            if (auth()->id() !== $ticket->Id_Demandeur) {
                return response()->json([
                    'message' => 'Vous n\'êtes pas autorisé à supprimer ce ticket'
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
        try {
            Log::info('Début de la récupération des options');

            $options = [];
            $errors = [];

            // Charger les statuts
            try {
                $statuts = Statut::where('is_active', true)->get();
                $options['statuts'] = $statuts;
            } catch (\Exception $e) {
                Log::error("Erreur lors de la récupération des statuts: " . $e->getMessage());
                $errors['statuts'] = $e->getMessage();
                $options['statuts'] = collect([]);
            }

            // Charger les autres options avec les bonnes clés
            $tables = [
                'categories' => Categorie::class,
                'emplacements' => Emplacement::class,
                'priorites' => Priorite::class,
                'demandeurs' => Demandeur::class,
                'societes' => Societe::class
            ];

            foreach ($tables as $key => $model) {
                try {
                    if ($key === 'demandeurs') {
                        $options[$key] = $model::where('is_active', true)->with('service')->get();
                    } else {
                        $options[$key] = $model::where('is_active', true)->get();
                    }
                } catch (\Exception $e) {
                    Log::error("Erreur lors de la récupération des {$key}: " . $e->getMessage());
                    $errors[$key] = $e->getMessage();
                    $options[$key] = collect([]);
                }
            }

            // Ajout des exécutants
            $options['executants'] = \App\Models\Executant::where('is_active', true)->get();

            // Vérifier que toutes les options requises sont présentes
            $requiredOptions = ['categories', 'emplacements', 'priorites'];
            $missingOptions = array_filter($requiredOptions, function($option) use ($options) {
                return empty($options[$option]);
            });

            if (!empty($missingOptions)) {
                Log::error('Options manquantes:', ['missing' => $missingOptions]);
                $errors['missing_options'] = 'Options manquantes: ' . implode(', ', $missingOptions);
            }

            return response()->json([
                'options' => $options,
                'errors' => $errors,
                'hasErrors' => !empty($errors)
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des options: ' . $e->getMessage());
            
            $emptyOptions = array_fill_keys([
                'categories', 'emplacements', 'priorites', 
                'demandeurs', 'societes', 'statuts', 'executants'
            ], collect([]));
            
            return response()->json([
                'options' => $emptyOptions,
                'errors' => ['general' => $e->getMessage()],
                'hasErrors' => true
            ], 200);
        }
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
        return \App\Models\Ticket::with(['statut', 'priorite', 'demandeur', 'societe', 'emplacement', 'categorie', 'executant'])
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
                'societes' => Societe::where('is_active', true)->get(),
                'emplacements' => Emplacement::where('is_active', true)->get(),
                'statuts' => Statut::where('is_active', true)->get(),
                'priorites' => Priorite::where('is_active', true)->get(),
                'executants' => Executant::where('is_active', true)->get(),
            ];

            // Construire la requête pour les tickets
            $query = Ticket::with([
                'statut',
                'priorite',
                'demandeur',
                'societe',
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
            if ($request->filled('societe')) {
                $query->where('Id_Societe', $request->societe);
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
            if ($request->filled('executant')) {
                $query->where('Id_Executant', $request->executant);
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
            $ticket = Ticket::findOrFail($id);
            $user = auth()->user();

            $validated = $request->validate([
                'content' => 'required|string'
            ]);

            $currentComment = $ticket->Commentaire ? $ticket->Commentaire . "\n\n" : "";
            $newComment = $currentComment . "[" . $user->id . "|" . now()->format('d/m/Y H:i') . "]" . $validated['content'];

            $ticket->Commentaire = $newComment;
            $ticket->save();

            return response()->json([
                'message' => 'Commentaire ajouté avec succès',
                'ticket' => $ticket
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur lors de l\'ajout du commentaire: ' . $e->getMessage());
            return response()->json(['error' => 'Erreur lors de l\'ajout du commentaire'], 500);
        }
    }

    public function updateComment(Request $request, $ticketId, $commentId)
    {
        try {
            $ticket = Ticket::findOrFail($ticketId);
            $user = auth()->user();

            $validated = $request->validate([
                'content' => 'required|string'
            ]);

            // Récupérer tous les commentaires
            $comments = explode("\n\n", $ticket->Commentaire);
            $updatedComments = [];

            foreach ($comments as $comment) {
                if (empty(trim($comment))) continue;

                // Extraire l'ID utilisateur, la date et le contenu
                if (preg_match('/\[(.*?)\|(.*?)\](.*)/s', $comment, $matches)) {
                    $userId = $matches[1];
                    $date = $matches[2];
                    $content = trim($matches[3]);

                    // Si c'est le commentaire à modifier et que l'utilisateur est l'auteur
                    if ($userId == $user->id && $commentId == md5($userId . $date . $content)) {
                        $updatedComments[] = "[$userId|$date]" . $validated['content'];
                    } else {
                        $updatedComments[] = $comment;
                    }
                }
            }

            // Mettre à jour le ticket avec les commentaires modifiés
            $ticket->Commentaire = implode("\n\n", $updatedComments);
            $ticket->save();

            return response()->json([
                'message' => 'Commentaire modifié avec succès',
                'ticket' => $ticket
            ]);
        } catch (\Exception $e) {
            \Log::error('Erreur lors de la modification du commentaire: ' . $e->getMessage());
            return response()->json(['error' => 'Erreur lors de la modification du commentaire'], 500);
        }
    }

    public function pending(Request $request)
    {
        try {
            $tickets = Ticket::with([
                'statut',
                'priorite',
                'demandeur',
                'societe',
                'emplacement',
                'categorie',
                'executant'
            ]);

            if ($request->boolean('show_rejected')) {
                $tickets->where('Id_Statut', 4); // Statut "Refusé"
            } else {
                $tickets->where('Id_Statut', 1); // Statut "Nouveau"
            }

            $tickets = $tickets->orderBy('DateCreation', 'desc')
                             ->get();

            return response()->json($tickets);
        } catch (\Exception $e) {
            Log::error('Error fetching pending tickets', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Erreur lors de la récupération des tickets en attente',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function approve($id)
    {
        try {
            $ticket = Ticket::findOrFail($id);
            $ticket->Id_Statut = 2; // Statut "En instance"
            $ticket->save();

            return response()->json([
                'message' => 'Ticket approuvé avec succès',
                'ticket' => $ticket
            ]);
        } catch (\Exception $e) {
            Log::error('Error approving ticket', [
                'error' => $e->getMessage(),
                'ticket_id' => $id
            ]);
            return response()->json([
                'message' => 'Erreur lors de l\'approbation du ticket',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function reject($id)
    {
        try {
            $ticket = Ticket::findOrFail($id);
            $refuseId = \App\Models\Statut::where('designation', 'Refusé')->value('id');
            $ticket->Id_Statut = $refuseId; // Statut "Refusé"
            $ticket->save();

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
                'societe',
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
} 
