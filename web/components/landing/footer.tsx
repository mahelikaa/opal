import Link from 'next/link';

const PROTOCOL_LINKS = [
  { label: 'Browse Assertions', href: '/assertion/browse' },
  { label: 'Make Assertion', href: '/assertion/make' },
];

export default function Footer() {
  return (
    <footer className="border-muted-foreground/40 relative overflow-hidden border-t">
      {/* Watermark */}
      <span
        aria-hidden
        className="text-foreground/4 pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 text-[11rem] leading-none font-bold tracking-tighter uppercase select-none md:text-[16rem]"
      >
        Opal
      </span>

      <div className="relative flex w-full flex-col">
        <div className="grid grid-cols-1 md:grid-cols-3">
          {/* Brand */}
          <div className="flex flex-col gap-3 px-4 py-10">
            <span className="text-primary text-[10px] font-semibold tracking-[0.4em] uppercase">
              Opal
            </span>
            <h2 className="text-2xl font-semibold tracking-tight uppercase">
              Resolution you can rely on
            </h2>
            <p className="text-muted-foreground max-w-xs text-xs leading-relaxed uppercase">
              A Solana-native optimistic oracle for natural-language statements.
            </p>
          </div>

          {/* Protocol */}
          <div className="border-muted-foreground/25 flex flex-col gap-4 border-t px-4 py-10 md:border-t-0 md:border-l md:px-10">
            <span className="text-muted-foreground text-[10px] tracking-[0.3em] uppercase">
              Protocol
            </span>
            <nav className="flex flex-col gap-3">
              {PROTOCOL_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-foreground/80 hover:text-primary group flex items-center gap-2 text-sm tracking-wider uppercase transition-colors"
                >
                  <span className="bg-muted-foreground/40 group-hover:bg-primary size-1 transition-colors" />
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Community */}
          <div className="border-muted-foreground/25 flex flex-col gap-4 border-t px-4 py-10 md:border-t-0 md:border-l md:px-10">
            <span className="text-muted-foreground text-[10px] tracking-[0.3em] uppercase">
              Follow
            </span>
            <a
              href="https://x.com/opaldotsol"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:text-primary/80 w-fit text-sm tracking-[0.2em] uppercase underline-offset-8 transition-colors hover:underline"
            >
              X / @opaldotsol
            </a>
          </div>
        </div>

        <div className="border-muted-foreground/25 flex flex-col items-start justify-between gap-3 border-t px-4 py-5 text-xs uppercase sm:flex-row sm:items-center">
          <span className="text-muted-foreground">Built for verifiable outcomes</span>

          <span className="text-muted-foreground flex items-center gap-2 tracking-wider">
            <span className="bg-primary size-1.5 animate-pulse" />
            Solana Devnet
          </span>

          <span className="text-muted-foreground tabular-nums">2026</span>
        </div>
      </div>
    </footer>
  );
}
