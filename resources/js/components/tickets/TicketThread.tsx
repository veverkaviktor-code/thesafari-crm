import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Mail, Reply } from 'lucide-react';

interface TicketMessage {
    id: number;
    direction: 'inbound' | 'outbound';
    from_email: string;
    content: string;
    created_at: string;
    attachments?: { id: number; filename: string; path: string }[];
}

interface TicketThreadProps {
    messages: TicketMessage[];
}

export default function TicketThread({ messages }: TicketThreadProps) {
    if (!messages || messages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-[#6B6560]">
                <Mail className="h-8 w-8 mb-2" />
                <p>Zatím žádné zprávy</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {messages.map((message) => {
                const isInbound = message.direction === 'inbound';
                return (
                    <div
                        key={message.id}
                        className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}
                    >
                        <div
                            className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                                isInbound
                                    ? 'bg-[#0f0e0c] border border-[#F5F0E8]/[0.05] rounded-tl-sm'
                                    : 'bg-[#D97706]/10 border border-[#D97706]/20 rounded-tr-sm'
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-1.5">
                                {isInbound ? (
                                    <Mail className="h-3.5 w-3.5 text-[#6B6560]" />
                                ) : (
                                    <Reply className="h-3.5 w-3.5 text-amber-500" />
                                )}
                                <span className={`text-xs font-medium ${isInbound ? 'text-[#9C9585]' : 'text-amber-400'}`}>
                                    {message.from_email}
                                </span>
                                <span className="text-xs text-[#6B6560]">
                                    {format(new Date(message.created_at), 'd. M. yyyy HH:mm', { locale: cs })}
                                </span>
                            </div>
                            <div className="text-sm text-[#F5F0E8]/70 whitespace-pre-wrap leading-relaxed">
                                {message.content}
                            </div>
                            {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-[#F5F0E8]/[0.05] space-y-1">
                                    {message.attachments.map((att) => (
                                        <a
                                            key={att.id}
                                            href={att.path}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300"
                                        >
                                            <span>📎</span>
                                            {att.filename}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
