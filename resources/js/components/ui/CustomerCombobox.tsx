import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Customer {
    id: number;
    name: string;
    company: string | null;
}

interface Props {
    customers: Customer[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export default function CustomerCombobox({
    customers,
    value,
    onChange,
    placeholder = 'Vyberte zákazníka...',
    className,
}: Props) {
    const [open, setOpen] = useState(false);
    const selected = customers.find((c) => String(c.id) === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        'w-full justify-between border-border bg-accent font-normal',
                        !value && 'text-muted-foreground',
                        className,
                    )}
                >
                    <span className="truncate">
                        {selected
                            ? `${selected.name}${selected.company ? ` (${selected.company})` : ''}`
                            : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 border-border bg-card" align="start">
                <Command>
                    <CommandInput placeholder="Hledat zákazníka..." />
                    <CommandList>
                        <CommandEmpty>Zákazník nenalezen</CommandEmpty>
                        <CommandGroup>
                            {customers.map((c) => (
                                <CommandItem
                                    key={c.id}
                                    value={`${c.name} ${c.company ?? ''}`}
                                    onSelect={() => {
                                        onChange(String(c.id));
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            value === String(c.id) ? 'opacity-100' : 'opacity-0',
                                        )}
                                    />
                                    {c.name}
                                    {c.company && (
                                        <span className="ml-1 text-muted-foreground">({c.company})</span>
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
