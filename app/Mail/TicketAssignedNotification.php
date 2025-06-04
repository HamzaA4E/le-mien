<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class TicketAssignedNotification extends Mailable
{
    use Queueable, SerializesModels;

    public $ticket;
    public $executant;

    public function __construct($ticket, $executant)
    {
        $this->ticket = $ticket;
        $this->executant = $executant;
    }

    public function build()
    {
        return $this->subject('Nouveau ticket assigné : ' . $this->ticket->Titre)
                    ->view('emails.ticket_assigned');
    }
} 