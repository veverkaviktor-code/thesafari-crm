<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class GenericNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $title,
        public string $message,
        public string $link = '/'
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'generic',
            'title' => $this->title,
            'message' => $this->message,
            'link' => $this->link,
        ];
    }
}
