<!DOCTYPE html>
<html>
<head>
    <title>Ticket refusé</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #2d3748;
            margin: 0;
            padding: 0;
            background-color: #f7fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 30px;
            background-color: white;
            border-radius: 0 0 8px 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .details {
            margin: 25px 0;
            padding: 20px;
            background-color: #f8fafc;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
        }
        .details h2 {
            color: #2d3748;
            font-size: 18px;
            margin-top: 0;
            margin-bottom: 15px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 10px;
        }
        .detail-item {
            margin: 12px 0;
            display: flex;
            align-items: flex-start;
        }
        .detail-label {
            font-weight: 600;
            color: #4a5568;
            min-width: 150px;
        }
        .detail-value {
            color: #2d3748;
            flex: 1;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #718096;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Ticket refusé</h1>
        </div>
        <div class="content">
            <p>Bonjour {{ $demandeur->designation }},</p>
            
            <p>Votre ticket a été refusé. Voici les détails :</p>
            
            <div class="details">
                <h2>Détails du ticket</h2>
                <div class="detail-item">
                    <span class="detail-label">Titre :</span>
                    <span class="detail-value">{{ $ticket->Titre }}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Description :</span>
                    <span class="detail-value">{{ $ticket->Description }}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Emplacement :</span>
                    <span class="detail-value">{{ $ticket->emplacement->designation ?? 'Non spécifié' }}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Catégorie :</span>
                    <span class="detail-value">{{ $ticket->categorie->designation ?? 'Non spécifiée' }}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Date de création :</span>
                    <span class="detail-value">{{ \Carbon\Carbon::parse($ticket->DateCreation)->format('d/m/Y') }}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Date d'action :</span>
                    <span class="detail-value">{{ \Carbon\Carbon::now()->format('d/m/Y') }}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Raison du refus :</span>
                    <span class="detail-value">{{ $raison }}</span>
                </div>
            </div>
            
            <p>Vous pouvez consulter les détails complets de votre ticket en vous connectant à la plateforme.</p>
        </div>
        <div class="footer">
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
        </div>
    </div>
</body>
</html> 