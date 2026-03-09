<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #333333; line-height: 1.6;">

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 32px 16px;">

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; position: relative;">

                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 40px 0 40px; text-align: center;">
                            <h2 style="margin: 0 0 4px 0; font-size: 20px; font-weight: 700; color: #1a1a1a;">TheSafari.cz <span style="color: #cccccc; font-weight: 400;">|</span> <span style="font-weight: 500; color: #888888; font-size: 18px;">Fakturace</span></h2>
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

                            <p style="margin: 0 0 16px 0; font-size: 15px;">
                                děkujeme za úhradu faktury č. <strong>{{ $invoice->invoice_number }}</strong> na částku <strong>{{ number_format((float) $invoice->total, 0, ',', ' ') }} Kč</strong>.
                            </p>

                            <p style="margin: 0 0 16px 0; font-size: 15px;">
                                Náš Karel, který u nás dělá účetnictví, právě zaznamenal platbu a může si zase v klidu pověsit účetnictví na větev. 🦥
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 15px;">
                                Vše je vyrovnáno.<br>
                                Děkujeme!
                            </p>

                            <!-- Invoice summary -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 0 0 20px 0;">
                                <tr>
                                    <td style="padding: 10px 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; font-weight: 600; font-size: 14px; width: 180px; color: #166534;">Číslo faktury</td>
                                    <td style="padding: 10px 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; font-size: 14px; color: #166534;">{{ $invoice->invoice_number }}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; font-weight: 600; font-size: 14px; color: #166534;">Částka</td>
                                    <td style="padding: 10px 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; font-size: 14px; color: #166534;">{{ number_format((float) $invoice->total, 0, ',', ' ') }} Kč</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; font-weight: 600; font-size: 14px; color: #166534;">Stav</td>
                                    <td style="padding: 10px 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; font-size: 14px; font-weight: 700; color: #166534;">✓ Zaplaceno</td>
                                </tr>
                            </table>

                            <p style="margin: 0; font-size: 15px;">S pozdravem,</p>
                        </td>
                    </tr>

                    <!-- Signature + Karel -->
                    <tr>
                        <td style="padding: 0;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding: 16px 0 0 0; border-top: 1px solid #eeeeee;" colspan="2">&nbsp;</td>
                                </tr>
                                <tr>
                                    <td style="vertical-align: middle; padding-left: 40px;" valign="middle">
                                        <p style="margin: 0; font-weight: 600; font-size: 15px; color: #1a1a1a;">Karel &ldquo;Lenoch&rdquo; <span style="font-weight: 400; color: #888888;">| Účetní</span></p>
                                        <p style="margin: 4px 0 0 0; font-size: 14px;">
                                            <a href="https://thesafari.cz" style="color: #D97706; text-decoration: none;">TheSafari.cz</a>
                                            &nbsp;&middot;&nbsp;
                                            <a href="https://neniweb.cz" style="color: #D97706; text-decoration: none;">Neniweb.cz</a>
                                        </p>
                                    </td>
                                    <td style="text-align: right; vertical-align: bottom;" valign="bottom" width="170">
                                        <img src="cid:karel-sloth" alt="Karel — náš účetní lenochod" width="160" style="display: block; margin-left: auto; border: 0;">
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
                                Tento e-mail byl odeslán automaticky.
                            </p>
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>
