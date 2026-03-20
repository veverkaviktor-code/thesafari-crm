<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'vas_hosting' => [
        'portal_api_url' => env('VAS_HOSTING_PORTAL_API_URL', 'https://portal.vas-hosting.cz/api/v1'),
        'portal_api_key' => env('VAS_HOSTING_PORTAL_API_KEY'),
        'server_api_url' => env('VAS_HOSTING_SERVER_API_URL', 'https://sss06.vas-server.cz/vpsc/api/v1'),
        'server_api_key' => env('VAS_HOSTING_SERVER_API_KEY'),
        'vpsc_admin_email' => env('VAS_HOSTING_VPSC_ADMIN_EMAIL'),
        'vpsc_servers' => [
            [
                'name' => 'ond08.vas-server.cz',
                'url' => env('VAS_HOSTING_OND08_URL', 'https://ond08.vas-server.cz'),
                'api_key' => env('VAS_HOSTING_OND08_API_KEY'),
            ],
            [
                'name' => 'thaimassage-server.cz',
                'url' => env('VAS_HOSTING_THAIMASSAGE_URL', 'https://thaimassage-server.cz'),
                'api_key' => env('VAS_HOSTING_THAIMASSAGE_API_KEY'),
            ],
        ],
    ],

    'fio' => [
        'token' => env('FIO_API_TOKEN'),
        'base_url' => env('FIO_API_URL', 'https://fioapi.fio.cz/v1/rest'),
    ],

    'turnstile' => [
        'site_key' => env('TURNSTILE_SITE_KEY'),
        'secret' => env('TURNSTILE_SECRET'),
    ],

];
