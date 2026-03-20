import { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Eye, EyeOff, Copy, Check, ExternalLink, X, KeyRound } from 'lucide-react';

interface VaultEntry {
    id: number;
    name: string;
    username: string | null;
    password: string | null;
    url: string | null;
    notes: string | null;
}

interface Props {
    vault: VaultEntry[];
}

function PasswordCell({ password }: { password: string }) {
    const [visible, setVisible] = useState(false);
    const [copied, setCopied] = useState(false);

    function handleCopy() {
        navigator.clipboard.writeText(password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="flex items-center gap-1">
            <span className="font-mono text-sm">{visible ? password : '••••••••'}</span>
            <button onClick={() => setVisible(!visible)} className="rounded p-1 text-muted-foreground hover:text-foreground" title={visible ? 'Skrýt' : 'Zobrazit'}>
                {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
            <button onClick={handleCopy} className={`rounded p-1 transition-colors ${copied ? 'text-emerald-500' : 'text-muted-foreground hover:text-foreground'}`} title={copied ? 'Zkopírováno!' : 'Kopírovat'}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
        </div>
    );
}

function VaultForm({ entry, onCancel }: { entry?: VaultEntry; onCancel: () => void }) {
    const form = useForm({
        name: entry?.name || '',
        username: entry?.username || '',
        password: entry?.password || '',
        url: entry?.url || '',
        notes: entry?.notes || '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (entry) {
            form.put(`/nastaveni/hesla/${entry.id}`, { preserveScroll: true, onSuccess: onCancel });
        } else {
            form.post('/nastaveni/hesla', { preserveScroll: true, onSuccess: onCancel });
        }
    }

    return (
        <form onSubmit={handleSubmit} className="rounded-xl border border-primary/30 bg-card p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <Label className="text-muted-foreground">Název služby *</Label>
                    <Input
                        value={form.data.name}
                        onChange={e => form.setData('name', e.target.value)}
                        placeholder="např. Email info@thesafari.cz"
                        className="mt-1 bg-muted border-border text-foreground"
                        autoFocus
                    />
                </div>
                <div>
                    <Label className="text-muted-foreground">Login / Uživatel</Label>
                    <Input
                        value={form.data.username}
                        onChange={e => form.setData('username', e.target.value)}
                        placeholder="admin@example.cz"
                        className="mt-1 bg-muted border-border text-foreground"
                    />
                </div>
                <div>
                    <Label className="text-muted-foreground">Heslo</Label>
                    <Input
                        type="text"
                        value={form.data.password}
                        onChange={e => form.setData('password', e.target.value)}
                        placeholder="heslo"
                        className="mt-1 bg-muted border-border text-foreground font-mono"
                    />
                </div>
                <div className="sm:col-span-2">
                    <Label className="text-muted-foreground">URL</Label>
                    <Input
                        value={form.data.url}
                        onChange={e => form.setData('url', e.target.value)}
                        placeholder="https://mail.vas-hosting.cz"
                        className="mt-1 bg-muted border-border text-foreground"
                    />
                </div>
                <div className="sm:col-span-2">
                    <Label className="text-muted-foreground">Poznámka</Label>
                    <Input
                        value={form.data.notes}
                        onChange={e => form.setData('notes', e.target.value)}
                        placeholder="SMTP port 465, SSL"
                        className="mt-1 bg-muted border-border text-foreground"
                    />
                </div>
            </div>
            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Zrušit</Button>
                <Button type="submit" size="sm" disabled={form.processing || !form.data.name} className="bg-primary text-white hover:bg-primary/80">
                    {entry ? 'Uložit' : 'Přidat'}
                </Button>
            </div>
        </form>
    );
}

export default function Vault({ vault }: Props) {
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    function handleDelete(id: number) {
        if (!confirm('Opravdu smazat tento záznam?')) return;
        router.delete(`/nastaveni/hesla/${id}`, { preserveScroll: true });
    }

    return (
        <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">Trezor hesel</h2>
                    <p className="text-sm text-muted-foreground">Uložená hesla k emailům, SMTP, službám a dalším.</p>
                </div>
                {!showForm && (
                    <Button size="sm" onClick={() => setShowForm(true)} className="bg-primary text-white hover:bg-primary/80">
                        <Plus className="h-4 w-4 mr-1" />
                        Nové heslo
                    </Button>
                )}
            </div>

            {showForm && (
                <div className="mb-4">
                    <VaultForm onCancel={() => setShowForm(false)} />
                </div>
            )}

            {vault.length === 0 && !showForm ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <KeyRound className="mb-3 h-10 w-10" />
                    <p className="text-sm">Žádná uložená hesla</p>
                    <p className="mt-1 text-xs">Klikněte na "Nové heslo" pro přidání.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {vault.map(entry => (
                        editingId === entry.id ? (
                            <VaultForm key={entry.id} entry={entry} onCancel={() => setEditingId(null)} />
                        ) : (
                            <div key={entry.id} className="rounded-lg bg-accent p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-foreground">{entry.name}</p>
                                            {entry.url && (
                                                <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80" title="Otevřít">
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                </a>
                                            )}
                                        </div>
                                        {entry.username && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-muted-foreground">Login:</span>
                                                <span className="text-foreground">{entry.username}</span>
                                            </div>
                                        )}
                                        {entry.password && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-muted-foreground">Heslo:</span>
                                                <PasswordCell password={entry.password} />
                                            </div>
                                        )}
                                        {entry.notes && (
                                            <p className="text-xs text-muted-foreground">{entry.notes}</p>
                                        )}
                                    </div>
                                    <div className="flex shrink-0 gap-1">
                                        <button onClick={() => setEditingId(entry.id)} className="rounded p-1.5 text-muted-foreground hover:bg-background hover:text-foreground" title="Upravit">
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button onClick={() => handleDelete(entry.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Smazat">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    ))}
                </div>
            )}
        </div>
    );
}
