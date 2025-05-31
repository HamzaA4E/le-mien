<!DOCTYPE html>
<html>
<head>
    <title>Demande d'inscription non approuvée</title>
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
            background-color: #f44336;
            color: white;
            padding: 20px;
            text-align: center;
        }
        .content {
            padding: 20px;
            background-color: #f9f9f9;
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
            <h1>Demande d'inscription non approuvée</h1>
        </div>
        <div class="content">
            <p>Bonjour {{ $name }},</p>
            
            <p>Nous regrettons de vous informer que votre demande d'inscription n'a pas été approuvée.</p>
            
            <p>Si vous pensez qu'il s'agit d'une erreur ou si vous souhaitez plus d'informations, n'hésitez pas à contacter l'administrateur du système.</p>
            
            <p>Cordialement,<br>L'équipe d'administration</p>
        </div>
        <div class="footer">
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
        </div>
    </div>
</body>
</html> 