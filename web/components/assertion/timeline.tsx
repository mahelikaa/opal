import { cn } from '@/lib/utils';
import type { AssertionAccount } from '@/types';

// Horizontal lifecycle timeline card. The detail page pins it in-flow at the bottom of
// its fixed-height layout so it never overlaps the content above.
export default function Timeline({ statement }: { statement: AssertionAccount | undefined }) {
  if (!statement) {
    return null;
  }

  const events = [
    {
      date: statement.createdAt,
      title: 'ASSERTED',
      description: 'Optimistic truth activated',
      color: 'bg-orange-400',
      active: true,
    },

    ...(statement.llmDispute
      ? [
          {
            date: statement.llmDispute.createdAt,
            title: 'DISPUTED',
            description: 'LLM dispute submitted',
            color: 'bg-red-400',
            active: true,
          },
        ]
      : []),

    ...(statement.llmResolutionRound
      ? [
          {
            date: statement.llmResolutionRound.resolvedAt,
            title: 'LLM RESOLUTION',
            description: `Proposed ${statement.llmResolutionRound.outcome}`,
            color: 'bg-yellow-400',
            active: true,
          },
        ]
      : []),

    ...(statement.voteDispute
      ? [
          {
            date: statement.voteDispute.createdAt,
            title: 'VOTE CHALLENGE',
            description: `Challenged ${statement.voteDispute.challengedLLMResolution}`,
            color: 'bg-purple-400',
            active: true,
          },
        ]
      : []),

    ...(statement.voteResolutionRound
      ? [
          {
            date: statement.voteResolutionRound.votingStartsAt,
            title: 'VOTING OPEN',
            description: `${Number(
              statement.voteResolutionRound.totalValidWeight
            ).toLocaleString()} vote weight locked`,
            color: 'bg-blue-400',
            active: true,
          },
        ]
      : []),

    {
      date: statement.finalizedAt || statement.livenessDeadline,
      title: statement.finalizedAt ? 'FINALIZED' : 'PENDING FINALIZATION',
      description: statement.finalizedAt
        ? `Resolved ${statement.outcome}`
        : 'Awaiting next resolution phase',
      color: statement.finalizedAt
        ? statement.outcome === 'True'
          ? 'bg-green-400'
          : statement.outcome === 'False'
            ? 'bg-red-400'
            : 'bg-zinc-400'
        : 'bg-zinc-500',
      active: !!statement.finalizedAt,
    },
  ];

  return (
    <div className="w-full">
      <div className="border-muted-foreground/50 bg-background/85 border px-6 py-4 shadow-lg backdrop-blur-md">
        <span className="text-muted-foreground/75 font-mono text-xs tracking-[0.25em] uppercase">
          Lifecycle
        </span>

        <div className="no-scrollbar mt-3 flex overflow-x-auto">
          {events.map((event, index) => {
            const isLast = index === events.length - 1;

            return (
              <div
                key={`${event.title}-${index}`}
                className={cn('flex min-w-36 flex-col gap-2', !isLast && 'flex-1')}
              >
                <div className="flex items-center">
                  <span
                    className={cn(
                      'ring-secondary z-10 size-2 shrink-0 rounded-full ring-2',
                      event.color
                    )}
                  />

                  {!isLast && (
                    <span className="border-muted-foreground/50 mx-2 h-px flex-1 border-t border-dashed" />
                  )}
                </div>

                <div className="flex flex-col gap-0.5 pr-6">
                  <span className="text-muted-foreground font-mono text-[10px] whitespace-nowrap uppercase tabular-nums">
                    {event.date
                      ? new Date(event.date).toLocaleDateString('en-US', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Pending'}
                  </span>

                  <span
                    className={cn(
                      'font-mono text-xs tracking-widest whitespace-nowrap uppercase',
                      event.active ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {event.title}
                  </span>

                  <span className="text-muted-foreground text-xs leading-relaxed">
                    {event.description}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
