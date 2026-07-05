'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { motion as m } from 'motion/react';

import Rise from '@/components/common/rise';
import { filterAssertionsByAddress } from '@/data/assertion';
import { getOutcomeLabel } from '@/lib/assertion-labels';
import { computeAssertionStats } from '@/lib/assertion-stats';
import { useAssertions } from '@/lib/assertion-store';
import type { AssertionAccount, ResolutionOutcome } from '@/types';

type VoteStatus = 'ALL' | 'ACTIVE' | 'ALIGNED' | 'MISALIGNED';

interface VoteView {
  id: string;
  assertionId: string;
  statement: string;
  voteWeight: string;
  chosenOutcome: ResolutionOutcome | null;
  status: Exclude<VoteStatus, 'ALL'>;
  reward?: string;
  date: string;
}

// The heaviest side of the tally — the outcome this vote round is backing.
function leadingOutcome(aggregateVotes: Record<ResolutionOutcome, number>) {
  const entries = Object.entries(aggregateVotes) as [ResolutionOutcome, number][];
  const [outcome, weight] = entries.reduce((top, candidate) =>
    candidate[1] > top[1] ? candidate : top
  );
  return weight > 0 ? outcome : null;
}

// Derive votes from assertions with a vote resolution round. Alignment: once the
// assertion is Resolved, a vote whose chosen outcome matches the final outcome is
// ALIGNED, one that differs is MISALIGNED; unresolved rounds are ACTIVE.
function deriveVotes(assertions: AssertionAccount[]): VoteView[] {
  const votes: VoteView[] = [];

  for (const a of assertions) {
    const round = a.voteResolutionRound;
    if (!round) continue;

    const totalVotes = Object.values(round.aggregateVotes).reduce((sum, v) => sum + v, 0);
    const voteWeight =
      totalVotes > 0 ? ((Number(round.totalValidWeight) / totalVotes) * 100).toFixed(1) : '0';

    const chosenOutcome = round.finalOutcome ?? leadingOutcome(round.aggregateVotes);

    let status: Exclude<VoteStatus, 'ALL'>;
    if (a.state !== 'Resolved') {
      status = 'ACTIVE';
    } else {
      status = chosenOutcome && chosenOutcome === a.outcome ? 'ALIGNED' : 'MISALIGNED';
    }

    votes.push({
      id: `${a.id}-vote`,
      assertionId: a.id,
      statement: a.statement,
      voteWeight: `${voteWeight}%`,
      chosenOutcome,
      status,
      // Only aligned votes earn — misaligned and still-active rounds pay nothing yet.
      reward:
        status === 'ALIGNED'
          ? `+${Math.floor(Number(round.totalValidWeight) / 100)} USDC`
          : undefined,
      date: a.createdAt,
    });
  }

  return votes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

const FILTERS: { label: string; value: VoteStatus }[] = [
  { label: 'ALL', value: 'ALL' },
  { label: 'ACTIVE', value: 'ACTIVE' },
  { label: 'ALIGNED', value: 'ALIGNED' },
  { label: 'MISALIGNED', value: 'MISALIGNED' },
];

const STATUS_META: Record<
  Exclude<VoteStatus, 'ALL'>,
  { label: string; dot: string; text: string }
> = {
  ACTIVE: { label: 'ACTIVE', dot: 'bg-purple-400', text: 'text-purple-400' },
  ALIGNED: { label: 'ALIGNED', dot: 'bg-primary', text: 'text-primary' },
  MISALIGNED: { label: 'MISALIGNED', dot: 'bg-red-400', text: 'text-red-400' },
};

const OUTCOME_COLOR: Record<ResolutionOutcome, string> = {
  True: 'text-primary',
  False: 'text-red-400',
  Unresolvable: 'text-zinc-400',
};

export default function VotesPage() {
  const params = useParams<{ address: string }>();
  const address = Array.isArray(params?.address) ? params.address[0] : params?.address;
  // Read from the client store so votes cast this session show up.
  const assertions = filterAssertionsByAddress(address, useAssertions());
  const [filter, setFilter] = useState<VoteStatus>('ALL');
  const [search, setSearch] = useState('');

  const votes = deriveVotes(assertions);
  const stats = computeAssertionStats(assertions);

  const rows = votes.filter((v) => {
    const matchFilter = filter === 'ALL' || v.status === filter;
    const matchSearch = !search || v.statement.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const countByStatus = (status: VoteStatus): number => {
    if (status === 'ALL') return votes.length;
    return votes.filter((v) => v.status === status).length;
  };

  const totalReward = votes.reduce((sum, v) => {
    if (!v.reward) return sum;
    return sum + parseFloat(v.reward.replace('+', '').replace(' USDC', ''));
  }, 0);

  return (
    <div className="flex min-h-[calc(100vh-7.5rem)] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <Rise>
      <div className="border-muted-foreground/20 flex flex-wrap items-center gap-6 border-b py-3 font-mono text-xs tracking-widest uppercase">
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">Total Assertions</div>
          <div className="text-primary tabular-nums">{stats.totalAssertions}</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">Disputes</div>
          <div className="text-primary tabular-nums">{stats.totalDisputes}</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">Active</div>
          <div className="text-primary tabular-nums">{stats.activeAssertions}</div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="text-muted-foreground">Total Rewards</div>
          <div className="text-primary tabular-nums">+{totalReward} USDC</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">Bonded USDC</div>
          <div className="tabular-nums">{stats.totalBondPUSD}</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">Vote Stake Locked</div>
          <div className="tabular-nums">
            {Intl.NumberFormat().format(stats.totalValidWeight || 0)}
          </div>
        </div>
      </div>
      </Rise>

      <Rise delay={0.08}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => {
            const isActive = filter === f.value;
            const count = countByStatus(f.value);
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`relative flex items-center gap-1.5 rounded-none px-3 py-1.5 font-mono text-xs tracking-widest uppercase transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:bg-muted-foreground/5 hover:text-foreground'
                }`}
              >
                {isActive && (
                  <m.span
                    layoutId="filter-pill"
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="bg-primary/10 ring-primary/20 absolute inset-0 ring-1"
                  />
                )}
                <span className="relative z-10">{f.label}</span>
                <span
                  className={`relative z-10 px-1 font-mono text-xs tabular-nums ${isActive ? 'bg-primary/20 text-primary' : 'bg-muted-foreground/10 text-muted-foreground'}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <input
          type="text"
          placeholder="SEARCH..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-muted/10 border-muted-foreground/20 placeholder:text-muted-foreground/40 focus:ring-primary/40 h-10 w-full rounded-none border px-4 font-mono text-sm tracking-widest uppercase focus:ring-1 focus:outline-none sm:w-80"
        />
      </div>
      </Rise>

      <Rise delay={0.16} className="flex flex-1 flex-col">
      <section className="border-muted-foreground/30 bg-muted/5 flex flex-1 flex-col border">
        <div className="flex flex-1 flex-col overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-muted-foreground/20 border-b text-left">
                <th className="text-muted-foreground w-[45%] px-5 py-3 font-mono text-xs font-normal tracking-widest uppercase">
                  Assertion
                </th>
                <th className="text-muted-foreground px-5 py-3 font-mono text-xs font-normal tracking-widest uppercase">
                  Consensus
                </th>
                <th className="text-muted-foreground px-5 py-3 font-mono text-xs font-normal tracking-widest uppercase">
                  Weight
                </th>
                <th className="text-muted-foreground px-5 py-3 font-mono text-xs font-normal tracking-widest uppercase">
                  Status
                </th>
                <th className="text-muted-foreground px-5 py-3 font-mono text-xs font-normal tracking-widest uppercase">
                  Reward
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const { dot, text } = STATUS_META[row.status];

                return (
                  <m.tr
                    layout
                    key={row.id}
                    className="group border-muted-foreground/10 hover:bg-muted/10 border-b transition-colors last:border-none"
                  >
                    <td className="w-[45%] px-5 py-4">
                      <Link
                        href={`/assertion/browse/${row.assertionId}`}
                        className="group-hover:text-primary line-clamp-1 text-sm transition-colors"
                      >
                        {row.statement}
                      </Link>
                    </td>

                    <td
                      className={`px-5 py-4 font-mono text-xs tracking-widest uppercase ${row.chosenOutcome ? OUTCOME_COLOR[row.chosenOutcome] : 'text-muted-foreground'}`}
                    >
                      {row.chosenOutcome ? getOutcomeLabel(row.chosenOutcome) : '—'}
                    </td>

                    <td className="text-muted-foreground px-5 py-4 font-mono text-xs tabular-nums">
                      {row.voteWeight}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`size-1.5 shrink-0 rounded-full ${dot}`} />
                        <span className={`font-mono text-xs tracking-widest uppercase ${text}`}>
                          {STATUS_META[row.status].label}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 font-mono text-xs tracking-widest uppercase tabular-nums">
                      {row.reward ? (
                        <span className="text-primary">{row.reward}</span>
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </td>
                  </m.tr>
                );
              })}
            </tbody>
          </table>

          {rows.length === 0 && (
            <div className="flex flex-1 items-center justify-center py-16">
              <span className="text-muted-foreground/50 font-mono text-sm tracking-[0.25em] uppercase">
                No votes found
              </span>
            </div>
          )}
        </div>
      </section>
      </Rise>
    </div>
  );
}
