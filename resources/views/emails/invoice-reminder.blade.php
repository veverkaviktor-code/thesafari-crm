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

                    <!-- Header with logo -->
                    <tr>
                        <td style="padding: 32px 40px 0 40px; text-align: center;">
                            <img src="cid:safari-logo" alt="TheSafari.cz" width="300" style="display: block; margin: 0 auto;">
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

                            @if($reminderNumber === 1)
                                <p style="margin: 0 0 16px 0; font-size: 15px;">
                                    náš Karel, který u nás dělá účetnictví, si všiml, že faktura č. <strong>{{ $invoice->invoice_number }}</strong> na částku <strong>{{ number_format((float) $invoice->total, 0, ',', ' ') }} Kč</strong> ještě stále visí na větvi. 🦥
                                </p>
                                <p style="margin: 0 0 16px 0; font-size: 15px;">
                                    Možná se jen zatoulala mezi ostatními dokumenty.
                                    Budeme rádi za její úhradu, aby mohlo vše běžet dál bez zdržení.
                                </p>
                                <p style="margin: 0 0 20px 0; font-size: 15px;">
                                    Děkujeme!
                                </p>
                            @elseif($reminderNumber === 2)
                                <p style="margin: 0 0 16px 0; font-size: 15px;">
                                    pokud platíte faktury stejně pomalu, jako náš Karel dělá účetnictví, chápeme, že se k ní ještě nedostalo. 🦥
                                </p>
                                <p style="margin: 0 0 16px 0; font-size: 15px;">
                                    Jen připomínáme, že faktura č. <strong>{{ $invoice->invoice_number }}</strong> na částku <strong>{{ number_format((float) $invoice->total, 0, ',', ' ') }} Kč</strong> je stále neuhrazená a je již <strong>{{ $daysOverdue }} dní po splatnosti</strong>.
                                    Prosíme o její úhradu, aby nedošlo k automatickému omezení služeb.
                                </p>
                                <p style="margin: 0 0 20px 0; font-size: 15px;">
                                    Děkujeme!
                                </p>
                            @else
                                <p style="margin: 0 0 16px 0; font-size: 15px;">
                                    náš Karel, který u nás dělá účetnictví, už na fakturu č. <strong>{{ $invoice->invoice_number }}</strong> na částku <strong>{{ number_format((float) $invoice->total, 0, ',', ' ') }} Kč</strong> kouká opravdu dlouho. 🦥
                                </p>
                                <p style="margin: 0 0 16px 0; font-size: 15px;">
                                    A i když je Karel velmi trpělivý, systém už tak pomalý není.
                                    Pokud nebude faktura uhrazena, může během následujících <strong>7 dní dojít k automatickému omezení služeb</strong>.
                                </p>
                                <p style="margin: 0 0 20px 0; font-size: 15px;">
                                    Prosíme proto o její úhradu co nejdříve.
                                    Děkujeme!
                                </p>
                            @endif

                            <!-- Payment details - amber style -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 0 0 20px 0;">
                                <tr>
                                    <td style="padding: 10px 16px; background-color: #fffbeb; border: 1px solid #fcd34d; font-weight: 600; font-size: 14px; width: 180px; color: #92400e;">Číslo účtu</td>
                                    <td style="padding: 10px 16px; background-color: #fffbeb; border: 1px solid #fcd34d; font-size: 14px; color: #92400e;">{{ $company->bank_account }}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 16px; background-color: #fffbeb; border: 1px solid #fcd34d; font-weight: 600; font-size: 14px; color: #92400e;">Variabilní symbol</td>
                                    <td style="padding: 10px 16px; background-color: #fffbeb; border: 1px solid #fcd34d; font-size: 14px; color: #92400e;">{{ $invoice->variable_symbol }}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 16px; background-color: #fffbeb; border: 1px solid #fcd34d; font-weight: 600; font-size: 14px; color: #92400e;">Částka</td>
                                    <td style="padding: 10px 16px; background-color: #fffbeb; border: 1px solid #fcd34d; font-size: 14px; color: #92400e;">{{ number_format((float) $invoice->total, 0, ',', ' ') }} Kč</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 16px; background-color: #fffbeb; border: 1px solid #fcd34d; font-weight: 600; font-size: 14px; color: #92400e;">Splatnost</td>
                                    <td style="padding: 10px 16px; background-color: #fffbeb; border: 1px solid #fcd34d; font-size: 14px; color: #DC2626; font-weight: 600;">{{ $invoice->due_date->format('j. n. Y') }}</td>
                                </tr>
                            </table>

                            @if(!empty($qrBase64))
                            <div style="text-align: center; margin: 0 0 20px 0;">
                                <p style="margin: 0 0 8px 0; font-size: 13px; color: #888888;">Zaplaťte jednoduše přes QR kód:</p>
                                <img src="data:image/png;base64,{{ $qrBase64 }}" alt="QR platba" width="150" height="150" style="display: inline-block;">
                            </div>
                            @endif

                            <p style="margin: 0 0 16px 0; font-size: 14px; color: #666666;">
                                Fakturu naleznete v příloze tohoto e-mailu.
                            </p>
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
                                Tento e-mail byl odeslán automaticky. Prosíme, neodpovídejte na něj.
                            </p>
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>
