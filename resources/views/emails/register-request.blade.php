<!DOCTYPE html>
<html>
<head>
    <title>Nouvelle demande d'inscription</title>
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
            background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%);
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
            padding: 20px;
            font-size: 13px;
            color: #718096;
            margin-top: 20px;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #4299e1;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin-top: 20px;
            font-weight: 500;
        }
        .button:hover {
            background-color: #3182ce;
        }
        .level-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
        }
        .level-employe {
            background-color: #ebf8ff;
            color: #2b6cb0;
        }
        .level-directeur {
            background-color: #f0fff4;
            color: #2f855a;
        }
        .level-general {
            background-color: #faf5ff;
            color: #6b46c1;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Nouvelle demande d'inscription</h1>
        </div>
        <div class="content">
            <p>Bonjour,</p>
            
            <p>Une nouvelle demande d'inscription a été soumise sur la plateforme de gestion des tickets.</p>
            
            <div class="details">
                <h2>Détails de la demande</h2>
                
                <div class="detail-item">
                    <span class="detail-label">Nom complet :</span>
                    <span class="detail-value">{{ $fullName }}</span>
                </div>
                
                <div class="detail-item">
                    <span class="detail-label">Email :</span>
                    <span class="detail-value">{{ $email }}</span>
                </div>
                
                <div class="detail-item">
                    <span class="detail-label">Niveau :</span>
                    <span class="detail-value">
                        @switch($level)
                            @case('employe')
                                <span class="level-badge level-employe">Employé</span>
                                @break
                            @case('directeur_departement')
                                <span class="level-badge level-directeur">Directeur de département</span>
                                @break
                            @case('directeur_general')
                                <span class="level-badge level-general">Directeur général</span>
                                @break
                        @endswitch
                    </span>
                </div>
                
                @if($service)
                    <div class="detail-item">
                        <span class="detail-label">Service :</span>
                        <span class="detail-value">{{ $service }}</span>
                    </div>
                @endif
            </div>

            <p>Veuillez examiner cette demande et prendre les mesures appropriées.</p>
            
            <p>Cordialement,<br>L'équipe de la plateforme</p>
        </div>
        <div class="footer">
            <p>Ce message a été envoyé automatiquement. Merci de ne pas y répondre.</p>
            <p>&copy; {{ date('Y') }} Plateforme de Gestion des Tickets. Tous droits réservés.</p>
        </div>
    </div>
</body>
</html> 