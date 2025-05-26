<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Http\Controllers\TicketController;
use App\Mail\TicketsDeadlineReminder;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class SendTicketsDeadlineReminder extends Command
{
    protected $signature = 'tickets:deadline-reminder';
    protected $description = 'Envoie un mail pour les tickets dont la date de fin prévue est dans moins de 24h et non clôturés';

    public function handle()
    {
        Log::info('Exécution de la commande tickets:deadline-reminder');

        $tickets = TicketController::ticketsFinPrevueDans24hNonCloture();

        Log::info('Nombre de tickets trouvés : ' . $tickets->count());

        if ($tickets->isNotEmpty()) {
            Log::info('Envoi de l\'email de rappel de tickets à échéance...');
            // À adapter : mettre l'adresse email de destination souhaitée
            $to = config('mail.reminder_to', 'herohamza24@gmail.com');
            Mail::to($to)->send(new TicketsDeadlineReminder($tickets));
            $this->info('Mail de rappel envoyé.');
            Log::info('Email de rappel de tickets à échéance envoyé.');
        } else {
            $this->info('Aucun ticket à échéance dans 24h.');
            Log::info('Aucun ticket à échéance dans 24h.');
        }
    }
} 