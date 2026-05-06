<<<<<<< HEAD
import { ClockIcon } from '@phosphor-icons/react';
=======
import { Clock } from '@phosphor-icons/react';
>>>>>>> ba81415 (fix: resolved few more coderabbit reviews)
import { AnimatePresence, motion as m } from 'motion/react';

interface WindowOption {
  label: string;
  value: number;
}

interface Props {
  open: boolean;
  bond: number;
  window_: WindowOption;
  setWindow: (w: WindowOption) => void;
  windows: WindowOption[];
  formatExpiry: (s: number) => string;
}

function formatRelativeExpiry(expiryText: string) {
  const target = new Date(expiryText).getTime();
  if (Number.isNaN(target)) return expiryText;

  const diff = Math.max(0, target - Date.now());
  const totalHours = Math.floor(diff / 3_600_000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0) {
    return hours > 0 ? `in ${days}d ${hours}h` : `in ${days}d`;
  }

  return hours > 0 ? `in ${hours}h` : 'soon';
}

export default function ParamsSection({
  open,
  bond,
  window_,
  setWindow,
  windows,
  formatExpiry,
}: Props) {
  return (
    <m.div
      className="flex flex-col overflow-hidden"
      animate={{ flex: open ? 1 : 0 }}
      transition={{ duration: 0.35, ease: [0.32, 0, 0.67, 0] }}
      style={{ minHeight: 0 }}
    >
      <AnimatePresence>
        {open && (
          <m.div
<<<<<<< HEAD
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative flex h-full flex-col justify-center overflow-hidden p-4 md:p-5"
            transition={{ duration: 0.2 }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.055)_1px,transparent_0)] bg-size-[16px_16px] opacity-35" />
            <div className="to-background/15 pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-transparent" />

            <div className="relative flex flex-col gap-8">
              <div className="mb-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <ClockIcon size={14} className="text-muted-foreground/75" />
                    <div className="text-muted-foreground/85 text-xs tracking-[0.2em] uppercase">
                      Dispute Window
                    </div>
                  </div>

                  <div className="text-muted-foreground/75 text-xs uppercase">
                    Stake duration determines challenge period
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                  {windows.map((w) => {
                    const active = window_.value === w.value;
                    return (
                      <m.button
                        key={w.value}
                        onClick={() => setWindow(w)}
                        className={`relative flex h-12 items-center justify-center rounded-md border px-3 text-[11px] tracking-wide uppercase transition-colors duration-150 ${
                          active
                            ? 'border-primary/80 bg-primary/10 text-primary'
                            : 'border-muted-foreground/20 text-muted-foreground hover:border-muted-foreground/40 hover:bg-muted/10'
                        }`}
                      >
                        <div className="text-muted-foreground/85 z-10">{w.label}</div>
                      </m.button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex flex-col items-center gap-3">
                  <div className="text-muted-foreground/85 text-xs tracking-widest uppercase">
                    Bond
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-primary text-2xl leading-none font-extralight tracking-tight">
                      {bond} PUSD
                    </div>
                  </div>

                  <div className="text-muted-foreground/85 text-xs tracking-wide uppercase">
                    {formatRelativeExpiry(formatExpiry(window_?.value ?? windows[0]?.value))}
                  </div>
                </div>
=======
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative h-full"
          >
            <div className="absolute top-0 left-6 right-6 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent" />

            <div className="grid h-full grid-cols-1 gap-0 px-6 py-8 md:grid-cols-2">
              <div className="flex flex-col justify-center gap-6 pr-0 md:pr-10">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground/40 uppercase">
                    01 /
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground/55 uppercase">
                    Dispute Window
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {windows.map((w, i) => {
                    const active = window_ && window_.value === w.value;
                    return (
                      <m.button
                        key={w.value}
                        onClick={() => setWindow(w)}
                        whileTap={{ scale: 0.97 }}
                        className={`relative px-4 py-2.5 font-mono text-sm transition-all duration-200 ${
                          active
                            ? 'text-primary'
                            : 'text-muted-foreground/50 hover:text-muted-foreground/80'
                        }`}
                      >
                        <span
                          className={`absolute inset-0 transition-all duration-200 ${
                            active
                              ? 'border border-primary/60 shadow-[inset_0_0_12px_rgba(var(--primary-rgb),0.06),0_0_0_1px_rgba(var(--primary-rgb),0.08)]'
                              : 'border border-muted-foreground/15 hover:border-muted-foreground/30'
                          }`}
                        />
                        {active && (
                          <>
                            <span className="absolute top-0 left-0 h-1.5 w-1.5 border-t border-l border-primary/80" />
                            <span className="absolute top-0 right-0 h-1.5 w-1.5 border-t border-r border-primary/80" />
                            <span className="absolute bottom-0 left-0 h-1.5 w-1.5 border-b border-l border-primary/80" />
                            <span className="absolute bottom-0 right-0 h-1.5 w-1.5 border-b border-r border-primary/80" />
                          </>
                        )}
                        <span className="relative">{w.label}</span>
                      </m.button>
                    );
                  })}
                </div>

                <p className="font-mono text-[11px] leading-relaxed text-muted-foreground/35 max-w-70">
                  Shorter windows resolve faster. Longer windows allow more time to dispute.
                </p>
              </div>

              <div className="hidden md:block absolute left-1/2 top-8 bottom-8 w-px bg-linear-to-b from-transparent via-muted-foreground/15 to-transparent" />

              <div className="flex flex-col justify-center gap-7 border-t border-dashed border-muted-foreground/15 pt-7 md:border-t-0 md:pt-0 md:pl-10">

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground/40 uppercase">
                      02 /
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground/55 uppercase">
                      Assertion Bond
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground/30 border border-muted-foreground/20 px-1.5 py-0.5 tracking-wider">
                      FIXED
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2.5">
                    <span className="font-mono text-4xl font-light tracking-tight text-primary leading-none">
                      {bond}
                    </span>
                    <span className="font-mono text-base text-primary/60 tracking-widest">PUSD</span>
                  </div>

                  <p className="font-mono text-[11px] text-muted-foreground/35">
                    ↩ Returned if undisputed within window.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="h-px bg-muted-foreground/10" />

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground/40 uppercase">
                      03 /
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground/55 uppercase">
                      Resolution Timing
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5 pl-0.5">
                    <Clock
                      size={13}
                      className="mt-0.75 shrink-0 text-muted-foreground/35"
                    />
                    <div className="font-mono text-sm leading-6 text-muted-foreground/50 space-y-0.5">
                      <div>
                        Window{' '}
                        <span className="text-foreground/75 font-medium">
                          {window_?.label}
                        </span>
                      </div>
                      <div>
                        Expires{' '}
                        <span className="text-foreground/75 font-medium">
                          {formatExpiry(window_?.value ?? windows[0]?.value)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

>>>>>>> ba81415 (fix: resolved few more coderabbit reviews)
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
}