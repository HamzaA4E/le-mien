<!DOCTYPE html>
<html>
<head>
    <title>Report créé pour le ticket #{{ $ticket->id }}</title>
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
        }
        .details-list li {
            margin-bottom: 10px;
            padding-left: 15px;
            position: relative;
        }
        .details-list li strong {
            display: inline-block;
            width: 100px; /* Adjust as needed */
            margin-right: 10px;
        }
        .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #eee;
            font-size: 0.9em;
            color: #777;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>Report créé pour le ticket #{{ $ticket->id }}</h2>
        
        <p>Bonjour,</p>

        <p>
            Un report a été créé pour le ticket <strong>{{ $ticket->Titre }}</strong> (#{{ $ticket->id }}).
        </p>

        <h3>Détails du report :</h3>
        
        <ul class="details-list">
            <li><strong>Responsable :</strong> {{ $responsable->designation }}</li>
            <li><strong>Raison :</strong> {{ $raison }}</li>
        </ul>

       

        <div class="footer">
            <p>Cordialement,</p>
        </div>
    </div>
</body>
</html> 