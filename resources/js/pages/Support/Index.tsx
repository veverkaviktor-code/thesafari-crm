import { useForm, Head, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle, Send, Mail, Phone } from 'lucide-react';

declare global {
    interface Window {
        turnstile?: {
            render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
            reset: (widgetId: string) => void;
            remove: (widgetId: string) => void;
        };
    }
}

const TURNSTILE_SITE_KEY = document.querySelector<HTMLMetaElement>('meta[name="turnstile-site-key"]')?.content ?? '';

export default function SupportIndex() {
    const { flash } = usePage<{ flash: { success?: string } }>().props;
    const [submitted, setSubmitted] = useState(false);
    const [emailRevealed, setEmailRevealed] = useState(false);
    const turnstileRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const tokenRef = useRef<string>('');

    const { data, setData, post, processing, errors, reset } = useForm({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        website: '',
        content: '',
        'cf-turnstile-response': '',
    });

    // Load Turnstile script
    useEffect(() => {
        if (!TURNSTILE_SITE_KEY || document.getElementById('turnstile-script')) return;

        const script = document.createElement('script');
        script.id = 'turnstile-script';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.onload = () => renderWidget();
        document.head.appendChild(script);

        return () => {
            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.remove(widgetIdRef.current);
            }
        };
    }, []);

    const renderWidget = useCallback(() => {
        if (!window.turnstile || !turnstileRef.current || !TURNSTILE_SITE_KEY) return;
        if (widgetIdRef.current) return;

        widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            theme: 'light',
            size: 'invisible',
            callback: (token: string) => {
                tokenRef.current = token;
            },
        });
    }, []);

    // Re-render widget after form reset
    useEffect(() => {
        if (submitted && window.turnstile && turnstileRef.current) {
            // Widget removed on submit, re-render when form shows again
        }
    }, [submitted]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // If no Turnstile configured, submit without token
        if (!TURNSTILE_SITE_KEY) {
            post('/podpora', {
                onSuccess: () => { setSubmitted(true); reset(); },
            });
            return;
        }

        // Submit with Turnstile token
        post('/podpora', {
            data: { ...data, 'cf-turnstile-response': tokenRef.current },
            onSuccess: () => {
                setSubmitted(true);
                reset();
                tokenRef.current = '';
                if (widgetIdRef.current && window.turnstile) {
                    window.turnstile.reset(widgetIdRef.current);
                }
            },
            onError: () => {
                if (widgetIdRef.current && window.turnstile) {
                    window.turnstile.reset(widgetIdRef.current);
                }
            },
        });
    };

    return (
        <>
            <Head title="Podpora | TheSafari.cz" />
            <div className="light min-h-screen flex flex-col bg-[#F8F5F0] font-sans">
                {/* Header */}
                <header className="py-8 px-6">
                    <div className="max-w-2xl mx-auto flex justify-center">
                        <img src="/logo-light.svg" alt="TheSafari.cz" className="h-10" />
                    </div>
                </header>

                {/* Main content */}
                <main className="px-6 pb-16 flex-1">
                    <div className="max-w-2xl mx-auto">
                        {submitted ? (
                            /* Success state */
                            <div className="text-center py-20">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 bg-[#d6863f]/10">
                                    <CheckCircle className="h-8 w-8 text-[#d6863f]" />
                                </div>
                                <h1 className="text-3xl font-semibold mb-3 text-[#2e3a36]">
                                    Děkujeme!
                                </h1>
                                <p className="text-lg mb-8 text-gray-500">
                                    Vaši zprávu jsme přijali a budeme se jí věnovat.
                                    <br />Ozveme se vám co nejdříve.
                                </p>
                                <button
                                    onClick={() => setSubmitted(false)}
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-white bg-[#d6863f] transition-colors hover:bg-[#c47835]"
                                >
                                    Odeslat další zprávu
                                </button>
                            </div>
                        ) : (
                            /* Form */
                            <>
                                <div className="text-center mb-10">
                                    <h1 className="text-3xl font-semibold mb-3 text-[#2e3a36]">
                                        Potřebujete pomoct?
                                    </h1>
                                    <p className="text-lg text-gray-500">
                                        Napište nám a ozveme se vám zpět.
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {/* Name row */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-[#2e3a36]">
                                                Jméno <span className="text-[#d6863f]">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={data.first_name}
                                                onChange={(e) => setData('first_name', e.target.value)}
                                                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all bg-white text-[#2e3a36] focus:border-[#d6863f] focus:ring-2 focus:ring-[#d6863f]/10 ${errors.first_name ? 'border-red-500' : 'border-gray-300'}`}
                                                placeholder="Jan"
                                            />
                                            {errors.first_name && <p className="text-xs mt-1 text-red-500">{errors.first_name}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-[#2e3a36]">
                                                Příjmení <span className="text-[#d6863f]">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={data.last_name}
                                                onChange={(e) => setData('last_name', e.target.value)}
                                                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all bg-white text-[#2e3a36] focus:border-[#d6863f] focus:ring-2 focus:ring-[#d6863f]/10 ${errors.last_name ? 'border-red-500' : 'border-gray-300'}`}
                                                placeholder="Novák"
                                            />
                                            {errors.last_name && <p className="text-xs mt-1 text-red-500">{errors.last_name}</p>}
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-[#2e3a36]">
                                            E-mail <span className="text-[#d6863f]">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all bg-white text-[#2e3a36] focus:border-[#d6863f] focus:ring-2 focus:ring-[#d6863f]/10 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                                            placeholder="jan@example.cz"
                                        />
                                        {errors.email && <p className="text-xs mt-1 text-red-500">{errors.email}</p>}
                                    </div>

                                    {/* Phone + Website */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-[#2e3a36]">
                                                Telefon
                                            </label>
                                            <input
                                                type="tel"
                                                value={data.phone}
                                                onChange={(e) => setData('phone', e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm outline-none transition-all bg-white text-[#2e3a36] focus:border-[#d6863f] focus:ring-2 focus:ring-[#d6863f]/10"
                                                placeholder="+420 735 905 989"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-[#2e3a36]">
                                                Webová stránka
                                            </label>
                                            <input
                                                type="text"
                                                value={data.website}
                                                onChange={(e) => setData('website', e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm outline-none transition-all bg-white text-[#2e3a36] focus:border-[#d6863f] focus:ring-2 focus:ring-[#d6863f]/10"
                                                placeholder="www.example.cz"
                                            />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-[#2e3a36]">
                                            Vaše zpráva <span className="text-[#d6863f]">*</span>
                                        </label>
                                        <textarea
                                            value={data.content}
                                            onChange={(e) => setData('content', e.target.value)}
                                            rows={5}
                                            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all resize-none bg-white text-[#2e3a36] focus:border-[#d6863f] focus:ring-2 focus:ring-[#d6863f]/10 ${errors.content ? 'border-red-500' : 'border-gray-300'}`}
                                            placeholder="Popište, s čím vám můžeme pomoci..."
                                        />
                                        {errors.content && <p className="text-xs mt-1 text-red-500">{errors.content}</p>}
                                    </div>

                                    {/* Turnstile (invisible) */}
                                    <div ref={turnstileRef} />

                                    {/* Submit */}
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-medium text-white transition-colors bg-[#d6863f] hover:bg-[#c47835] disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        <Send className="h-4 w-4" />
                                        {processing ? 'Odesílám...' : 'Odeslat zprávu'}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </main>

                {/* Footer */}
                <footer className="py-8 px-6 border-t border-[#e5e1dc] bg-[#f0ece6]">
                    <div className="max-w-2xl mx-auto">
                        <p className="text-center text-sm font-medium mb-4 text-gray-500">
                            Nebo nás kontaktujte přímo
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-6">
                            {emailRevealed ? (
                                <a
                                    href="mailto:podpora@thesafari.cz"
                                    className="inline-flex items-center gap-2 text-sm text-[#2e3a36] transition-colors hover:text-[#d6863f]"
                                >
                                    <Mail className="h-4 w-4" />
                                    podpora@thesafari.cz
                                </a>
                            ) : (
                                <button
                                    onClick={() => setEmailRevealed(true)}
                                    className="inline-flex items-center gap-2 text-sm text-[#2e3a36] transition-colors hover:text-[#d6863f] cursor-pointer"
                                >
                                    <Mail className="h-4 w-4" />
                                    Zobrazit e-mail
                                </button>
                            )}
                            <a
                                href="tel:+420735905989"
                                className="inline-flex items-center gap-2 text-sm text-[#2e3a36] transition-colors hover:text-[#d6863f]"
                            >
                                <Phone className="h-4 w-4" />
                                735 905 989
                            </a>
                        </div>
                        <p className="text-center text-xs text-gray-400">
                            &copy; 2026 TheSafari.cz &middot; Všechna práva vyhrazena
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}
