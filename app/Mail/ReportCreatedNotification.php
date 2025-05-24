<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Support\Facades\Storage;

class ReportCreatedNotification extends Mailable
{
    use Queueable, SerializesModels;

    public $ticket;
    public $responsable;
    public $raison;
    public $attachmentPath;

    /**
     * Create a new message instance.
     */
    public function __construct($ticket, $responsable, $raison, $attachmentPath = null)
    {
        $this->ticket = $ticket;
        $this->responsable = $responsable;
        $this->raison = $raison;
        $this->attachmentPath = $attachmentPath;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Nouveau Report pour le ticket : ' . $this->ticket->Titre,
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
        $attachments = [];

        if ($this->attachmentPath && Storage::disk('public')->exists($this->attachmentPath)) {
            $attachments[] = Attachment::fromStorageDisk('public', $this->attachmentPath);
        }

        return $attachments;
    }
}
