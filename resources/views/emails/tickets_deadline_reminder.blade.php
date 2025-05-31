<h2 style="color:#2563eb;">Tickets à échéance dans moins de 24h</h2>
@if($tickets->isEmpty())
    <p style="color:#16a34a;">Aucun ticket à échéance dans les prochaines 24h.</p>
@else
<table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:14px;">
    <thead style="background:#f1f5f9;">
        <tr>
            <th>Titre</th>
            <th>Description</th>
            <th>Statut</th>
            <th>Priorité</th>
            <th>Demandeur</th>
            <th>Société</th>
            <th>Emplacement</th>
            <th>Catégorie</th>
            <th>Exécutant</th>
            <th>Date début</th>
            <th>Date fin prévue</th>
            <th>Date fin réelle</th>
        </tr>
    </thead>
    <tbody>
    @foreach($tickets as $ticket)
        <tr>
            <td><strong>{{ $ticket->Titre }}</strong></td>
            <td>{{ $ticket->Description }}</td>
            <td>{{ $ticket->statut->designation ?? $ticket->Id_Statut ?? 'N/A' }}</td>
            <td>{{ $ticket->priorite->designation ?? $ticket->Id_Priorite ?? 'N/A' }}</td>
            <td>{{ $ticket->demandeur->designation ?? $ticket->Id_Demandeur ?? 'N/A' }}</td>
            <td>{{ $ticket->societe->designation ?? $ticket->Id_Societe ?? 'N/A' }}</td>
            <td>{{ $ticket->emplacement->designation ?? $ticket->Id_Emplacement ?? 'N/A' }}</td>
            <td>{{ $ticket->categorie->designation ?? $ticket->Id_Categorie ?? 'N/A' }}</td>
            <td>{{ $ticket->executant->designation ?? $ticket->Id_Executant ?? 'N/A' }}</td>
            <td>{{ is_object($ticket->DateDebut) ? $ticket->DateDebut->format('d/m/Y H:i') : $ticket->DateDebut }}</td>
            <td style="color:#dc2626;font-weight:bold;">{{ is_object($ticket->DateFinPrevue) ? $ticket->DateFinPrevue->format('d/m/Y H:i') : $ticket->DateFinPrevue }}</td>
            <td>{{ is_object($ticket->DateFinReelle) ? $ticket->DateFinReelle->format('d/m/Y H:i') : ($ticket->DateFinReelle ?? 'N/A') }}</td>
        </tr>
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
                <strong>Catégorie:</strong> {{ $ticket->categorie->designation }}
            </td>
        </tr>
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
                <strong>Emplacement:</strong> {{ $ticket->emplacement->designation }}
            </td>
        </tr>
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
                <strong>Société:</strong> {{ $ticket->societe->designation }}
            </td>
        </tr>
    @endforeach
    </tbody>
</table>
@endif 