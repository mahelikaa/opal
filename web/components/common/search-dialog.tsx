'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

function isValidSearchAddress(value: string) {
  if (!value) return false;
  if (/\s/.test(value)) return false;
  const isEthAddress = /^0x[a-fA-F0-9]{40}$/.test(value);
  const isEnsName = /^(?!-)[a-z0-9-]{1,63}(?:\.[a-z0-9-]{2,63})+$/i.test(value);
  const isBase58Address = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
  return isEthAddress || isEnsName || isBase58Address;
}

const ADDRESS_FORMATS = [
  { label: 'ETH', hint: '0x…' },
  { label: 'ENS', hint: '*.eth' },
  { label: 'SOL', hint: 'base58' },
];

export function SearchDialog({ isOpen, onClose }: SearchDialogProps) {
  const [walletAddress, setWalletAddress] = useState('');
  const [attempted, setAttempted] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const normalized = walletAddress.trim();
  const isInputValid = isValidSearchAddress(normalized);
  const showError = attempted && normalized.length > 0 && !isInputValid;

  useEffect(() => {
    if (!isOpen) return;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusables = dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) return;
    lastFocusedRef.current?.focus?.();
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    if (!isInputValid) return;
    router.push(`/u/${encodeURIComponent(normalized)}`);
    setWalletAddress('');
    setAttempted(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[18vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={cn(
          'relative mx-4 w-full max-w-2xl',
          'bg-background border-border border',
          'shadow-2xl shadow-black/60',
          'animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150'
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-dialog-title"
        ref={dialogRef}
      >
        {/* Top bar */}
        <div className="border-border flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="bg-primary size-1.5" />
            <span
              id="search-dialog-title"
              className="text-muted-foreground font-mono text-[11px] font-medium tracking-[0.2em] uppercase"
            >
              search profiles
            </span>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="text-muted-foreground/50 hover:text-foreground flex items-center gap-2 transition-colors"
          >
            <Kbd>Esc</Kbd>
            <XIcon className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Input row */}
          <div
            className={cn(
              'flex h-16 items-center gap-3 border-b px-5 transition-colors',
              showError ? 'border-destructive/50' : 'border-border'
            )}
          >
            <MagnifyingGlassIcon
              className={cn(
                'size-5 shrink-0',
                showError ? 'text-destructive/70' : 'text-muted-foreground/50'
              )}
            />

            <span className="text-muted-foreground/40 shrink-0 font-mono text-sm select-none">
              /u/
            </span>

            <input
              ref={inputRef}
              id="search-input"
              type="text"
              placeholder="0x… · name.eth · base58"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              aria-invalid={showError}
              aria-describedby={showError ? 'search-dialog-error' : undefined}
              className={cn(
                'placeholder:text-muted-foreground/30 w-full bg-transparent font-mono text-base outline-none md:text-lg',
                showError ? 'text-destructive' : 'text-foreground'
              )}
            />

            {showError && (
              <p
                id="search-dialog-error"
                className="text-destructive shrink-0 font-mono text-[10px] tracking-widest uppercase"
              >
                invalid address
              </p>
            )}
          </div>

          {/* Accepted formats */}
          <div className="border-border flex items-center gap-2 border-b px-5 py-3.5">
            <span className="text-muted-foreground/40 mr-1 font-mono text-[10px] tracking-[0.2em] uppercase">
              Formats
            </span>

            {ADDRESS_FORMATS.map((fmt) => (
              <span
                key={fmt.label}
                className="border-border inline-flex items-center gap-1.5 border px-2 py-1"
              >
                <span className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
                  {fmt.label}
                </span>
                <span className="text-muted-foreground/50 font-mono text-[10px]">{fmt.hint}</span>
              </span>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-muted-foreground/40 flex items-center gap-2 font-mono text-[10px] tracking-wider uppercase select-none">
              <Kbd>↵</Kbd> Search
            </span>

            <Button type="submit" disabled={!isInputValid} className="uppercase">
              Search Profile
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
