<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class TicketRejectedNotification extends Mailable
{
    use Queueable, SerializesModels;

    public $ticket;
    public $demandeur;
    public $raison;

    public function __construct($ticket, $demandeur, $raison)
    {
        $this->ticket = $ticket;
        $this->demandeur = $demandeur;
        $this->raison = $raison;
    }

    public function build()
    {
        return $this->subject('Votre ticket a été refusé : ' . $this->ticket->Titre)
                    ->view('emails.ticket_rejected');
    }
} 