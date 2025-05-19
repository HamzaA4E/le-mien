<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReportCreatedNotification extends Mailable
{
    use Queueable, SerializesModels;

    public $ticket;
    public $responsable;
    public $raison;

    /**
     * Create a new message instance.
     */
    public function __construct($ticket, $responsable, $raison)
    {
        $this->ticket = $ticket;
        $this->responsable = $responsable;
        $this->raison = $raison;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Report créé pour le ticket #' . $this->ticket->id,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.report_created',
            with: [
                'ticket' => $this->ticket,
                'responsable' => $this->responsable,
                'raison' => $this->raison,
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
