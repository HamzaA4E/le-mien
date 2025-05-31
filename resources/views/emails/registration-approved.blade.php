<!DOCTYPE html>
<html>
<head>
    <title>Demande d'inscription approuvée</title>
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
        .credentials {
            background-color: #fff;
            padding: 15px;
            border: 1px solid #ddd;
            margin: 20px 0;
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
            <h1>Demande d'inscription approuvée</h1>
        </div>
        <div class="content">
            <p>Bonjour {{ $name }},</p>
            
            <p>Votre demande d'inscription a été approuvée. Vous pouvez maintenant vous connecter à la plateforme en utilisant les identifiants suivants :</p>
            
            <div class="credentials">
                <p><strong>Email :</strong> {{ $email }}</p>
                <p><strong>Mot de passe temporaire :</strong> {{ $password }}</p>
            </div>
            
            <p>Pour des raisons de sécurité, nous vous recommandons de changer votre mot de passe dès votre première connexion.</p>
            
            <p>Vous pouvez vous connecter en cliquant sur le lien suivant :</p>
            <p><a href="{{ config('app.url') }}/login">{{ config('app.url') }}/login</a></p>
        </div>
        <div class="footer">
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
        </div>
    </div>
</body>
</html> 