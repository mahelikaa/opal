'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { filterAssertionsByAddress } from '@/data/assertion';
import { getOutcomeLabel } from '@/lib/assertion-labels';
import { computeAssertionStats } from '@/lib/assertion-stats';
import { useAssertions } from '@/lib/assertion-store';
import { getTimeRemaining } from '@/lib/helpers';
import type { AssertionAccount, AssertionState, ResolutionOutcome } from '@/types';

type AssertionStateFilter = 'ALL' | 'ASSERTED' | 'LLM_DISPUTE' | 'VOTING' | 'RESOLVED';

interface AssertionView {
  id: string;
  statement: string;
  state: Exclude<AssertionStateFilter, 'ALL'>;
  outcome: ResolutionOutcome | null;
  disputes: number;
  bondUSDC: number;
  createdAt: string;
  expiresIn?: string;
}

const STATE_FILTER_MAP: Record<AssertionState, Exclude<AssertionStateFilter, 'ALL'>> = {
  Asserted: 'ASSERTED',
  PendingLLM: 'LLM_DISPUTE',
  AssertedLLM: 'LLM_DISPUTE',
  PendingVote: 'VOTING',
  Voting: 'VOTING',
  Resolved: 'RESOLVED',
};

function deriveAssertions(assertions: AssertionAccount[]): AssertionView[] {
  return assertions.map((a) => ({
    id: a.id,
    statement: a.statement,
    state: STATE_FILTER_MAP[a.state],
    // Outcome is only meaningful once the assertion is resolved.
    outcome: a.state === 'Resolved' ? a.outcome : null,
    disputes: a.disputeCount,
    bondUSDC: a.bondAmountPUSD,
    createdAt: new Date(a.createdAt).toLocaleDateString(),
    expiresIn: getTimeRemaining(a.livenessDeadline),
  }));
}

const FILTERS: { label: string; value: AssertionStateFilter }[] = [
  { label: 'ALL', value: 'ALL' },
  { label: 'ASSERTED', value: 'ASSERTED' },
  { label: 'LLM DISPUTE', value: 'LLM_DISPUTE' },
  { label: 'VOTING', value: 'VOTING' },
  { label: 'RESOLVED', value: 'RESOLVED' },
];

const STATE_META: Record<AssertionStateFilter, { label: string; dot: string }> = {
  ALL: { label: 'ALL', dot: 'bg-muted-foreground' },
  ASSERTED: { label: 'ASSERTED', dot: 'bg-blue-400' },
  LLM_DISPUTE: { label: 'LLM DISPUTE', dot: 'bg-red-400' },
  VOTING: { label: 'VOTING', dot: 'bg-purple-400' },
  RESOLVED: { label: 'RESOLVED', dot: 'bg-cyan-400' },
};

const OUTCOME_COLOR: Record<ResolutionOutcome, string> = {
  True: 'text-primary',
  False: 'text-red-400',
  TooEarly: 'text-cyan-400',
  Unresolvable: 'text-zinc-400',
};

export default function AssertionsPage() {
  const params = useParams<{ address: string }>();
  const address = Array.isArray(params?.address) ? params.address[0] : params?.address;
  // Read from the client store so assertions created or mutated this session show up.
  const assertions = filterAssertionsByAddress(address, useAssertions());
  const [filter, setFilter] = useState<AssertionStateFilter>('ALL');
  const [search, setSearch] = useState('');

  const rowsSource = deriveAssertions(assertions);
  const stats = computeAssertionStats(assertions);
  const rows = rowsSource.filter((a) => {
    const matchFilter = filter === 'ALL' || a.state === filter;
    const matchSearch = !search || a.statement.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const countByState = (state: AssertionStateFilter): number => {
    if (state === 'ALL') return rowsSource.length;
    return rowsSource.filter((a) => a.state === state).length;
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      {/* consistent slim status bar */}
      <div className="border-muted-foreground/20 flex items-center gap-6 border-b py-3 font-mono text-xs tracking-widest uppercase">
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
            const count = countByState(f.value);
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
                  State
                </th>
                <th className="text-muted-foreground px-5 py-3 font-mono text-xs font-normal tracking-widest uppercase">
                  Outcome
                </th>
                <th className="text-muted-foreground px-5 py-3 font-mono text-xs font-normal tracking-widest uppercase">
                  Disputes
                </th>
                <th className="text-muted-foreground px-5 py-3 font-mono text-xs font-normal tracking-widest uppercase">
                  Bond
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
                    No assertions found
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const { dot } = STATE_META[row.state];
                  const outcomeColor = row.outcome
                    ? OUTCOME_COLOR[row.outcome]
                    : 'text-muted-foreground';
                  return (
                    <tr
                      key={row.id}
                      className="group border-muted-foreground/10 hover:bg-muted/10 border-b transition-colors last:border-none"
                    >
                      <td colSpan={5} className="p-0">
                        <Link
                          href={`/assertion/browse/${row.id}`}
                          className="grid grid-cols-[45%_1fr_1fr_1fr_1fr] items-center"
                        >
                          {/* statement */}
                          <div className="group-hover:text-primary line-clamp-2 px-5 py-4 text-sm transition-colors">
                            {row.statement}
                          </div>

                          {/* state */}
                          <div className="flex items-center gap-2 px-5 py-4">
                            <span className={`size-1.5 rounded-full ${dot}`} />
                            <span className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
                              {STATE_META[row.state].label}
                            </span>
                          </div>

                          {/* outcome */}
                          <div
                            className={`px-5 py-4 font-mono text-xs tracking-widest uppercase ${outcomeColor}`}
                          >
                            {row.outcome ? getOutcomeLabel(row.outcome) : 'Pending'}
                          </div>

                          {/* disputes */}
                          <div className="px-5 py-4 font-mono text-xs tabular-nums">
                            {row.disputes > 0 ? (
                              <span className="text-red-400">{row.disputes}</span>
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </div>

                          {/* bond */}
                          <div className="text-muted-foreground px-5 py-4 font-mono text-xs tracking-widest uppercase tabular-nums">
                            {row.bondUSDC} USDC
                          </div>
                        </Link>
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
