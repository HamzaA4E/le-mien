<!DOCTYPE html>
<html>
<head>
    <title>Nouveau Report pour le ticket : {{ $ticket->Titre }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #fff;
            padding: 20px 30px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        h1, h2, h3 {
            color: #333;
        }
        p {
            margin-bottom: 15px;
        }
        .details-list {
            list-style: none;
            padding: 0;
            margin: 15px 0;
            border-top: 1px solid #eee;
            padding-top: 15px;
        }
        .details-list li {
            margin-bottom: 10px;
            padding-left: 0;
            position: relative;
            border-bottom: 1px dashed #eee;
            padding-bottom: 10px;
        }
         .details-list li:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }
        .details-list li strong {
            display: inline-block;
            width: 140px; /* Ajusté pour plus d'espace */
            margin-right: 10px;
            color: #555;
        }
         .report-content {
            margin-top: 20px;
            padding: 15px;
            background-color: #f9f9f9;
            border: 1px solid #eee;
            border-radius: 4px;
             white-space: pre-wrap; /* Préserve les retours à la ligne */
             word-wrap: break-word; /* Empêche le dépassement */
        }
        .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #eee;
            font-size: 0.9em;
            color: #777;
        }
        .button {
            display: inline-block;
            background-color: #007bff;
            color: #ffffff !important;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
        }
         .button:hover {
            background-color: #0056b3;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>Nouveau Report pour le ticket : {{ $ticket->Titre }}</h2>
        
        <p>Bonjour,</p>

        <p>
            Un nouveau report a été ajouté au ticket : <strong>{{ $ticket->Titre }}</strong>.
        </p>

        <h3>Détails du Ticket :</h3>
        
        <ul class="details-list">
            <li><strong>Titre :</strong> {{ $ticket->Titre }}</li>
            <li><strong>Demandeur :</strong> {{ $ticket->demandeur->designation ?? 'N/A' }}</li>
            <li><strong>Statut :</strong> {{ $ticket->statut->designation ?? 'N/A' }}</li>
            <li><strong>Priorité :</strong> {{ $ticket->priorite->designation ?? 'N/A' }}</li>
            <li><strong>Date de création :</strong> {{ \Carbon\Carbon::parse($ticket->DateCreation)->format('d/m/Y') }}</li>
            <li><strong>Date fin prévue :</strong> {{ \Carbon\Carbon::parse($ticket->DateFinPrevue)->format('d/m/Y') ?? 'N/A' }}</li>
             <li><strong>Reporté par :</strong> {{ $responsable->designation ?? 'N/A' }}</li>
        </ul>

        <h3>Contenu du Report :</h3>
        <div class="report-content">
            {{ $raison }}
        </div>

        {{-- Optionnel: Ajouter un lien direct vers le ticket si vous avez une route frontend --}}
        {{-- <p>
            <a href="{{ url('/tickets/' . $ticket->id) }}" class="button">Voir le ticket</a>
        </p> --}}

        <div class="footer">
            
            <p>Cordialement</p>
        </div>
    </div>
</body>
</html> 