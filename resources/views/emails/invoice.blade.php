<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #333333; line-height: 1.6;">

    <!-- Outer wrapper for centering + background -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 32px 16px;">

                <!-- Inner content card -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">

                    <!-- Header with logo placeholder -->
                    <tr>
                        <td style="padding: 32px 40px 0 40px; text-align: center;">
                            {{-- Logo: nahradit src za base64 data URI nebo URL s hotlinkem --}}
                            {{-- <img src="data:image/png;base64,..." alt="TheSafari.cz" width="180" style="display: block; margin: 0 auto 16px auto;"> --}}
                            <h2 style="margin: 0 0 4px 0; font-size: 20px; font-weight: 700; color: #1a1a1a;">TheSafari.cz</h2>
                            <p style="margin: 0; font-size: 13px; color: #888888;">Web &middot; Hosting &middot; Reklama</p>
                        </td>
                    </tr>

                    <!-- Divider -->
                    <tr>
                        <td style="padding: 20px 40px 0 40px;">
                            <hr style="border: none; border-top: 1px solid #eeeeee; margin: 0;">
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 24px 40px;">
                            <p style="margin: 0 0 16px 0; font-size: 15px;">Dobrý den,</p>

                            <p style="margin: 0 0 8px 0; font-size: 15px;">
                                {{ $serviceDescription }}
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 15px;">
                                V příloze zasíláme fakturu č. <strong>{{ $invoice->invoice_number }}</strong> na částku <strong>{{ number_format((float) $invoice->total, 0, ',', ' ') }} Kč</strong>.
                            </p>

                            <!-- Payment details table -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 0 0 20px 0;">
                                <tr>
                                    <td style="padding: 10px 16px; background-color: #f8f8f8; border: 1px solid #e5e5e5; font-weight: 600; font-size: 14px; width: 180px;">Číslo účtu</td>
                                    <td style="padding: 10px 16px; border: 1px solid #e5e5e5; font-size: 14px;">{{ $company->bank_account }}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 16px; background-color: #f8f8f8; border: 1px solid #e5e5e5; font-weight: 600; font-size: 14px;">Variabilní symbol</td>
                                    <td style="padding: 10px 16px; border: 1px solid #e5e5e5; font-size: 14px;">{{ $invoice->variable_symbol }}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 16px; background-color: #f8f8f8; border: 1px solid #e5e5e5; font-weight: 600; font-size: 14px;">Částka</td>
                                    <td style="padding: 10px 16px; border: 1px solid #e5e5e5; font-size: 14px;">{{ number_format((float) $invoice->total, 0, ',', ' ') }} Kč</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 16px; background-color: #f8f8f8; border: 1px solid #e5e5e5; font-weight: 600; font-size: 14px;">Splatnost</td>
                                    <td style="padding: 10px 16px; border: 1px solid #e5e5e5; font-size: 14px;">{{ $invoice->due_date->format('j. n. Y') }}</td>
                                </tr>
                            </table>

                            <p style="margin: 0 0 16px 0; font-size: 14px; color: #666666;">
                                Pro platbu můžete využít QR kód na faktuře.
                            </p>

                            <p style="margin: 0; font-size: 15px;">Děkujeme,</p>
                        </td>
                    </tr>

                    <!-- Signature -->
                    <tr>
                        <td style="padding: 0 40px 24px 40px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding-top: 16px; border-top: 1px solid #eeeeee;">
                                        <p style="margin: 0; font-weight: 600; font-size: 15px; color: #1a1a1a;">Viktor Veverka</p>
                                        <p style="margin: 4px 0 0 0; font-size: 14px;">
                                            <a href="https://thesafari.cz" style="color: #D97706; text-decoration: none;">TheSafari.cz</a>
                                            &nbsp;&middot;&nbsp;
                                            <a href="https://neniweb.cz" style="color: #D97706; text-decoration: none;">Neniweb.cz</a>
                                        </p>
                                        <p style="margin: 6px 0 0 0; color: #888888; font-size: 13px; font-style: italic;">
                                            Váš partner pro reklamu, webové stránky, grafiku, tisk a automatizace.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 16px 40px; background-color: #fafafa; border-top: 1px solid #eeeeee;">
                            <p style="margin: 0 0 8px 0; color: #666666; font-size: 12px; text-align: center;">
                                V případě dotazů nás kontaktujte na <a href="mailto:viktor@thesafari.cz" style="color: #D97706; text-decoration: none;">viktor@thesafari.cz</a> nebo telefonicky na <a href="tel:+420735905989" style="color: #D97706; text-decoration: none;">735 905 989</a>.
                            </p>
                            <p style="margin: 0; color: #999999; font-size: 11px; text-align: center;">
                                Tento e-mail byl odeslán automaticky. Prosíme, neodpovídejte na něj.
                            </p>
                        </td>
                    </tr>

                </table>
                <!-- /Inner content card -->

            </td>
        </tr>
    </table>

</body>
</html>
