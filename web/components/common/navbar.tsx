'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { ListIcon, XIcon } from '@phosphor-icons/react';
import { AnimatePresence } from 'motion/react';

import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { Button } from '../ui/button';
import NavbarMobile from './mobile-navbar';
import { NavbarAuth } from './navbar-auth';
import { SearchDialog } from './search-dialog';
import Image from 'next/image';

// Landing keeps the max-width frame with dashed verticals; every other route
// runs the navbar full-bleed. One persistent element whose max-width animates
// and whose dashed verticals fade, so route changes glide instead of snapping.
function NavbarFrame({ isLanding, children }: { isLanding: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        'relative mx-auto flex h-16 items-center justify-between border-x border-dashed px-4',
        'transition-[max-width,border-color] duration-500 ease-in-out motion-reduce:transition-none',
        isLanding ? 'border-muted-foreground/50 max-w-400' : 'max-w-[100vw] border-transparent'
      )}
    >
      {children}
    </div>
  );
}

export default function Navbar() {
  const [isMobileNavbarOpen, setIsMobileNavbarOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  // The max-width frame with dashed verticals is a landing-page-only device;
  // every other route runs the navbar full-bleed.
  const isLanding = usePathname() === '/';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCloseSearch = useCallback(() => setIsSearchOpen(false), []);

  return (
    <>
    <div className="bg-background/85 fixed inset-x-0 top-0 z-30 overflow-x-clip backdrop-blur-md">
      <NavbarFrame isLanding={isLanding}>
        <Link href="/" className="flex items-center gap-0.5">
        <span className="size-10 relative overflow-hidden -translate-y-0.75">
          <Image
          src="/img/logo.svg"
          fill
          alt="Opal Logo"
          className="object-cover scale-175"
          />
          </span>
          <span className="font-heading text-lg uppercase">Opal</span>
        </Link>
        <div className="hidden items-center gap-4 md:flex">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsSearchOpen(true)}
            className="bg-muted/40 hover:bg-muted/70 w-64 justify-between px-3 font-normal"
          >
            <div className="text-muted-foreground font-mono text-xs tracking-widest uppercase">Search</div>
            <kbd className="bg-muted text-muted-foreground rounded text-xs">⌘ + K</kbd>
          </Button>
          <NavbarAuth layout="desktop" />
        </div>
        <div className="flex md:hidden">
          <Button
            onClick={() => setIsMobileNavbarOpen(!isMobileNavbarOpen)}
            size="icon-lg"
            variant="outline"
            type="button"
          >
            {isMobileNavbarOpen ? <XIcon /> : <ListIcon />}
          </Button>
        </div>
      </NavbarFrame>
      <span
        className={cn(
          'absolute right-0 bottom-0 left-0 h-0.5 border-b',
          isLanding ? 'border-muted-foreground/50 border-dashed' : 'border-border'
        )}
      />
      <AnimatePresence mode="wait">
        {isMobileNavbarOpen && <NavbarMobile onClose={() => setIsMobileNavbarOpen(false)} />}
      </AnimatePresence>
    </div>
    {/* Outside the blurred header: backdrop-filter creates a containing block,
        which would trap this fixed-position dialog inside the 64px navbar. */}
    <SearchDialog isOpen={isSearchOpen} onClose={handleCloseSearch} />
    </>
  );
}
