<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class RegisterRequestNotification extends Mailable
{
    use Queueable, SerializesModels;

    public $requestData;

    public function __construct($requestData)
    {
        $this->requestData = $requestData;
    }

    public function build()
    {
        return $this->subject('Nouvelle demande d\'inscription - Plateforme de Gestion des Tickets')
                    ->view('emails.register-request')
                    ->with([
                        'fullName' => $this->requestData['fullName'],
                        'email' => $this->requestData['email'],
                        'level' => $this->requestData['level'],
                        'service' => $this->requestData['service_name'] ?? null
                    ]);
    }
} 