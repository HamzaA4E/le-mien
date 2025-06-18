<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Statut;
use App\Models\TypeDemande;

echo "=== STATUTS ===\n";
Statut::all()->each(function($s) {
    echo "ID: {$s->id} - {$s->designation}\n";
});

echo "\n=== TYPES DE DEMANDE ===\n";
TypeDemande::all()->each(function($t) {
    echo "ID: {$t->id} - {$t->designation}\n";
}); 