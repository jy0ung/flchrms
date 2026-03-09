import { Filter } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface MobileFilterSheetFilter {
  id: string;
  label?: string;
  control: ReactNode;
}

interface MobileFilterSheetProps {
  filters: MobileFilterSheetFilter[];
  title?: string;
  description?: string;
}

export function MobileFilterSheet({
  filters,
  title = 'Filters',
  description = 'Adjust the current filters for this workspace.',
}: MobileFilterSheetProps) {
  const [open, setOpen] = useState(false);

  if (filters.length === 0) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" className="h-9 rounded-full">
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <div className="grid gap-4 py-4">
          {filters.map((filter) => (
            <div key={filter.id} className="grid gap-2">
              {filter.label ? (
                <label className="text-sm font-medium text-foreground">{filter.label}</label>
              ) : null}
              <div>{filter.control}</div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
