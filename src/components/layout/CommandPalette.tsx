import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import {
  COMMAND_GROUP_LABELS,
  COMMAND_GROUP_ORDER,
} from './command-registry';
import { useCommandPaletteActions } from './useCommandPaletteActions';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const actions = useCommandPaletteActions();

  const groupedActions = useMemo(
    () =>
      COMMAND_GROUP_ORDER.map((groupId) => ({
        id: groupId,
        label: COMMAND_GROUP_LABELS[groupId],
        actions: actions.filter((action) => action.group === groupId),
      })).filter((group) => group.actions.length > 0),
    [actions],
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev: boolean) => !prev);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      navigate(href);
    },
    [navigate],
  );

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="hidden sm:inline-flex h-8 w-48 justify-start gap-2 rounded-md border-border bg-muted/40 px-3 text-xs text-muted-foreground hover:bg-muted"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Search workspaces…</span>
        <kbd className="pointer-events-none hidden select-none items-center gap-0.5 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
          <span className="text-[10px]">⌘</span>K
        </kbd>
      </Button>

      {/* Mobile: icon-only trigger */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="h-10 w-10 sm:hidden"
      >
        <Search className="h-4 w-4" />
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Workspace command palette"
        description="Search available workspaces and routed actions based on your current access."
      >
        <CommandInput placeholder="Search workspaces and actions…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {groupedActions.map((group, index) => (
            <div key={group.id}>
              {index > 0 ? <CommandSeparator /> : null}
              <CommandGroup heading={group.label}>
                {group.actions.map((action) => (
                  <CommandItem
                    key={action.id}
                    value={[action.label, action.description, ...(action.keywords ?? [])].join(' ')}
                    onSelect={() => handleSelect(action.href)}
                    className="gap-3"
                  >
                    <action.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate">{action.label}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {action.description}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
