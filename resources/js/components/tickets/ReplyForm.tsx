import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

interface ReplyFormProps {
    ticketId: number;
}

export default function ReplyForm({ ticketId }: ReplyFormProps) {
    const { data, setData, post, processing, reset, errors } = useForm({
        content: '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(`/pozadavky/${ticketId}/reply`, {
            preserveScroll: true,
            onSuccess: () => reset('content'),
        });
    }

    return (
        <form onSubmit={handleSubmit} className="border-t border-[#F5F0E8]/[0.05] pt-4">
            <Textarea
                value={data.content}
                onChange={(e) => setData('content', e.target.value)}
                placeholder="Napište odpověď..."
                rows={4}
                className="bg-[#0f0e0c] border-[#F5F0E8]/[0.06] text-[#F5F0E8]/85 placeholder:text-[#6B6560] resize-none focus:border-[#D97706]/50 focus:ring-[#D97706]/20"
            />
            {errors.content && (
                <p className="mt-1 text-xs text-red-400">{errors.content}</p>
            )}
            <div className="flex justify-end mt-3">
                <Button
                    type="submit"
                    disabled={processing || !data.content.trim()}
                    className="bg-[#D97706] hover:bg-[#B45309] text-white"
                >
                    <Send className="h-4 w-4 mr-2" />
                    Odeslat odpověď
                </Button>
            </div>
        </form>
    );
}
