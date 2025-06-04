<!DOCTYPE html>
<html>
<head>
    <title>Ticket assigné</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
        }
        .content {
            padding: 20px;
            background-color: #f9f9f9;
        }
        .ticket-details {
            margin: 20px 0;
            padding: 15px;
            background-color: #fff;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .detail-item {
            margin: 10px 0;
        }
        .detail-label {
            font-weight: bold;
            color: #666;
        }
        .footer {
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Nouveau ticket assigné</h1>
        </div>
        <div class="content">
            <p>Bonjour {{ $executant->designation }},</p>
            
            <p>Un nouveau ticket vous a été assigné. Voici les détails :</p>
            
            <div class="ticket-details">
                <div class="detail-item">
                    <span class="detail-label">Titre :</span>
                    <span>{{ $ticket->Titre }}</span>
                </div>
                
                <div class="detail-item">
                    <span class="detail-label">Description :</span>
                    <span>{{ $ticket->Description }}</span>
                </div>
                
                <div class="detail-item">
                    <span class="detail-label">Priorité :</span>
                    <span>{{ $ticket->priorite->designation }}</span>
                </div>
                
                <div class="detail-item">
                    <span class="detail-label">Catégorie :</span>
                    <span>{{ $ticket->categorie->designation }}</span>
                </div>
                
                <div class="detail-item">
                    <span class="detail-label">Date de début :</span>
                    <span>{{ $ticket->DateDebut }}</span>
                </div>
                
                <div class="detail-item">
                    <span class="detail-label">Date de fin prévue :</span>
                    <span>{{ $ticket->DateFinPrevue }}</span>
                </div>
            </div>

            <p>Vous pouvez accéder au ticket en vous connectant à la plateforme.</p>
            
            <p>Cordialement,<br>L'équipe de la plateforme</p>
        </div>
        <div class="footer">
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            <p>&copy; {{ date('Y') }} Plateforme de Gestion des Tickets. Tous droits réservés.</p>
        </div>
    </div>
</body>
</html> 