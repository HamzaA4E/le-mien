<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\Demandeur;
use App\Models\Societe;
use App\Models\Emplacement;
use App\Models\Priorite;
use App\Models\Categorie;
use App\Models\TypeDemande;
use App\Models\Statut;
use App\Models\Utilisateur;
use App\Models\Executant;
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
                'typeDemande',
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
            $perPage = $request->input('per_page', 20);
            $tickets = $query->paginate($perPage);

        return response()->json($tickets);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des tickets: ' . $e->getMessage());
            return response()->json(['error' => 'Erreur lors de la récupération des tickets'], 500);
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
                'id_demandeur' => 'required|exists:T_DEMDEUR,id',
                'id_utilisateur' => 'required|exists:T_UTILISAT,id',
                'id_societe' => 'required|exists:T_SOCIETE,id',
                'id_emplacement' => 'required|exists:T_EMPLACEMENT,id',
                'id_priorite' => 'required|exists:T_PRIORITE,id',
                'id_categorie' => 'required|exists:T_CATEGORIE,id',
                'id_type_demande' => 'required|exists:T_TYPEDEMANDE,id',
                'id_statut' => 'required|exists:T_STATUT,id',
                'id_executant' => 'required|exists:T_EXECUTANT,id',
            ]);

            Log::info('Données validées:', $validated);

            DB::beginTransaction();

            try {
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
                        //Stockage de la pièce jointe (public/attachments)
                        $attachmentPath = $file->store('attachments', 'public');
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
                    'Id_TypeDemande' => (int)$validated['id_type_demande'],
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
                'typeDemande',
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
                'Id_Demandeur' => 'sometimes|exists:T_DEMDEUR,id',
                'Id_Societe' => 'sometimes|exists:T_SOCIETE,id',
                'Id_Emplacement' => 'sometimes|exists:T_EMPLACEMENT,id',
                'Id_Categorie' => 'sometimes|exists:T_CATEGORIE,id',
                'Id_TypeDemande' => 'sometimes|exists:T_TYPEDEMANDE,id',
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
                    $attachmentPath = $file->store('attachments', 'public');
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
                $ticket = Ticket::with(['statut', 'priorite', 'demandeur', 'societe', 'emplacement', 'categorie', 'typeDemande', 'executant'])->find($ticket->id);
                
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
        $ticket->delete();
        return response()->json(null, 204);
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

            // Charger les autres options
            $tables = [
                'demandeurs' => Demandeur::class,
                'societes' => Societe::class,
                'emplacements' => Emplacement::class,
                'priorites' => Priorite::class,
                'categories' => Categorie::class,
                'typesDemande' => TypeDemande::class
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

            return response()->json([
                'options' => $options,
                'errors' => $errors,
                'hasErrors' => !empty($errors)
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des options: ' . $e->getMessage());
            
            $emptyOptions = array_fill_keys([
                'demandeurs', 'societes', 'emplacements', 'priorites', 
                'categories', 'typesDemande', 'statuts'
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
                $statsParStatut[] = [
                    'id' => $statut->id,
                    'designation' => $statut->designation,
                    'total' => Ticket::where('Id_Statut', $statut->id)->count()
                ];
            }

            $stats = [
                'total' => Ticket::count(),
                'par_statut' => $statsParStatut,
                //Récupérer les statistiques par priorité
                'par_priorite' => Priorite::where('is_active', true)
                    ->get()
                    ->map(function($priorite) {
                        return [
                            'priorite' => $priorite->designation,
                            'total' => $priorite->tickets()->count()
                        ];
                    }),
                //Récupérer les statistiques par catégorie
                'par_categorie' => Categorie::where('is_active', true)
                    ->get()
                    ->map(function($categorie) {
                        return [
                            'categorie' => $categorie->designation,
                            'total' => $categorie->tickets()->count()
                        ];
                    }),
                //Récupérer les statistiques par demandeur
                'par_demandeur' => Demandeur::where('is_active', true)
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
        return \App\Models\Ticket::with(['statut', 'priorite', 'demandeur', 'societe', 'emplacement', 'categorie', 'typeDemande', 'executant'])
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
                'types_demande' => TypeDemande::where('is_active', true)->get()
            ];

            // Construire la requête pour les tickets
            $query = Ticket::with([
                'statut',
                'priorite',
                'demandeur',
                'societe',
                'emplacement',
                'categorie',
                'typeDemande',
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
            if ($request->filled('type_demande')) {
                $query->whereHas('typeDemande', function($q) use ($request) {
                    $q->where('designation', $request->type_demande);
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
            $perPage = $request->input('per_page', 2);
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
} 
