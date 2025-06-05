<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class TicketCompletedNotification extends Mailable
{
    use Queueable, SerializesModels;

    public $ticket;
    public $demandeur;

    public function __construct($ticket, $demandeur)
    {
        $this->ticket = $ticket;
        $this->demandeur = $demandeur;
    }

    public function build()
    {
        return $this->subject('Votre ticket a été marqué comme terminé : ' . $this->ticket->Titre)
                    ->view('emails.ticket_completed');
    }
} 