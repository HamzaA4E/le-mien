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
                'date_fin_prevue' => 'required|date',
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

                $attachmentPath = null;
                if ($request->hasFile('attachment')) {
                    $file = $request->file('attachment');
                    Log::info('Fichier reçu:', [
                        'name' => $file->getClientOriginalName(),
                        'size' => $file->getSize(),
                        'mime' => $file->getMimeType()
                    ]);
                    
                    try {
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
                'reports.responsable'
            ])->findOrFail($id);

            return response()->json($ticket);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération du ticket: ' . $e->getMessage());
            return response()->json(['error' => 'Erreur lors de la récupération du ticket'], 500);
        }
    }

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
                'DateFinPrevue' => 'sometimes|date_format:d/m/Y',
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
                (
                    (isset($data['Id_Statut']) && $idCloture && (int)$data['Id_Statut'] === (int)$idCloture)
                    || $ticket->Id_Statut === $idCloture
                )
                && empty($ticket->DateFinReelle)
            ) {
                $data['DateFinReelle'] = date('d/m/Y H:i:s');
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

    public function getOptions()
    {
        try {
            Log::info('Début de la récupération des options');

            // Vérification de l'existence des tables
            $tables = [
                'T_STATUT' => ['model' => Statut::class, 'key' => 'statuts'],
                'T_DEMDEUR' => ['model' => Demandeur::class, 'key' => 'demandeurs'],
                'T_SOCIETE' => ['model' => Societe::class, 'key' => 'societes'],
                'T_EMPLACEMENT' => ['model' => Emplacement::class, 'key' => 'emplacements'],
                'T_PRIORITE' => ['model' => Priorite::class, 'key' => 'priorites'],
                'T_CATEGORIE' => ['model' => Categorie::class, 'key' => 'categories'],
                'T_TYPEDEMANDE' => ['model' => TypeDemande::class, 'key' => 'typesDemande'],
            ];

            $options = [];
            $errors = [];

            // Charger d'abord les statuts car ils sont critiques
            try {
                Log::info("Récupération des données pour la table T_STATUT");
                $statuts = Statut::where('is_active', true)->get();
                Log::info("Statuts récupérés avec succès", ['count' => $statuts->count()]);
                $options['statuts'] = $statuts;
            } catch (\Exception $e) {
                Log::error("Erreur lors de la récupération des statuts: " . $e->getMessage());
                Log::error("Stack trace: " . $e->getTraceAsString());
                $errors['statuts'] = $e->getMessage();
                $options['statuts'] = collect([]);
            }

            // Charger les autres options
            foreach ($tables as $tableName => $config) {
                if ($tableName === 'T_STATUT') continue; // Déjà traité

                try {
                    Log::info("Récupération des données pour la table {$tableName}");
                    
                    if ($tableName === 'T_DEMDEUR') {
                        $options[$config['key']] = $config['model']::where('is_active', true)->with('service')->get();
                    } else {
                        $options[$config['key']] = $config['model']::where('is_active', true)->get();
                    }
                    
                    Log::info("Données récupérées pour {$tableName}", [
                        'count' => $options[$config['key']]->count()
                    ]);
                } catch (\Exception $e) {
                    Log::error("Erreur lors de la récupération des données de la table {$tableName}: " . $e->getMessage());
                    Log::error("Stack trace: " . $e->getTraceAsString());
                    $errors[$config['key']] = $e->getMessage();
                    $options[$config['key']] = collect([]);
                }
            }

            // Vérification des options requises
            $requiredOptions = ['demandeurs', 'societes', 'emplacements', 'priorites', 'categories', 'typesDemande', 'statuts'];
            $missingOptions = array_diff($requiredOptions, array_keys($options));

            // Si des options sont manquantes, les ajouter comme collections vides
            foreach ($missingOptions as $option) {
                $options[$option] = collect([]);
                $errors[$option] = 'Option non disponible';
            }

            Log::info('Options récupérées avec succès', ['options' => array_keys($options)]);
            
            // Retourner les options disponibles avec les erreurs éventuelles
            return response()->json([
                'options' => $options,
                'errors' => $errors,
                'hasErrors' => !empty($errors)
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des options: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            
            // Retourner une réponse avec des collections vides pour toutes les options
            $emptyOptions = array_fill_keys([
                'demandeurs', 'societes', 'emplacements', 'priorites', 
                'categories', 'typesDemande', 'statuts'
            ], collect([]));
            
            return response()->json([
                'options' => $emptyOptions,
                'errors' => ['general' => $e->getMessage()],
                'hasErrors' => true
            ], 200); // Retourner 200 même en cas d'erreur pour éviter le blocage du frontend
        }
    }

    public function getStats()
    {
        try {
            $stats = [
                'total' => Ticket::count(),
                'en_cours' => Ticket::whereHas('statut', function($query) {
                    $query->where('designation', 'En cours');
                })->count(),
                'en_instance' => Ticket::whereHas('statut', function($query) {
                    $query->where('designation', 'En instance');
                })->count(),
                'cloture' => Ticket::whereHas('statut', function($query) {
                    $query->where('designation', 'Clôturé');
                })->count(),
                'par_priorite' => Ticket::select('id_priorite', DB::raw('count(*) as total'))
                    ->with('priorite:id,designation')
                    ->groupBy('id_priorite')
                    ->get()
                    ->map(function($item) {
                        return [
                            'priorite' => $item->priorite->designation,
                            'total' => $item->total
                        ];
                    }),
                'par_categorie' => Ticket::select('id_categorie', DB::raw('count(*) as total'))
                    ->with('categorie:id,designation')
                    ->groupBy('id_categorie')
                    ->get()
                    ->map(function($item) {
                        return [
                            'categorie' => $item->categorie->designation,
                            'total' => $item->total
                        ];
                    })
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

    /**
     * Récupère les tickets filtrés par statut
     */
    public function getByStatut($statut)
    {
        $query = Ticket::query()
            ->select([
                'T_TICKET.*',
                'T_STATUT.designation as statut_designation',
                'T_PRIORITE.designation as priorite_designation',
                'T_CATEGORIE.designation as categorie_designation',
                'T_DEMDEUR.designation as demandeur_designation'
            ])
            ->join('T_STATUT', 'T_TICKET.id_statut', '=', 'T_STATUT.id')
            ->join('T_PRIORITE', 'T_TICKET.id_priorite', '=', 'T_PRIORITE.id')
            ->join('T_CATEGORIE', 'T_TICKET.id_categorie', '=', 'T_CATEGORIE.id')
            ->join('T_DEMDEUR', 'T_TICKET.id_demandeur', '=', 'T_DEMDEUR.id');

        // Filtrage optimisé par statut
        switch ($statut) {
            case 'en-cours':
                $query->where('T_TICKET.id_statut', 2); // Statut "En cours"
                break;
            case 'en-instance':
                $query->where('T_TICKET.id_statut', 3); // Statut "En instance"
                break;
            case 'cloture':
                $query->where('T_TICKET.id_statut', 4); // Statut "Clôturé"
                break;
            case 'tous':
                // Pas de filtre sur le statut
                break;
            default:
                // Par défaut, on montre les tickets en cours
                $query->where('T_TICKET.id_statut', 2);
        }

        // Tri par date de création décroissante
        $query->orderBy('T_TICKET.DateCreation', 'desc');

        return $query->get();
    }

    // Utilitaire pour la commande de rappel
    public static function ticketsFinPrevueDans24hNonCloture()
    {
        return \App\Models\Ticket::with(['statut', 'priorite', 'demandeur', 'societe', 'emplacement', 'categorie', 'typeDemande', 'executant'])
            ->finPrevueDans24hNonCloture()
            ->get();
    }

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

            $mimeType = mime_content_type($path) ?: 'application/octet-stream';

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
                'executants' => Utilisateur::where('is_active', true)->get(),
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
            $perPage = $request->input('per_page', 20);
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
} 