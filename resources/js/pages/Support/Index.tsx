import { useForm, Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { CheckCircle, Send, Mail, Phone } from 'lucide-react';

export default function SupportIndex() {
    const { flash } = usePage<{ flash: { success?: string } }>().props;
    const [submitted, setSubmitted] = useState(false);
    const [emailRevealed, setEmailRevealed] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        website: '',
        content: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/podpora', {
            onSuccess: () => {
                setSubmitted(true);
                reset();
            },
        });
    };

    return (
        <>
            <Head title="Podpora | TheSafari.cz" />
            <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F8F5F0', fontFamily: 'Inter, system-ui, sans-serif' }}>
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
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6" style={{ backgroundColor: 'rgba(214, 134, 63, 0.1)' }}>
                                    <CheckCircle className="h-8 w-8" style={{ color: '#d6863f' }} />
                                </div>
                                <h1 className="text-3xl font-semibold mb-3" style={{ color: '#2e3a36' }}>
                                    Děkujeme!
                                </h1>
                                <p className="text-lg mb-8" style={{ color: '#6b7280' }}>
                                    Vaši zprávu jsme přijali a budeme se jí věnovat.
                                    <br />Ozveme se vám co nejdříve.
                                </p>
                                <button
                                    onClick={() => setSubmitted(false)}
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-white transition-colors"
                                    style={{ backgroundColor: '#d6863f' }}
                                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#c47835')}
                                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#d6863f')}
                                >
                                    Odeslat další zprávu
                                </button>
                            </div>
                        ) : (
                            /* Form */
                            <>
                                <div className="text-center mb-10">
                                    <h1 className="text-3xl font-semibold mb-3" style={{ color: '#2e3a36' }}>
                                        Potřebujete pomoct?
                                    </h1>
                                    <p className="text-lg" style={{ color: '#6b7280' }}>
                                        Napište nám a ozveme se vám zpět.
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {/* Name row */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5" style={{ color: '#2e3a36' }}>
                                                Jméno <span style={{ color: '#d6863f' }}>*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={data.first_name}
                                                onChange={(e) => setData('first_name', e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                                                style={{
                                                    borderColor: errors.first_name ? '#ef4444' : '#d1d5db',
                                                    backgroundColor: '#ffffff',
                                                    color: '#2e3a36',
                                                }}
                                                onFocus={(e) => (e.target.style.borderColor = '#d6863f', e.target.style.boxShadow = '0 0 0 3px rgba(214, 134, 63, 0.1)')}
                                                onBlur={(e) => (e.target.style.borderColor = errors.first_name ? '#ef4444' : '#d1d5db', e.target.style.boxShadow = 'none')}
                                                placeholder="Jan"
                                            />
                                            {errors.first_name && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.first_name}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5" style={{ color: '#2e3a36' }}>
                                                Příjmení <span style={{ color: '#d6863f' }}>*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={data.last_name}
                                                onChange={(e) => setData('last_name', e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                                                style={{
                                                    borderColor: errors.last_name ? '#ef4444' : '#d1d5db',
                                                    backgroundColor: '#ffffff',
                                                    color: '#2e3a36',
                                                }}
                                                onFocus={(e) => (e.target.style.borderColor = '#d6863f', e.target.style.boxShadow = '0 0 0 3px rgba(214, 134, 63, 0.1)')}
                                                onBlur={(e) => (e.target.style.borderColor = errors.last_name ? '#ef4444' : '#d1d5db', e.target.style.boxShadow = 'none')}
                                                placeholder="Novák"
                                            />
                                            {errors.last_name && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.last_name}</p>}
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5" style={{ color: '#2e3a36' }}>
                                            E-mail <span style={{ color: '#d6863f' }}>*</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                                            style={{
                                                borderColor: errors.email ? '#ef4444' : '#d1d5db',
                                                backgroundColor: '#ffffff',
                                                color: '#2e3a36',
                                            }}
                                            onFocus={(e) => (e.target.style.borderColor = '#d6863f', e.target.style.boxShadow = '0 0 0 3px rgba(214, 134, 63, 0.1)')}
                                            onBlur={(e) => (e.target.style.borderColor = errors.email ? '#ef4444' : '#d1d5db', e.target.style.boxShadow = 'none')}
                                            placeholder="jan@example.cz"
                                        />
                                        {errors.email && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.email}</p>}
                                    </div>

                                    {/* Phone + Website */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5" style={{ color: '#2e3a36' }}>
                                                Telefon
                                            </label>
                                            <input
                                                type="tel"
                                                value={data.phone}
                                                onChange={(e) => setData('phone', e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                                                style={{
                                                    borderColor: '#d1d5db',
                                                    backgroundColor: '#ffffff',
                                                    color: '#2e3a36',
                                                }}
                                                onFocus={(e) => (e.target.style.borderColor = '#d6863f', e.target.style.boxShadow = '0 0 0 3px rgba(214, 134, 63, 0.1)')}
                                                onBlur={(e) => (e.target.style.borderColor = '#d1d5db', e.target.style.boxShadow = 'none')}
                                                placeholder="+420 735 905 989"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5" style={{ color: '#2e3a36' }}>
                                                Webová stránka
                                            </label>
                                            <input
                                                type="text"
                                                value={data.website}
                                                onChange={(e) => setData('website', e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                                                style={{
                                                    borderColor: '#d1d5db',
                                                    backgroundColor: '#ffffff',
                                                    color: '#2e3a36',
                                                }}
                                                onFocus={(e) => (e.target.style.borderColor = '#d6863f', e.target.style.boxShadow = '0 0 0 3px rgba(214, 134, 63, 0.1)')}
                                                onBlur={(e) => (e.target.style.borderColor = '#d1d5db', e.target.style.boxShadow = 'none')}
                                                placeholder="www.example.cz"
                                            />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5" style={{ color: '#2e3a36' }}>
                                            Vaše zpráva <span style={{ color: '#d6863f' }}>*</span>
                                        </label>
                                        <textarea
                                            value={data.content}
                                            onChange={(e) => setData('content', e.target.value)}
                                            rows={5}
                                            className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all resize-none"
                                            style={{
                                                borderColor: errors.content ? '#ef4444' : '#d1d5db',
                                                backgroundColor: '#ffffff',
                                                color: '#2e3a36',
                                            }}
                                            onFocus={(e) => (e.target.style.borderColor = '#d6863f', e.target.style.boxShadow = '0 0 0 3px rgba(214, 134, 63, 0.1)')}
                                            onBlur={(e) => (e.target.style.borderColor = errors.content ? '#ef4444' : '#d1d5db', e.target.style.boxShadow = 'none')}
                                            placeholder="Popište, s čím vám můžeme pomoci..."
                                        />
                                        {errors.content && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.content}</p>}
                                    </div>

                                    {/* Submit */}
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-medium text-white transition-all"
                                        style={{
                                            backgroundColor: processing ? '#b8a08c' : '#d6863f',
                                            cursor: processing ? 'not-allowed' : 'pointer',
                                        }}
                                        onMouseOver={(e) => { if (!processing) e.currentTarget.style.backgroundColor = '#c47835'; }}
                                        onMouseOut={(e) => { if (!processing) e.currentTarget.style.backgroundColor = '#d6863f'; }}
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
                <footer className="py-8 px-6 border-t" style={{ borderColor: '#e5e1dc', backgroundColor: '#f0ece6' }}>
                    <div className="max-w-2xl mx-auto">
                        <p className="text-center text-sm font-medium mb-4" style={{ color: '#6b7280' }}>
                            Nebo nás kontaktujte přímo
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-6">
                            {emailRevealed ? (
                                <a
                                    href="mailto:podpora@thesafari.cz"
                                    className="inline-flex items-center gap-2 text-sm transition-colors"
                                    style={{ color: '#2e3a36' }}
                                    onMouseOver={(e) => (e.currentTarget.style.color = '#d6863f')}
                                    onMouseOut={(e) => (e.currentTarget.style.color = '#2e3a36')}
                                >
                                    <Mail className="h-4 w-4" />
                                    podpora@thesafari.cz
                                </a>
                            ) : (
                                <button
                                    onClick={() => setEmailRevealed(true)}
                                    className="inline-flex items-center gap-2 text-sm transition-colors cursor-pointer"
                                    style={{ color: '#2e3a36' }}
                                    onMouseOver={(e) => (e.currentTarget.style.color = '#d6863f')}
                                    onMouseOut={(e) => (e.currentTarget.style.color = '#2e3a36')}
                                >
                                    <Mail className="h-4 w-4" />
                                    Zobrazit e-mail
                                </button>
                            )}
                            <a
                                href="tel:+420735905989"
                                className="inline-flex items-center gap-2 text-sm transition-colors"
                                style={{ color: '#2e3a36' }}
                                onMouseOver={(e) => (e.currentTarget.style.color = '#d6863f')}
                                onMouseOut={(e) => (e.currentTarget.style.color = '#2e3a36')}
                            >
                                <Phone className="h-4 w-4" />
                                735 905 989
                            </a>
                        </div>
                        <p className="text-center text-xs" style={{ color: '#9ca3af' }}>
                            &copy; 2026 TheSafari.cz &middot; Všechna práva vyhrazena
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}
