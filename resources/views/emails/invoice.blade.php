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
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">

                    <!-- Header with logo -->
                    <tr>
                        <td style="padding: 32px 40px 0 40px; text-align: center;">
                            @if(!empty($logoBase64))
                                <img src="data:image/png;base64,{{ $logoBase64 }}" alt="TheSafari.cz" width="180" style="display: block; margin: 0 auto 16px auto;">
                            @else
                                <h2 style="margin: 0 0 4px 0; font-size: 20px; font-weight: 700; color: #1a1a1a;">TheSafari.cz</h2>
                            @endif
                            <p style="margin: 0; font-size: 13px; color: #888888;">Web &middot; Tisk &middot; Reklama</p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 20px 40px 0 40px;">
                            <hr style="border: none; border-top: 1px solid #eeeeee; margin: 0;">
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 24px 40px;">
                            <p style="margin: 0 0 16px 0; font-size: 15px;">Dobr&yacute; den,</p>

                            <p style="margin: 0 0 8px 0; font-size: 15px;">
                                {{ $serviceDescription }}
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 15px;">
                                V p&rcaron;&iacute;loze zas&iacute;l&aacute;me fakturu &ccaron;. <strong>{{ $invoice->invoice_number }}</strong> na &ccaron;&aacute;stku <strong>{{ number_format((float) $invoice->total, 0, ,,  ) }} K&ccaron;</strong>.
                            </p>

                            <!-- Payment details - amber style -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 0 0 20px 0;">
                                <tr>
                                    <td style="padding: 10px 16px; background-color: #fffbeb; border: 1px solid #fcd34d; font-weight: 600; font-size: 14px; width: 180px; color: #92400e;">&Ccaron;&iacute;slo &uacute;&ccaron;tu</td>
                                    <td style="padding: 10px 16px; background-color: #fffbeb; border: 1px solid #fcd34d; font-size: 14px; color: #92400e;">{{ $company->bank_account }}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 16px; background-color: #fffbeb; border: 1px solid #fcd34d; font-weight: 600; font-size: 14px; color: #92400e;">Variabiln&iacute; symbol</td>
                                    <td style="padding: 10px 16px; background-color: #fffbeb; border: 1px solid #fcd34d; font-size: 14px; color: #92400e;">{{ $invoice->variable_symbol }}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 16px; background-color: #fffbeb; border: 1px solid #fcd34d; font-weight: 600; font-size: 14px; color: #92400e;">&Ccaron;&aacute;stka</td>
                                    <td style="padding: 10px 16px; background-color: #fffbeb; border: 1px solid #fcd34d; font-size: 14px; color: #92400e;">{{ number_format((float) $invoice->total, 0, ,,  ) }} K&ccaron;</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 16px; background-color: #fffbeb; border: 1px solid #fcd34d; font-weight: 600; font-size: 14px; color: #92400e;">Splatnost</td>
                                    <td style="padding: 10px 16px; background-color: #fffbeb; border: 1px solid #fcd34d; font-size: 14px; color: #92400e;">{{ $invoice->due_date->format(j. n. Y) }}</td>
                                </tr>
                            </table>

                            @if(!empty($qrBase64))
                            <div style="text-align: center; margin: 0 0 20px 0;">
                                <p style="margin: 0 0 8px 0; font-size: 13px; color: #888888;">QR k&oacute;d pro platbu:</p>
                                <img src="data:image/png;base64,{{ $qrBase64 }}" alt="QR platba" width="150" height="150" style="display: inline-block;">
                            </div>
                            @endif

                            <p style="margin: 0; font-size: 15px;">D&ecaron;kujeme,</p>
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
                                        <p style="margin: 0; font-weight: 600; font-size: 15px; color: #1a1a1a;">Karel &ldquo;Lenoch&rdquo; <span style="font-weight: 400; color: #888888;">| &Uacute;&ccaron;etn&iacute;</span></p>
                                        <p style="margin: 4px 0 0 0; font-size: 14px;">
                                            <a href="https://thesafari.cz" style="color: #D97706; text-decoration: none;">TheSafari.cz</a>
                                            &nbsp;&middot;&nbsp;
                                            <a href="https://neniweb.cz" style="color: #D97706; text-decoration: none;">Neniweb.cz</a>
                                        </p>
                                    </td>
                                    <td style="text-align: right; vertical-align: bottom;" valign="bottom" width="170">
                                        <img src="cid:karel-invoice" alt="Karel" width="160" style="display: block; margin-left: auto; border: 0;">
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 16px 40px; background-color: #fafafa; border-top: 1px solid #eeeeee;">
                            <p style="margin: 0 0 8px 0; color: #666666; font-size: 12px; text-align: center;">
                                V p&rcaron;&iacute;pad&ecaron; dotaz&udblac; n&aacute;s kontaktujte na <a href="mailto:viktor@thesafari.cz" style="color: #D97706; text-decoration: none;">viktor@thesafari.cz</a> nebo telefonicky na <a href="tel:+420735905989" style="color: #D97706; text-decoration: none;">735 905 989</a>.
                            </p>
                            <p style="margin: 0; color: #999999; font-size: 11px; text-align: center;">
                                Tento e-mail byl odesl&aacute;n automaticky. Pros&iacute;me, neodpov&iacute;dejte na n&ecaron;j.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

</body>
</html>
