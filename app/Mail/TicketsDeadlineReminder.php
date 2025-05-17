<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class TicketsDeadlineReminder extends Mailable
{
    use Queueable, SerializesModels;

    public $tickets;

    public function __construct($tickets)
    {
        $this->tickets = $tickets;
    }

    public function build()
    {
        return $this->subject('Tickets à échéance dans 24h')
            ->view('emails.tickets_deadline_reminder');
    }
} 