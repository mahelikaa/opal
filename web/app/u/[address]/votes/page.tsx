'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

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
          ? `+${Math.floor(Number(round.totalValidWeight) / 100)} OPAL`
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
  TooEarly: 'text-cyan-400',
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
    return sum + parseFloat(v.reward.replace('+', '').replace(' OPAL', ''));
  }, 0);

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      {/* status bar */}
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
          <div className="text-primary tabular-nums">+{totalReward} OPAL</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">Bonded USDC</div>
          <div className="tabular-nums">{stats.totalBondPUSD}</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">OPAL Locked</div>
          <div className="tabular-nums">
            {Intl.NumberFormat().format(stats.totalValidWeight || 0)}
          </div>
        </div>
      </div>

      {/* filter + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => {
            const isActive = filter === f.value;
            const count = countByStatus(f.value);
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`flex items-center gap-1.5 rounded-none px-3 py-1.5 font-mono text-xs tracking-widest uppercase transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary ring-primary/20 ring-1'
                    : 'text-muted-foreground hover:bg-muted-foreground/5 hover:text-foreground'
                }`}
              >
                {f.label}
                <span
                  className={`px-1 font-mono text-xs tabular-nums ${isActive ? 'bg-primary/20 text-primary' : 'bg-muted-foreground/10 text-muted-foreground'}`}
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
          className="bg-muted/10 border-muted-foreground/20 placeholder:text-muted-foreground/40 focus:ring-primary/40 h-8 w-48 rounded-none border px-3 font-mono text-xs tracking-widest uppercase focus:ring-1 focus:outline-none"
        />
      </div>

      {/* table */}
      <section className="border-muted-foreground/30 bg-muted/5 border">
        <div className="overflow-x-auto">
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
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-muted-foreground/40 py-16 text-center font-mono text-xs tracking-widest uppercase"
                  >
                    No votes found
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const { dot, text } = STATUS_META[row.status];

                  return (
                    <tr
                      key={row.id}
                      className="group border-muted-foreground/10 hover:bg-muted/10 border-b transition-colors last:border-none"
                    >
                      {/* statement */}
                      <td className="w-[45%] px-5 py-4">
                        <Link
                          href={`/assertion/browse/${row.assertionId}`}
                          className="group-hover:text-primary line-clamp-1 text-sm transition-colors"
                        >
                          {row.statement}
                        </Link>
                      </td>

                      {/* consensus */}
                      <td
                        className={`px-5 py-4 font-mono text-xs tracking-widest uppercase ${row.chosenOutcome ? OUTCOME_COLOR[row.chosenOutcome] : 'text-muted-foreground'}`}
                      >
                        {row.chosenOutcome ? getOutcomeLabel(row.chosenOutcome) : '—'}
                      </td>

                      {/* weight */}
                      <td className="text-muted-foreground px-5 py-4 font-mono text-xs tabular-nums">
                        {row.voteWeight}
                      </td>

                      {/* status */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`size-1.5 shrink-0 rounded-full ${dot}`} />
                          <span className={`font-mono text-xs tracking-widest uppercase ${text}`}>
                            {STATUS_META[row.status].label}
                          </span>
                        </div>
                      </td>

                      {/* reward */}
                      <td className="px-5 py-4 font-mono text-xs tracking-widest uppercase tabular-nums">
                        {row.reward ? (
                          <span className="text-primary">{row.reward}</span>
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
