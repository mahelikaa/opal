import type { ReactNode } from 'react';

import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react';
import { m } from 'motion/react';

import { cn } from '@/lib/utils';

export default function SectionHeader({
  label,
  open,
  onClick,
  peek,
  showShortcut,
  shortcutHint,
  step,
  complete,
}: {
  label: string;
  open: boolean;
  onClick: () => void;
  peek?: ReactNode;
  showShortcut?: boolean;
  shortcutHint?: string;
  /** Two-digit step marker, e.g. "01". */
  step?: string;
  /** Marks the section's input as filled/valid — turns the step marker lime. */
  complete?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={cn(
        'border-border hover:bg-muted/50 flex w-full items-center justify-between border-t px-6 py-5 text-left transition-colors',
        open && 'bg-muted/30'
      )}
    >
      <div className="flex flex-1 items-center gap-3">
        {step && (
          <span
            className={cn(
              'flex size-7 shrink-0 items-center justify-center border font-mono text-[11px] tracking-widest transition-colors',
              complete
                ? 'border-primary/60 text-primary'
                : open
                  ? 'border-foreground/40 text-foreground'
                  : 'border-border text-muted-foreground'
            )}
          >
            {complete ? <CheckIcon weight="bold" className="size-3" /> : step}
          </span>
        )}
        <span
          className={cn(
            'font-mono text-sm tracking-widest uppercase transition-colors md:text-base',
            open ? 'text-foreground' : complete ? 'text-foreground/80' : 'text-muted-foreground'
          )}
        >
          {label}
        </span>
        {peek && !open && (
          <m.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-muted-foreground/60 max-w-60 truncate text-xs md:text-sm"
          >
            {peek}
          </m.span>
        )}
        {showShortcut && shortcutHint && (
          <m.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-muted-foreground/50 ml-auto font-mono text-xs"
          >
            {shortcutHint}
          </m.span>
        )}
      </div>
      <m.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
        <CaretDownIcon
          className={cn('size-5 stroke-1', open ? 'text-primary' : 'text-muted-foreground/60')}
        />
      </m.div>
    </button>
  );
}
