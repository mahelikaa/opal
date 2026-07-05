'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { ListIcon, XIcon } from '@phosphor-icons/react';
import { AnimatePresence } from 'motion/react';

import Container from '../common/container';
import { Button } from '../ui/button';
import NavbarMobile from './mobile-navbar';
import { NavbarAuth } from './navbar-auth';
import { SearchDialog } from './search-dialog';
import Image from 'next/image';

export default function Navbar() {
  const [isMobileNavbarOpen, setIsMobileNavbarOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

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
    <div className="bg-background/85 fixed inset-x-0 top-0 z-30 overflow-x-clip backdrop-blur-md">
      <Container className="border-muted-foreground/50 relative flex h-16 items-center justify-between border-x border-dashed px-4">
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
      </Container>
      <span className="border-muted-foreground/50 absolute right-0 bottom-0 left-0 h-0.5 border-b border-dashed" />
      <AnimatePresence mode="wait">
        {isMobileNavbarOpen && <NavbarMobile onClose={() => setIsMobileNavbarOpen(false)} />}
      </AnimatePresence>
      <SearchDialog isOpen={isSearchOpen} onClose={handleCloseSearch} />
    </div>
  );
}
