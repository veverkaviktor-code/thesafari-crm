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
        post(`/zpravy/${ticketId}/reply`, {
            preserveScroll: true,
            onSuccess: () => reset('content'),
        });
    }

    return (
        <form onSubmit={handleSubmit} className="border-t border-border pt-4">
            <Textarea
                value={data.content}
                onChange={(e) => setData('content', e.target.value)}
                placeholder="Napište odpověď..."
                rows={4}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground resize-none focus:border-primary/50 focus:ring-ring/20"
            />
            {errors.content && (
                <p className="mt-1 text-xs text-red-400">{errors.content}</p>
            )}
            <div className="flex justify-end mt-3">
                <Button
                    type="submit"
                    disabled={processing || !data.content.trim()}
                    className="bg-primary hover:bg-primary/80 text-white"
                >
                    <Send className="h-4 w-4 mr-2" />
                    Odeslat odpověď
                </Button>
            </div>
        </form>
    );
}
