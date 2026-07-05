'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { filterAssertionsByAddress } from '@/data/assertion';
import { getOutcomeLabel, getStageLabel } from '@/lib/assertion-labels';
import { computeAssertionStats, topControversialAssertion } from '@/lib/assertion-stats';
import { useAssertions } from '@/lib/assertion-store';
import { getTimeRemaining } from '@/lib/helpers';
import type { AssertionAccount } from '@/types';

type Stats = ReturnType<typeof computeAssertionStats>;

// Counts settled disputes filed by anyone on this user's assertions (or by the user —
// filterAssertionsByAddress already scopes to both roles).
function settledDisputeRecord(assertions: AssertionAccount[]) {
  let correct = 0;
  let incorrect = 0;

  for (const assertion of assertions) {
    if (assertion.llmDispute?.settled) {
      if (assertion.llmDispute.disputeCorrect) correct += 1;
      else incorrect += 1;
    }
    if (assertion.voteDispute?.settled) {
      if (assertion.voteDispute.disputeCorrect) correct += 1;
      else incorrect += 1;
    }
  }

  return { correct, incorrect, total: correct + incorrect };
}

export default function Activity() {
  const params = useParams<{ address: string }>();
  const address = Array.isArray(params?.address) ? params.address[0] : params?.address;
  // Read from the client store (not the static mock array) so assertions created or
  // mutated this session show up here too.
  const allAssertions = useAssertions();
  const assertions = filterAssertionsByAddress(address, allAssertions);
  const stats = computeAssertionStats(assertions);
  const top = topControversialAssertion(assertions);

  if (assertions.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-16rem)] flex-col items-center justify-center gap-4 px-4 text-center">
        <span className="text-muted-foreground text-xs tracking-[0.3em] uppercase">
          No Activity Yet
        </span>

        <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
          This address has no assertions, disputes, or votes on record.
        </p>

        <Button
          variant="outline"
          className="uppercase"
          nativeButton={false}
          render={<Link href="/assertion/make" />}
        >
          Make an Assertion
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
      {top && <Hero top={top} />}
      <StatsGrid stats={stats} assertions={assertions} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ProtocolActivity assertions={assertions} />
        <ResolutionBreakdown assertions={assertions} />
        <ReputationPanel assertions={assertions} />
      </div>

      <RecentAssertions assertions={assertions} />
    </div>
  );
}

function Hero({ top }: { top: AssertionAccount }) {
  const disputes = top.disputeCount || 0;
  const opalLocked = Number(top.voteResolutionRound?.totalValidWeight ?? 0);
  const votingDeadline = top.voteResolutionRound?.votingDeadline;
  const votingActive = Boolean(votingDeadline && new Date(votingDeadline) > new Date());
  const consensus = top.voteResolutionRound?.finalOutcome ?? top.outcome;

  return (
    <section className="border-muted-foreground/30 bg-muted/5 flex flex-col items-center justify-between gap-6 border-b pb-6 lg:flex-row">
      <div className="flex w-full flex-col gap-3">
        <span className="text-muted-foreground text-center text-xs tracking-[0.3em] uppercase">
          Most Controversial Assertion
        </span>

        <Link
          href={`/assertion/browse/${top.id}`}
          className="hover:text-primary mx-auto max-w-3xl text-center text-2xl font-semibold tracking-tight uppercase transition-colors md:text-4xl"
        >
          {top.statement}
        </Link>

        <div className="flex items-center justify-center gap-6 text-xs uppercase">
          <span className="text-primary">{disputes} Disputes</span>

          <span className="text-primary">{Intl.NumberFormat().format(opalLocked)} OPAL Locked</span>

          {votingActive && <span className="text-primary">Voting Active</span>}
        </div>
      </div>

      <div className="grid w-full grid-cols-2 gap-4 lg:w-auto lg:min-w-[320px]">
        <HeroMeta label="Current Consensus" value={consensus ? getOutcomeLabel(consensus) : '—'} />

        <HeroMeta
          label="Vote Deadline"
          value={votingDeadline ? getTimeRemaining(votingDeadline) : '—'}
        />

        <HeroMeta label="Bond Pool" value={`${top.bondAmountPUSD * (1 + disputes)} PUSD`} />

        <HeroMeta label="Stage" value={getStageLabel(top.state)} />
      </div>
    </section>
  );
}

function StatsGrid({ stats, assertions }: { stats: Stats; assertions: AssertionAccount[] }) {
  const record = settledDisputeRecord(assertions);
  const accuracy = record.total > 0 ? `${Math.round((record.correct / record.total) * 100)}%` : '—';

  const data = [
    { label: 'Assertions Created', value: String(stats.totalAssertions) },
    { label: 'Total Bonded PUSD', value: String(stats.totalBondPUSD) },
    { label: 'OPAL Locked', value: Intl.NumberFormat().format(stats.totalValidWeight || 0) },
    { label: 'Disputes Won', value: String(record.correct) },
    { label: 'Dispute Accuracy', value: accuracy },
    { label: 'Active Assertions', value: String(stats.activeAssertions) },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {data.map((item) => (
        <StatsCard key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
}

function ProtocolActivity({ assertions }: { assertions: AssertionAccount[] }) {
  const activity = assertions
    .flatMap((assertion) => {
      const items: {
        title: string;
        description: string;
        time: string;
        color: string;
        timestamp: number;
      }[] = [];

      const push = (title: string, color: string, date: string | null | undefined) => {
        if (!date) return;
        const ts = new Date(date).getTime();
        items.push({
          title,
          description: assertion.statement,
          time: new Date(ts).toLocaleDateString().toUpperCase(),
          color,
          timestamp: ts,
        });
      };

      push('ASSERTION CREATED', 'bg-orange-400', assertion.createdAt);
      push('LLM DISPUTE OPENED', 'bg-red-400', assertion.llmDispute?.createdAt);
      push('VOTING STARTED', 'bg-purple-400', assertion.voteResolutionRound?.votingStartsAt);
      push('ASSERTION FINALIZED', 'bg-green-400', assertion.finalizedAt);

      return items;
    })
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 4);

  return (
    <Panel title="Protocol Activity">
      {activity.length === 0 ? (
        <EmptyNote>No protocol activity yet.</EmptyNote>
      ) : (
        <div className="flex flex-col text-left">
          {activity.map((item, index) => (
            <div key={index} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={`ring-secondary z-10 aspect-square size-2 rounded-full ring-2 ${item.color}`}
                />

                {index !== activity.length - 1 && (
                  <div className="bg-muted-foreground/30 h-full w-px border-r" />
                )}
              </div>

              <div className="flex flex-1 -translate-y-1.5 flex-col gap-1 border-b pb-6 last:border-none">
                <div className="flex items-center justify-between">
                  <span className="text-sm uppercase">{item.title}</span>

                  <span className="text-muted-foreground text-xs uppercase">{item.time}</span>
                </div>

                <span className="text-muted-foreground text-xs uppercase">{item.description}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function ResolutionBreakdown({ assertions }: { assertions: AssertionAccount[] }) {
  const counters = { true: 0, false: 0, tooEarly: 0, unresolvable: 0 };

  for (const assertion of assertions) {
    const outcome = assertion.voteResolutionRound?.finalOutcome ?? assertion.outcome;
    if (outcome === 'True') counters.true += 1;
    if (outcome === 'False') counters.false += 1;
    if (outcome === 'TooEarly') counters.tooEarly += 1;
    if (outcome === 'Unresolvable') counters.unresolvable += 1;
  }

  const total = counters.true + counters.false + counters.tooEarly + counters.unresolvable || 1;
  const pct = (value: number) => `${Math.round((value / total) * 100)}%`;

  const data = [
    { label: 'True', value: counters.true, width: pct(counters.true), color: 'bg-primary' },
    { label: 'False', value: counters.false, width: pct(counters.false), color: 'bg-red-400' },
    {
      label: 'Too Early',
      value: counters.tooEarly,
      width: pct(counters.tooEarly),
      color: 'bg-cyan-400',
    },
    {
      label: 'Unresolvable',
      value: counters.unresolvable,
      width: pct(counters.unresolvable),
      color: 'bg-zinc-400',
    },
  ];

  return (
    <Panel title="Resolution Breakdown">
      <div className="flex flex-col gap-6">
        {data.map((item) => (
          <div key={item.label} className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs uppercase">
              <span>{item.label}</span>

              <span className="font-mono">{item.value}</span>
            </div>

            <div className="bg-muted-foreground/10 h-3 overflow-hidden">
              <div className={`h-full ${item.color}`} style={{ width: item.width }} />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ReputationPanel({ assertions }: { assertions: AssertionAccount[] }) {
  const record = settledDisputeRecord(assertions);
  const hasHistory = record.total > 0;
  const reputationScore = hasHistory ? Math.round((record.correct / record.total) * 100) : 0;
  const alignment = hasHistory ? `${reputationScore}%` : '—';
  const assertionsOverturned = assertions.filter(
    (assertion) =>
      assertion.voteResolutionRound?.finalOutcome &&
      assertion.outcome &&
      assertion.voteResolutionRound.finalOutcome !== assertion.outcome
  ).length;

  return (
    <Panel title="Oracle Reputation">
      <div className="flex flex-col gap-8">
        <div className="flex items-end justify-between">
          <div className="flex flex-col text-left">
            <span className="text-muted-foreground text-xs uppercase">Reputation Score</span>

            <span className="text-primary text-6xl font-semibold tracking-tighter">
              {hasHistory ? reputationScore : '—'}
            </span>
          </div>

          <div className="flex flex-col items-end gap-1 pb-2">
            <span className="text-primary text-xs uppercase">Accuracy</span>

            <span className="text-muted-foreground text-xs uppercase">
              {hasHistory ? alignment : 'No History'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <MiniMeta label="Correct Disputes" value={String(record.correct)} />

          <MiniMeta label="Incorrect Disputes" value={String(record.incorrect)} />

          <MiniMeta label="Vote Alignment" value={alignment} />

          <MiniMeta label="Assertions Overturned" value={String(assertionsOverturned)} />
        </div>
      </div>
    </Panel>
  );
}

function RecentAssertions({ assertions }: { assertions: AssertionAccount[] }) {
  const rows = assertions.slice(0, 6).map((a) => ({
    id: a.id,
    statement: a.statement,
    stage: getStageLabel(a.state),
    outcome: a.outcome ? getOutcomeLabel(a.outcome) : 'Pending',
    disputes: a.disputeCount || 0,
    bond: `${a.bondAmountPUSD * (1 + (a.disputeCount || 0))} PUSD`,
    outcomeClass:
      a.outcome === 'True'
        ? 'text-primary'
        : a.outcome === 'False'
          ? 'text-red-300'
          : 'text-zinc-400',
  }));

  return (
    <Panel title="Recent Assertions" className="text-left">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-muted-foreground/20 border-b text-left">
              <th className="w-[45%] py-3 text-xs font-medium uppercase">Assertion</th>
              <th className="py-3 text-xs font-medium uppercase">Stage</th>
              <th className="py-3 text-xs font-medium uppercase">Outcome</th>
              <th className="py-3 text-xs font-medium uppercase">Disputes</th>
              <th className="py-3 text-xs font-medium uppercase">Bond Pool</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="group border-muted-foreground/10 hover:bg-muted/5 border-b transition-all duration-200"
              >
                <td colSpan={5} className="p-0">
                  <Link
                    href={`/assertion/browse/${row.id}`}
                    className="grid grid-cols-[45%_1fr_1fr_1fr_1fr] items-center"
                  >
                    <div className="group-hover:text-primary py-5 text-sm uppercase transition-colors">
                      {row.statement}
                    </div>
                    <div className="py-5 text-xs uppercase">{row.stage}</div>

                    <div className={`py-5 text-xs uppercase ${row.outcomeClass}`}>
                      {row.outcome}
                    </div>

                    <div className="py-5 text-xs uppercase">{row.disputes}</div>

                    <div className="py-5 text-xs uppercase">{row.bond}</div>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function StatsCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-muted-foreground/40 bg-muted/5 flex h-28 flex-col items-center justify-center gap-2 border">
      <span className="text-2xl font-medium tracking-tighter">{value}</span>

      <span className="text-muted-foreground/70 text-center text-xs uppercase">{label}</span>
    </div>
  );
}

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`border-muted-foreground/30 bg-muted/5 flex flex-col gap-6 border p-5 text-center ${className ?? ''}`}
    >
      <h2 className="text-muted-foreground text-xs tracking-[0.25em] uppercase">{title}</h2>

      {children}
    </section>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground/70 flex flex-1 items-center justify-center py-8 text-xs uppercase">
      {children}
    </p>
  );
}

function HeroMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-muted-foreground/20 flex flex-col gap-1 border p-3 text-center">
      <span className="text-muted-foreground text-xs uppercase">{label}</span>

      <span className="text-primary text-sm font-semibold uppercase">{value}</span>
    </div>
  );
}

function MiniMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs uppercase">{label}</span>

      <span className="text-sm font-semibold uppercase">{value}</span>
    </div>
  );
}
