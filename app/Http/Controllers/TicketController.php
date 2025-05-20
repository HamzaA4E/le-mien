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
                'titre' => 'sometimes|string|max:255',
                'description' => 'sometimes|string',
                'id_priorite' => 'sometimes|exists:T_PRIORITE,id',
                'id_statut' => 'sometimes|exists:T_STATUT,id',
                'id_executant' => 'sometimes|exists:T_EXECUTANT,id',
            ]);

            Log::info('Données validées:', $validated);

            // Préparation des données pour la mise à jour
            $data = [];
            foreach ($validated as $key => $value) {
                switch ($key) {
                    case 'id_statut':
                        $data['Id_Statut'] = (int)$value;
                        break;
                    case 'id_priorite':
                        $data['Id_Priorite'] = (int)$value;
                        break;
                    case 'id_executant':
                        $data['Id_Executant'] = (int)$value;
                        break;
                    default:
                        $data[$key] = $value;
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
                'T_DEMDEUR' => Demandeur::class,
                'T_SOCIETE' => Societe::class,
                'T_EMPLACEMENT' => Emplacement::class,
                'T_PRIORITE' => Priorite::class,
                'T_CATEGORIE' => Categorie::class,
                'T_TYPEDEMANDE' => TypeDemande::class,
                'T_STATUT' => Statut::class,
            ];

            $options = [];
            foreach ($tables as $tableName => $modelClass) {
                try {
                    Log::info("Récupération des données pour la table {$tableName}");
                    
                    if ($tableName === 'T_DEMDEUR') {
                        $options['demandeurs'] = $modelClass::with('service')->get();
                    } else {
                        $key = strtolower(str_replace('T_', '', $tableName));
                        $options[$key] = $modelClass::all();
                    }
                    
                    Log::info("Données récupérées pour {$tableName}", [
                        'count' => $tableName === 'T_DEMDEUR' 
                            ? $options['demandeurs']->count() 
                            : $options[strtolower(str_replace('T_', '', $tableName))]->count()
                    ]);
                } catch (\Exception $e) {
                    Log::error("Erreur lors de la récupération des données de la table {$tableName}: " . $e->getMessage());
                    Log::error("Stack trace: " . $e->getTraceAsString());
                    
                    // On continue avec les autres tables même si une échoue
                    continue;
                }
            }

            // Vérification que toutes les options requises sont présentes
            $requiredOptions = ['demandeurs', 'societes', 'emplacements', 'priorites', 'categories', 'typesdemande', 'statuts'];
            $missingOptions = array_diff($requiredOptions, array_keys($options));

            if (!empty($missingOptions)) {
                Log::error('Options manquantes: ' . implode(', ', $missingOptions));
                throw new \Exception('Certaines options sont manquantes: ' . implode(', ', $missingOptions));
            }

            Log::info('Options récupérées avec succès', ['options' => array_keys($options)]);
            return response()->json($options);

        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des options: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'message' => 'Erreur lors de la récupération des options',
                'error' => $e->getMessage()
            ], 500);
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

            return response()->download($path, basename($ticket->attachment_path));
        } catch (\Exception $e) {
            return response()->json(['message' => 'Erreur lors du téléchargement du fichier'], 500);
        }
    }
} 