<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #333333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">

    <p style="margin-top: 0;">Dobrý den,</p>

    <p>v příloze zasíláme fakturu č. <strong>{{ $invoice->invoice_number }}</strong> na částku <strong>{{ number_format((float) $invoice->total, 0, ',', ' ') }} Kč</strong>.</p>

    <table style="border-collapse: collapse; margin: 20px 0; width: 100%;">
        <tr>
            <td style="padding: 8px 16px; background-color: #f8f8f8; border: 1px solid #e0e0e0; font-weight: 600; width: 180px;">Číslo účtu</td>
            <td style="padding: 8px 16px; border: 1px solid #e0e0e0;">{{ $company->bank_account }}</td>
        </tr>
        <tr>
            <td style="padding: 8px 16px; background-color: #f8f8f8; border: 1px solid #e0e0e0; font-weight: 600;">Variabilní symbol</td>
            <td style="padding: 8px 16px; border: 1px solid #e0e0e0;">{{ $invoice->variable_symbol }}</td>
        </tr>
        <tr>
            <td style="padding: 8px 16px; background-color: #f8f8f8; border: 1px solid #e0e0e0; font-weight: 600;">Částka</td>
            <td style="padding: 8px 16px; border: 1px solid #e0e0e0;">{{ number_format((float) $invoice->total, 0, ',', ' ') }} Kč</td>
        </tr>
        <tr>
            <td style="padding: 8px 16px; background-color: #f8f8f8; border: 1px solid #e0e0e0; font-weight: 600;">Splatnost</td>
            <td style="padding: 8px 16px; border: 1px solid #e0e0e0;">{{ $invoice->due_date->format('j. n. Y') }}</td>
        </tr>
    </table>

    <p>Pro platbu můžete využít QR kód na faktuře.</p>

    <p>Děkujeme,</p>

    <div style="margin-top: 10px; padding-top: 16px; border-top: 1px solid #e0e0e0;">
        <p style="margin: 0; font-weight: 600; font-size: 15px;">Viktor Veverka</p>
        <p style="margin: 4px 0 0 0; color: #666666; font-size: 14px;">
            <a href="https://thesafari.cz" style="color: #D97706; text-decoration: none;">TheSafari.cz</a>
            &nbsp;&middot;&nbsp;
            <a href="https://neniweb.cz" style="color: #D97706; text-decoration: none;">Neniweb.cz</a>
        </p>
        <p style="margin: 8px 0 0 0; color: #888888; font-size: 13px; font-style: italic;">
            Váš partner pro reklamu, webové stránky, grafiku, tisk a automatizace.
        </p>
    </div>

    <p style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #eeeeee; color: #999999; font-size: 12px; margin-bottom: 0;">
        Tento e-mail byl odeslán automaticky. Prosíme, neodpovídejte na něj.
    </p>

</body>
</html>
