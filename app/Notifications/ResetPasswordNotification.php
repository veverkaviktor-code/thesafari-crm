<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    use Queueable;

    public function __construct(protected string $token)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $resetUrl = url('/obnovit-heslo/' . $this->token . '?email=' . urlencode($notifiable->getEmailForPasswordReset()));

        return (new MailMessage)
            ->subject('Obnovení hesla — TheSafari HQ')
            ->greeting('Dobrý den,')
            ->line('Obdrželi jsme žádost o obnovení hesla k vašemu účtu v systému TheSafari HQ.')
            ->action('Obnovit heslo', $resetUrl)
            ->line('Tento odkaz je platný po dobu **60 minut**.')
            ->line('Pokud jste o obnovení hesla nežádali, tento e-mail ignorujte — váš účet je v bezpečí.')
            ->salutation('TheSafari HQ');
    }
}
