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
use App\Mail\TicketCompletedNotification;
use App\Mail\TicketApprovedNotification;
use App\Mail\TicketRejectedNotification;
use App\Models\Executant;
use Illuminate\Support\Facades\Cache;

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
                'executant',
                'typeDemande'
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
                if (is_numeric($request->statut)) {
                    $query->where('Id_Statut', $request->statut);
                } else {
                    $query->whereHas('statut', function($q) use ($request) {
                        $q->where('designation', $request->statut);
                    });
                }
            }
            if ($request->filled('priorite')) {
                $query->where('Id_Priorite', $request->priorite);
            }
            if ($request->filled('type_demande')) {
                if (is_numeric($request->type_demande)) {
                    $query->where('Id_TypeDemande', $request->type_demande);
                } else {
                    $query->whereHas('typeDemande', function($q) use ($request) {
                        $q->where('designation', $request->type_demande);
                    });
                }
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

            // Validation des données simplifiée pour le demandeur
            try {
                $validated = $request->validate([
                    'titre' => 'required|string|max:255',
                    'description' => 'required|string',
                    'attachments' => 'nullable',
                    'attachments.*' => 'file|max:10240', // max 10MB par fichier
                    'id_demandeur' => 'required|exists:T_UTILISAT,id',
                    'id_utilisateur' => 'required|exists:T_UTILISAT,id',
                ]);
                Log::info('Validation réussie:', $validated);
            } catch (\Illuminate\Validation\ValidationException $e) {
                Log::error('Erreur de validation:', [
                    'errors' => $e->errors(),
                    'request_data' => $request->all()
                ]);
                throw $e;
            }

            DB::beginTransaction();

            try {
                // Récupérer l'utilisateur
                $utilisateur = Utilisateur::find($validated['id_demandeur']);
                Log::info('Utilisateur trouvé:', ['utilisateur' => $utilisateur ? $utilisateur->toArray() : null]);
                
                if (!$utilisateur) {
                    throw new \Exception('Utilisateur non trouvé');
                }

                // Vérifier si un demandeur existe déjà avec cette désignation
                $demandeur = Demandeur::where('designation', $utilisateur->designation)->first();
                Log::info('Demandeur existant:', ['demandeur' => $demandeur ? $demandeur->toArray() : null]);
                
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
                Log::info('ID demandeur mis à jour:', ['id_demandeur' => $validated['id_demandeur']]);

                // Récupérer le statut "Nouveau"
                $statutNouveau = \App\Models\Statut::where('designation', 'Nouveau')->first();
                if (!$statutNouveau) {
                    throw new \Exception('Statut "Nouveau" non trouvé dans la base de données');
                }

                // Gestion des pièces jointes
                $attachmentPaths = [];
                $attachmentPathValue = null;

                if ($request->hasFile('attachments')) {
                    foreach ($request->file('attachments') as $file) {
                        $path = $file->store('attachments');
                        $attachmentPaths[] = $path;
                    }
                    $attachmentPathValue = implode(',', $attachmentPaths);
                    Log::info('Pièces jointes traitées:', ['paths' => $attachmentPaths]);
                }

                // Préparer les données pour la création du ticket
                $data = [
                    'Titre' => $validated['titre'],
                    'Description' => $validated['description'],
                    'Commentaire' => null,
                    'attachment_path' => $attachmentPathValue,
                    'Id_Priorite' => null, // Sera défini par l'admin
                    'Id_Statut' => $statutNouveau->id, // Statut "Nouveau"
                    'Id_Demandeur' => (int)$validated['id_demandeur'],
                    'Id_Emplacement' => null, // Sera défini par l'admin après validation
                    'Id_Categorie' => null, // Sera défini par l'admin après validation
                    'Id_Utilisat' => (int)$validated['id_utilisateur'],
                    'Id_Executant' => null, // Sera défini par l'admin
                    'Id_TypeDemande' => null, // Sera défini par l'admin
                    'DateDebut' => null, // Sera défini par l'admin
                    'DateFinPrevue' => null, // Sera défini par l'admin
                    'DateFinReelle' => null,
                    'DateCreation' => now()
                ];

                Log::info('Données préparées pour la création du ticket:', $data);

                // Créer le ticket
                $ticket = Ticket::create($data);
                Log::info('Ticket créé avec succès:', ['ticket_id' => $ticket->id]);

                // Invalider le cache des compteurs
                $this->invalidateCountersCache();

                DB::commit();

                return response()->json([
                    'message' => 'Ticket créé avec succès. Il sera examiné par l\'administrateur.',
                    'ticket' => $ticket
                ], 201);

            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('Erreur lors de la création du ticket:', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('Erreur globale lors de la création du ticket:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
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

            // Add logging to inspect the executant data
            Log::info('Ticket fetched with executant relationship', [
                'ticket_id' => $ticket->id,
                'Id_Executant' => $ticket->Id_Executant,
                'executant_data' => $ticket->executant
            ]);

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
                'DateDebut' => 'sometimes|date_format:Y-m-d',
                'DateFinPrevue' => [
                    'sometimes',
                    'date_format:Y-m-d',
                    function ($attribute, $value, $fail) use ($request) {
                        if ($request->has('DateDebut')) {
                            $dateDebut = \DateTime::createFromFormat('Y-m-d', $request->DateDebut);
                            $dateFinPrevue = \DateTime::createFromFormat('Y-m-d', $value);
                            if ($dateDebut && $dateFinPrevue && $dateFinPrevue < $dateDebut) {
                                $fail('La date de fin prévue ne peut pas être antérieure à la date de début.');
                            }
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
                // if (isset($data['Id_Statut'])) {
                //     $statutAutorises = \App\Models\Statut::whereIn('designation', ['En cours', 'Terminé'])->pluck('id')->toArray();
                //     if (!in_array($data['Id_Statut'], $statutAutorises)) {
                //         return response()->json([
                //             'message' => 'Vous ne pouvez changer le statut que vers "En cours" ou "Terminé"'
                //         ], 403);
                //     }
                // }
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
                    $data['DateFinReelle'] = date('Y-m-d H:i:s');
                }
            }

            Log::info('Données finales pour update:', $data);

            // Mise à jour du ticket
            DB::beginTransaction();
            try {
                $ticket->update($data);
                Log::info('Ticket mis à jour avec succès:', ['ticket_id' => $ticket->id]);

                // Invalider le cache des compteurs
                $this->invalidateCountersCache();

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
            Log::info('Ticket supprimé avec succès:', ['ticket_id' => $ticket->id]);

            // Invalider le cache des compteurs
            $this->invalidateCountersCache();

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
            $demandeurs = Demandeur::where('is_active', true)->orderBy('designation')->get(['id', 'designation', 'is_active', 'id_service']);
            $emplacements = Emplacement::where('is_active', true)->orderBy('designation')->get(['id', 'designation', 'is_active']);
            $priorites = Priorite::where('is_active', true)->orderBy('designation')->get(['id', 'designation', 'is_active']);
            $categories = Categorie::where('is_active', true)->orderBy('designation')->get(['id', 'designation', 'is_active']);
            $statuts = Statut::where('is_active', true)->orderBy('designation')->get(['id', 'designation', 'is_active']);
            $typeDemandes = \App\Models\TypeDemande::where('is_active', true)->orderBy('designation')->get(['id', 'designation', 'is_active']);
            // Fetch executants from the Executant model
            $executants = Executant::where('is_active', true)
                                     ->orderBy('designation')
                                     ->get(['id', 'designation', 'is_active']);

            return response()->json([
                'options' => [
                    'demandeurs' => $demandeurs,
                    'emplacements' => $emplacements,
                    'priorites' => $priorites,
                    'categories' => $categories,
                    'statuts' => $statuts,
                    'typeDemandes' => $typeDemandes,
                    'executants' => $executants,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching ticket options', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Erreur lors de la récupération des options de ticket',
                'error' => $e->getMessage()
            ], 500);
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
        return \App\Models\Ticket::with(['statut', 'priorite', 'demandeur', 'emplacement', 'categorie', 'executant'])
            ->finPrevueDans24hNonCloture()
            ->get();
    }

    // Nouvelle méthode pour regrouper tous les compteurs
    public function getCounters()
    {
        try {
            $user = auth()->user();
            $cacheKey = "ticket_counters_{$user->id}";
            
            // Vérifier le cache (durée de 2 minutes)
            if (Cache::has($cacheKey)) {
                return response()->json(Cache::get($cacheKey));
            }

            $counters = [];

            // Compteur de tickets en attente
            $pendingQuery = Ticket::whereHas('statut', function($q) {
                $q->where('designation', 'Nouveau');
            });
            
            // Compteur de tickets terminés
            $completedQuery = Ticket::whereHas('statut', function($q) {
                $q->where('designation', 'Terminé');
            });

            // Appliquer les filtres selon le type d'utilisateur
            if ($user->isDemandeur()) {
                $demandeur = Demandeur::where('designation', $user->designation)->first();
                if ($demandeur) {
                    $pendingQuery->where('Id_Demandeur', $demandeur->id);
                    $completedQuery->where('Id_Demandeur', $demandeur->id);
                }
            } elseif ($user->isDirecteurDepartement()) {
                $demandeurIds = Demandeur::where('id_service', $user->id_service)->pluck('id');
                $pendingQuery->whereIn('Id_Demandeur', $demandeurIds);
                $completedQuery->whereIn('Id_Demandeur', $demandeurIds);
            } elseif ($user->isExecutant()) {
                $executant = Executant::where('designation', $user->designation)->first();
                if ($executant) {
                    $pendingQuery->where('Id_Executant', $executant->id);
                    $completedQuery->where('Id_Executant', $executant->id);
                }
            }

            $counters['pending'] = $pendingQuery->count();
            $counters['completed'] = $completedQuery->count();

            // Mettre en cache pour 2 minutes
            Cache::put($cacheKey, $counters, 120);

            return response()->json($counters);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des compteurs', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Erreur lors de la récupération des compteurs',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Méthode pour invalider le cache des compteurs
    private function invalidateCountersCache()
    {
        $user = auth()->user();
        $cacheKey = "ticket_counters_{$user->id}";
        Cache::forget($cacheKey);
    }

    //Téléchargement de la pièce jointe
    public function downloadAttachment($id, $index = 0)
    {
        try {
            $ticket = Ticket::findOrFail($id);

            if (!$ticket->attachment_path) {
                return response()->json(['message' => 'Aucune pièce jointe trouvée'], 404);
            }

            // Gérer le cas où attachment_path est une chaîne JSON
            $paths = [];
            try {
                $paths = json_decode($ticket->attachment_path, true);
                if (!is_array($paths)) {
                    $paths = [[
                        'path' => $ticket->attachment_path,
                        'name' => basename($ticket->attachment_path)
                    ]];
                }
            } catch (\Exception $e) {
                $paths = [[
                    'path' => $ticket->attachment_path,
                    'name' => basename($ticket->attachment_path)
                ]];
            }

            if (!isset($paths[$index])) {
                return response()->json(['message' => 'Pièce jointe non trouvée'], 404);
            }

            $path = storage_path('app/public/' . $paths[$index]['path']);
            $filename = $paths[$index]['name'];

            if (!file_exists($path)) {
                \Log::error('Fichier non trouvé', [
                    'path' => $path,
                    'ticket_id' => $id,
                    'index' => $index
                ]);
                return response()->json(['message' => 'Le fichier n\'existe plus'], 404);
            }

            $mimeType = mime_content_type($path) ?: 'application/octet-stream';

            return response()->download($path, $filename, [
                'Content-Type' => $mimeType,
                'Content-Disposition' => 'attachment; filename="'.$filename.'"',
                'Cache-Control' => 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0',
                'Pragma' => 'no-cache'
            ]);

        } catch (\Exception $e) {
            \Log::error('Erreur téléchargement fichier', [
                'error' => $e->getMessage(),
                'ticket_id' => $id,
                'index' => $index,
                'path' => $path ?? null
            ]);
            return response()->json(['message' => 'Erreur lors du téléchargement'], 500);
        }
    }

    public function uploadAttachment(Request $request, $id)
    {
        try {
            $ticket = Ticket::findOrFail($id);
            
            // Validation du fichier
            $request->validate([
                'attachment' => 'required|file|max:10240', // max 10MB
            ]);

            if ($request->hasFile('attachment')) {
                $file = $request->file('attachment');
                $originalName = $file->getClientOriginalName();
                $path = $file->store('attachments', 'public');
                
                // Récupérer les pièces jointes existantes
                $existingAttachments = [];
                if ($ticket->attachment_path) {
                    try {
                        $existingAttachments = json_decode($ticket->attachment_path, true);
                        if (!is_array($existingAttachments)) {
                            $existingAttachments = [[
                                'path' => $ticket->attachment_path,
                                'name' => basename($ticket->attachment_path)
                            ]];
                        }
                    } catch (\Exception $e) {
                        $existingAttachments = [[
                            'path' => $ticket->attachment_path,
                            'name' => basename($ticket->attachment_path)
                        ]];
                    }
                }
                
                // Ajouter la nouvelle pièce jointe avec son nom original
                $existingAttachments[] = [
                    'path' => $path,
                    'name' => $originalName
                ];
                
                // Mettre à jour le chemin des fichiers dans le ticket
                $ticket->attachment_path = json_encode($existingAttachments);
                $ticket->save();

                // Invalider le cache des compteurs
                $this->invalidateCountersCache();

                return response()->json([
                    'message' => 'Pièce jointe ajoutée avec succès',
                    'path' => $path,
                    'name' => $originalName,
                    'all_attachments' => $existingAttachments
                ]);
            }

            return response()->json([
                'message' => 'Aucun fichier n\'a été uploadé'
            ], 400);

        } catch (\Exception $e) {
            \Log::error('Erreur upload fichier', [
                'error' => $e->getMessage(),
                'ticket_id' => $id
            ]);
            return response()->json([
                'message' => 'Erreur lors de l\'upload du fichier',
                'error' => $e->getMessage()
            ], 500);
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
                if (is_numeric($request->statut)) {
                    $query->where('Id_Statut', $request->statut);
                } else {
                    $query->whereHas('statut', function($q) use ($request) {
                        $q->where('designation', $request->statut);
                    });
                }
            }
            if ($request->filled('priorite')) {
                $query->where('Id_Priorite', $request->priorite);
            }
            if ($request->filled('type_demande')) {
                if (is_numeric($request->type_demande)) {
                    $query->where('Id_TypeDemande', $request->type_demande);
                } else {
                    $query->whereHas('typeDemande', function($q) use ($request) {
                        $q->where('designation', $request->type_demande);
                    });
                }
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
            
            // Récupérer la désignation de l'utilisateur
            $demandeur = \App\Models\Demandeur::where('designation', $user->designation)->first();
            $userDesignation = $demandeur ? $demandeur->designation : $user->designation;
            
            Log::info('Tentative d\'ajout de commentaire', [
                'user_id' => $user->id,
                'user_designation' => $userDesignation,
                'ticket_id' => $id
            ]);

            $validated = $request->validate([
                'content' => 'required|string'
            ]);

            $currentComment = $ticket->Commentaire ? $ticket->Commentaire . "\n\n" : "";
            $newComment = $currentComment . "[" . $userDesignation . "|" . now()->format('Y-m-d H:i') . "]" . $validated['content'];

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

    public function approve(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'typeDemandeId' => 'required|exists:T_TYPEDEMANDE,id',
                'categorieId' => 'nullable|exists:T_CATEGORIE,id',
                'emplacementId' => 'nullable|exists:T_EMPLACEMENT,id'
            ]);
            $ticket = Ticket::with(['statut', 'priorite', 'categorie', 'demandeur', 'typeDemande'])->findOrFail($id);
            
            // Log détaillé du statut du ticket
            Log::info('Statut du ticket', [
                'ticket_id' => $id,
                'statut_id' => $ticket->Id_Statut,
                'statut_designation' => $ticket->statut->designation,
                'statut_object' => $ticket->statut->toArray()
            ]);
            
            // Vérifier si le ticket est nouveau
            if ($ticket->statut->designation !== 'Nouveau') {
                Log::warning('Statut invalide pour l\'approbation', [
                    'ticket_id' => $id,
                    'statut_actuel' => $ticket->statut->designation,
                    'statuts_acceptes' => ['Nouveau']
                ]);
                return response()->json([
                    'message' => 'Seuls les tickets nouveaux peuvent être approuvés.'
                ], 400);
            }

            // Récupérer le type de demande
            $typeDemande = \App\Models\TypeDemande::find($validated['typeDemandeId']);
            if (!$typeDemande) {
                return response()->json([
                    'message' => 'Type de demande invalide.'
                ], 400);
            }

<<<<<<< HEAD
            // Déterminer le nouveau statut selon le type de demande
            $nouveauStatut = 'En attente de validation';
            if ($typeDemande->designation === 'Projet') {
                $nouveauStatut = 'En attente de validation'; // Sera validé par le directeur
            }

            // Mettre à jour le ticket avec la catégorie et l'emplacement définis par l'admin
            DB::table('T_TICKET')
                ->where('id', $ticket->id)
                ->update([
                    'Id_Statut' => Statut::where('designation', $nouveauStatut)->value('id'),
                    'Id_TypeDemande' => $validated['typeDemandeId'],
                    'Id_Categorie' => $validated['categorieId'],
                    'Id_Emplacement' => $validated['emplacementId'],
=======
<<<<<<< HEAD
            // Mettre à jour le ticket avec DB::raw pour les dates
            DB::table('T_TICKET')
                ->where('id', $ticket->id)
                ->update([
                    'Id_Statut' => Statut::where('designation', 'En instance')->value('id'),
                    'Id_Executant' => $validated['executantId'],
                    'Id_Priorite' => $validated['priorityId'],
=======
            // Mettre à jour le ticket
            $ticket->Id_Statut = Statut::where('designation', 'En instance')->value('id');
            $ticket->Id_Executant = $validated['executantId'];
            $ticket->Id_Priorite = $validated['priorityId'];
            $ticket->DateDebut = $dateDebut;
            $ticket->DateFinPrevue = $dateFinPrevue;

            // Utiliser DB::raw pour les dates
            DB::table('T_TICKET')
                ->where('id', $ticket->id)
                ->update([
                    'Id_Statut' => $ticket->Id_Statut,
                    'Id_Executant' => $ticket->Id_Executant,
                    'Id_Priorite' => $ticket->Id_Priorite,
>>>>>>> 46cd5876bf4b7d239f618da105529430663a7e10
                    'DateDebut' => DB::raw("CONVERT(datetime, '{$dateDebut}', 120)"),
                    'DateFinPrevue' => DB::raw("CONVERT(datetime, '{$dateFinPrevue}', 120)"),
>>>>>>> 8176dcaab4dae6463e2f4422e7dd488ba8fe330b
                    'updated_at' => now()
                ]);

            // Récupérer le ticket mis à jour
            $ticket = Ticket::with(['statut', 'typeDemande', 'demandeur', 'categorie', 'emplacement'])->find($ticket->id);

            // Envoyer l'email au demandeur
            try {
                $demandeur = $ticket->demandeur;
                if ($demandeur) {
                    $utilisateur = Utilisateur::where('designation', $demandeur->designation)->first();
                    if ($utilisateur && $utilisateur->email) {
                        Mail::to($utilisateur->email)->send(new TicketApprovedNotification($ticket, $demandeur));
                        Log::info('Email d\'approbation envoyé avec succès', [
                            'ticket_id' => $ticket->id,
                            'demandeur_id' => $demandeur->id,
                            'utilisateur_email' => $utilisateur->email
                        ]);
                    }
                }
            } catch (\Exception $e) {
                Log::error('Erreur lors de l\'envoi de l\'email d\'approbation', [
                    'error' => $e->getMessage(),
                    'ticket_id' => $ticket->id
                ]);
            }

<<<<<<< HEAD
            // Si c'est un projet, envoyer l'email au directeur de département
            if ($typeDemande->designation === 'Projet') {
                try {
                    $demandeur = $ticket->demandeur;
                    if ($demandeur && $demandeur->service) {
                        // Chercher le directeur de département (niveau 3)
                        $directeur = Utilisateur::where('id_service', $demandeur->id_service)
                                               ->where('niveau', 3)
                                               ->first();
                        if ($directeur && $directeur->email) {
                            // TODO: Créer un email spécifique pour la validation du directeur
                            // Mail::to($directeur->email)->send(new TicketDirectorValidationRequest($ticket, $directeur));
                            Log::info('Email de validation envoyé au directeur', [
                                'ticket_id' => $ticket->id,
                                'directeur_id' => $directeur->id,
                                'directeur_email' => $directeur->email
                            ]);
                        }
                    }
                } catch (\Exception $e) {
                    Log::error('Erreur lors de l\'envoi de l\'email au directeur', [
                        'error' => $e->getMessage(),
                        'ticket_id' => $ticket->id
=======
            // Envoyer l'email à l'exécutant
            try {
                $executant = \App\Models\Executant::with('utilisateur')->find($validated['executantId']);
                if ($executant && $executant->utilisateur && $executant->utilisateur->email) {
                    Mail::to($executant->utilisateur->email)->send(new TicketAssignedNotification($ticket, $executant));
                    Log::info('Email d\'assignation envoyé avec succès', [
                        'ticket_id' => $ticket->id,
                        'executant_id' => $executant->id,
                        'utilisateur_email' => $executant->utilisateur->email
                    ]);
                } else {
                    Log::warning('Email non trouvé pour l\'exécutant', [
                        'executant_id' => $executant->id,
                        'executant_designation' => $executant->designation,
                        'has_utilisateur' => $executant && $executant->utilisateur ? 'yes' : 'no',
                        'has_email' => $executant && $executant->utilisateur && $executant->utilisateur->email ? 'yes' : 'no'
>>>>>>> 8176dcaab4dae6463e2f4422e7dd488ba8fe330b
                    ]);
                }
            }

            // Invalider le cache des compteurs
            $this->invalidateCountersCache();

            Log::info('Ticket approuvé avec succès', [
                'ticket_id' => $id,
                'type_demande' => $typeDemande->designation,
                'nouveau_statut' => $nouveauStatut
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

            $ticket = Ticket::with(['demandeur'])->findOrFail($id);
            $user = auth()->user();
            
            // Déterminer le type de refus selon le niveau de l'utilisateur
            $statutRefus = '';
            if ($user->niveau === 1) { // Administrateur
                $statutRefus = 'Refusé par administrateur';
            } elseif ($user->niveau === 3) { // Directeur de département
                $statutRefus = 'Refusé par directeur';
            } else {
                return response()->json([
                    'message' => 'Vous n\'êtes pas autorisé à refuser ce ticket.'
                ], 403);
            }
            
            $refuseId = \App\Models\Statut::where('designation', $statutRefus)->value('id');
            if (!$refuseId) {
                return response()->json([
                    'message' => 'Statut de refus non trouvé.'
                ], 500);
            }
            
            $ticket->Id_Statut = $refuseId;
            $ticket->save();

            // Créer un report pour le refus
            TicketReport::create([
                'Id_Ticket' => $ticket->id,
                'Id_Responsable' => auth()->id(),
                'Raison' => $request->raison,
                'type' => 'rejet',
                'is_viewed' => false
            ]);

            // Envoyer l'email au demandeur
            try {
                $demandeur = $ticket->demandeur;
                if ($demandeur) {
                    $utilisateur = Utilisateur::where('designation', $demandeur->designation)->first();
                    if ($utilisateur && $utilisateur->email) {
                        Mail::to($utilisateur->email)->send(new TicketRejectedNotification($ticket, $demandeur, $request->raison));
                        Log::info('Email de rejet envoyé avec succès', [
                            'ticket_id' => $ticket->id,
                            'demandeur_id' => $demandeur->id,
                            'utilisateur_email' => $utilisateur->email,
                            'type_refus' => $statutRefus
                        ]);
                    } else {
                        Log::warning('Email non trouvé pour le demandeur', [
                            'demandeur_id' => $demandeur->id,
                            'demandeur_designation' => $demandeur->designation
                        ]);
                    }
                }
            } catch (\Exception $e) {
                Log::error('Erreur lors de l\'envoi de l\'email de rejet', [
                    'error' => $e->getMessage(),
                    'ticket_id' => $ticket->id
                ]);
            }

            // Invalider le cache des compteurs
            $this->invalidateCountersCache();

            Log::info('Ticket refusé avec succès', [
                'ticket_id' => $id,
                'type_refus' => $statutRefus,
                'user_id' => $user->id,
                'user_niveau' => $user->niveau
            ]);

            return response()->json([
                'message' => 'Ticket refusé avec succès',
                'ticket' => $ticket
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur lors du refus du ticket', [
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
            $ticket->DateFinReelle = date('Y-m-d H:i:s');
            $ticket->save();

            // Invalider le cache des compteurs
            $this->invalidateCountersCache();

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
            $statutEnInstance = Statut::where('designation', 'En instance')->first();
            if (!$statutEnInstance) {
                throw new \Exception('Statut "En instance" non trouvé dans la base de données');
            }
            $ticket->Id_Statut = $statutEnInstance->id;
            $ticket->save();

            // Créer un report de type "rejet" pour garder l'historique du refus
            \App\Models\TicketReport::create([
                'Id_Ticket' => $ticket->id,
                'Id_Responsable' => $user->id,
                'Raison' => $request->raison,
                'type' => 'rejet',
                'is_viewed' => false
            ]);

            // Invalider le cache des compteurs
            $this->invalidateCountersCache();

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

    public function validateByDirector($id)
    {
        try {
            $ticket = Ticket::with(['statut', 'typeDemande', 'demandeur'])->findOrFail($id);
            $user = auth()->user();
            
            // Vérifier que l'utilisateur est un directeur de département (niveau 3)
            if ($user->niveau !== 3) {
                return response()->json([
                    'message' => 'Seuls les directeurs de département peuvent valider les projets.'
                ], 403);
            }
            
            // Vérifier que le ticket est en attente de validation
            if ($ticket->statut->designation !== 'En attente de validation') {
                return response()->json([
                    'message' => 'Seuls les tickets en attente de validation peuvent être validés par le directeur.'
                ], 400);
            }
            
            // Vérifier que c'est bien un projet
            if (!$ticket->typeDemande || $ticket->typeDemande->designation !== 'Projet') {
                return response()->json([
                    'message' => 'Seuls les projets nécessitent une validation du directeur.'
                ], 400);
            }
            
            // Vérifier que le directeur appartient au même service que le demandeur
            $demandeur = $ticket->demandeur;
            if ($demandeur->id_service !== $user->id_service) {
                return response()->json([
                    'message' => 'Vous ne pouvez valider que les projets de votre service.'
                ], 403);
            }
            
            // Mettre à jour le statut
            DB::table('T_TICKET')
                ->where('id', $ticket->id)
                ->update([
                    'Id_Statut' => Statut::where('designation', 'Validé par directeur')->value('id'),
                    'updated_at' => now()
                ]);
            
            // Récupérer le ticket mis à jour
            $ticket = Ticket::with(['statut', 'typeDemande', 'demandeur'])->find($ticket->id);
            
            // Envoyer l'email au demandeur
            try {
                if ($demandeur) {
                    $utilisateur = Utilisateur::where('designation', $demandeur->designation)->first();
                    if ($utilisateur && $utilisateur->email) {
                        // TODO: Créer un email spécifique pour la validation du directeur
                        // Mail::to($utilisateur->email)->send(new TicketDirectorValidatedNotification($ticket, $demandeur));
                        Log::info('Email de validation du directeur envoyé au demandeur', [
                            'ticket_id' => $ticket->id,
                            'demandeur_id' => $demandeur->id,
                            'utilisateur_email' => $utilisateur->email
                        ]);
                    }
                }
            } catch (\Exception $e) {
                Log::error('Erreur lors de l\'envoi de l\'email de validation du directeur', [
                    'error' => $e->getMessage(),
                    'ticket_id' => $ticket->id
                ]);
            }
            
            // Invalider le cache des compteurs
            $this->invalidateCountersCache();
            
            Log::info('Ticket validé par le directeur avec succès', [
                'ticket_id' => $id,
                'directeur_id' => $user->id,
                'directeur_designation' => $user->designation
            ]);
            
            return response()->json([
                'message' => 'Projet validé avec succès',
                'ticket' => $ticket
            ]);
            
        } catch (\Exception $e) {
            Log::error('Erreur lors de la validation par le directeur', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'ticket_id' => $id
            ]);
            return response()->json([
                'message' => 'Erreur lors de la validation du projet',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function assignToExecutant(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'DateDebut' => 'required|date_format:Y-m-d',
                'DateFinPrevue' => [
                    'required',
                    'date_format:Y-m-d',
                    'after:DateDebut'
                ],
                'executantId' => 'required|integer|exists:T_EXECUTANT,id',
                'priorityId' => 'required|integer|exists:T_PRIORITE,id',
                'emplacementId' => 'required|integer|exists:T_EMPLACEMENT,id',
                'categorieId' => 'required|integer|exists:T_CATEGORIE,id'
            ]);

            $ticket = Ticket::with(['statut', 'typeDemande'])->findOrFail($id);
            
            // Vérifier que le ticket peut être assigné
            $statutsAutorises = ['En attente de validation', 'Validé par directeur'];
            if (!in_array($ticket->statut->designation, $statutsAutorises)) {
                return response()->json([
                    'message' => 'Seuls les tickets en attente de validation ou validés par le directeur peuvent être assignés.'
                ], 400);
            }

            // Convertir les dates au format attendu par SQL Server
            $dateDebut = Carbon::createFromFormat('Y-m-d', $validated['DateDebut'])->format('Y-m-d H:i:s');
            $dateFinPrevue = Carbon::createFromFormat('Y-m-d', $validated['DateFinPrevue'])->format('Y-m-d H:i:s');

            // Mettre à jour le ticket
            DB::table('T_TICKET')
                ->where('id', $ticket->id)
                ->update([
                    'Id_Statut' => Statut::where('designation', 'En instance')->value('id'),
                    'Id_Executant' => $validated['executantId'],
                    'Id_Priorite' => $validated['priorityId'],
                    'Id_Emplacement' => $validated['emplacementId'],
                    'Id_Categorie' => $validated['categorieId'],
                    'DateDebut' => DB::raw("CONVERT(datetime, '{$dateDebut}', 120)"),
                    'DateFinPrevue' => DB::raw("CONVERT(datetime, '{$dateFinPrevue}', 120)"),
                    'updated_at' => DB::raw("CONVERT(date, GETDATE(), 120)")
                ]);

            // Récupérer le ticket mis à jour
            $ticket = Ticket::with(['statut', 'executant', 'demandeur'])->find($ticket->id);

            // Envoyer l'email à l'exécutant
            try {
                $executant = \App\Models\Executant::find($validated['executantId']);
                if ($executant) {
                    $utilisateur = Utilisateur::where('designation', $executant->designation)->first();
                    if ($utilisateur && $utilisateur->email) {
                        Mail::to($utilisateur->email)->send(new TicketAssignedNotification($ticket, $executant));
                        Log::info('Email d\'assignation envoyé avec succès', [
                            'ticket_id' => $ticket->id,
                            'executant_id' => $executant->id,
                            'utilisateur_email' => $utilisateur->email
                        ]);
                    }
                }
            } catch (\Exception $e) {
                Log::error('Erreur lors de l\'envoi de l\'email de notification', [
                    'error' => $e->getMessage(),
                    'executant_id' => $validated['executantId']
                ]);
            }

            // Invalider le cache des compteurs
            $this->invalidateCountersCache();

            Log::info('Ticket assigné à l\'exécutant avec succès', [
                'ticket_id' => $id,
                'executant_id' => $validated['executantId']
            ]);

            return response()->json([
                'message' => 'Ticket assigné avec succès',
                'ticket' => $ticket
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Erreur de validation lors de l\'assignation du ticket', [
                'errors' => $e->errors(),
                'ticket_id' => $id
            ]);
            return response()->json([
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erreur lors de l\'assignation du ticket', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'ticket_id' => $id
            ]);
            return response()->json([
                'message' => 'Erreur lors de l\'assignation du ticket',
                'error' => $e->getMessage()
            ], 500);
        }
    }
} 
