'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { motion as m } from 'motion/react';

import Rise from '@/components/common/rise';
import { filterAssertionsByAddress } from '@/data/assertion';
import { computeAssertionStats } from '@/lib/assertion-stats';
import { useAssertions } from '@/lib/assertion-store';
import type { AssertionAccount, LLMDisputeAccount, VoteDisputeAccount } from '@/types';

type DisputeStatus = 'ALL' | 'LLM' | 'VOTING' | 'WON' | 'LOST' | 'NO_FAULT';

interface DisputeView {
  id: string;
  assertionId: string;
  statement: string;
  type: 'LLM' | 'VOTE';
  status: Exclude<DisputeStatus, 'ALL'>;
  bondUSDC: number;
  pnl: string | null;
  date: string;
  timestamp: number;
}

function disputeStatus(
  dispute: LLMDisputeAccount | VoteDisputeAccount,
  pending: 'LLM' | 'VOTING'
): Exclude<DisputeStatus, 'ALL'> {
  if (!dispute.settled) return pending;
  // Unresolvable settles no-fault: disputeCorrect stays null and the bond is returned.
  if (dispute.disputeCorrect === null) return 'NO_FAULT';
  return dispute.disputeCorrect ? 'WON' : 'LOST';
}

function disputePnl(dispute: LLMDisputeAccount | VoteDisputeAccount): string | null {
  if (!dispute.settled) return null;
  if (dispute.disputeCorrect === null) return '±0 USDC';
  return dispute.disputeCorrect
    ? `+${dispute.bondAmountPUSD} USDC`
    : `-${dispute.bondAmountPUSD} USDC`;
}

function deriveDisputes(assertions: AssertionAccount[]): DisputeView[] {
  const disputes: DisputeView[] = [];

  for (const a of assertions) {
    if (a.llmDispute) {
      disputes.push({
        id: `${a.id}-llm`,
        assertionId: a.id,
        statement: a.statement,
        type: 'LLM',
        status: disputeStatus(a.llmDispute, 'LLM'),
        bondUSDC: a.llmDispute.bondAmountPUSD,
        pnl: disputePnl(a.llmDispute),
        date: new Date(a.llmDispute.createdAt).toLocaleDateString(),
        timestamp: new Date(a.llmDispute.createdAt).getTime(),
      });
    }

    if (a.voteDispute) {
      disputes.push({
        id: `${a.id}-vote`,
        assertionId: a.id,
        statement: a.statement,
        type: 'VOTE',
        status: disputeStatus(a.voteDispute, 'VOTING'),
        bondUSDC: a.voteDispute.bondAmountPUSD,
        pnl: disputePnl(a.voteDispute),
        date: new Date(a.voteDispute.createdAt).toLocaleDateString(),
        timestamp: new Date(a.voteDispute.createdAt).getTime(),
      });
    }
  }

  return disputes.sort((a, b) => b.timestamp - a.timestamp);
}

const FILTERS: { label: string; value: DisputeStatus }[] = [
  { label: 'ALL', value: 'ALL' },
  { label: 'LLM DISPUTE', value: 'LLM' },
  { label: 'VOTING', value: 'VOTING' },
  { label: 'WON', value: 'WON' },
  { label: 'LOST', value: 'LOST' },
  { label: 'NO FAULT', value: 'NO_FAULT' },
];

const STATUS_META: Record<
  Exclude<DisputeStatus, 'ALL'>,
  { label: string; dot: string; text: string }
> = {
  LLM: { label: 'LLM DISPUTE', dot: 'bg-red-400', text: 'text-red-400' },
  VOTING: { label: 'VOTING', dot: 'bg-purple-400', text: 'text-purple-400' },
  WON: { label: 'WON', dot: 'bg-primary', text: 'text-primary' },
  LOST: { label: 'LOST', dot: 'bg-red-500', text: 'text-red-400' },
  NO_FAULT: { label: 'NO FAULT', dot: 'bg-zinc-400', text: 'text-zinc-400' },
};

export default function DisputesPage() {
  const params = useParams<{ address: string }>();
  const address = Array.isArray(params?.address) ? params.address[0] : params?.address;
  // Read from the client store so disputes filed this session show up.
  const assertions = filterAssertionsByAddress(address, useAssertions());
  const [filter, setFilter] = useState<DisputeStatus>('ALL');
  const [search, setSearch] = useState('');

  const disputes = deriveDisputes(assertions);
  const stats = computeAssertionStats(assertions);
  const rows = disputes.filter((d) => {
    const matchFilter = filter === 'ALL' || d.status === filter;
    const matchSearch = !search || d.statement.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const countByStatus = (status: DisputeStatus): number => {
    if (status === 'ALL') return disputes.length;
    return disputes.filter((d) => d.status === status).length;
  };

  return (
    <div className="flex min-h-[calc(100vh-7.5rem)] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <Rise>
      <div className="border-muted-foreground/20 flex items-center gap-6 border-b py-3 font-mono text-xs tracking-widest uppercase">
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">Total Assertions</div>
          <div className="text-primary tabular-nums">{stats.totalAssertions}</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">Disputes</div>
          <div className="text-primary tabular-nums">{stats.totalDisputes}</div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="text-muted-foreground">Active</div>
          <div className="text-primary tabular-nums">{stats.activeAssertions}</div>
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
                  Type
                </th>
                <th className="text-muted-foreground px-5 py-3 font-mono text-xs font-normal tracking-widest uppercase">
                  Status
                </th>
                <th className="text-muted-foreground px-5 py-3 font-mono text-xs font-normal tracking-widest uppercase">
                  Bond
                </th>
                <th className="text-muted-foreground px-5 py-3 font-mono text-xs font-normal tracking-widest uppercase">
                  P&L
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const { label, dot, text } = STATUS_META[row.status];

                return (
                  <m.tr
                    layout
                    key={row.id}
                    className="group border-muted-foreground/10 hover:bg-muted/10 border-b transition-colors last:border-none"
                  >
                    <td colSpan={5} className="p-0">
                      <Link
                        href={`/assertion/browse/${row.assertionId}`}
                        className="grid grid-cols-[45%_1fr_1fr_1fr_1fr] items-center"
                      >
                        <div className="group-hover:text-primary line-clamp-1 px-5 py-4 text-sm transition-colors">
                          {row.statement}
                        </div>

                        <div className="px-5 py-4">
                          <span
                            className={`border px-2 py-0.5 font-mono text-xs tracking-widest uppercase ${
                              row.type === 'LLM'
                                ? 'border-red-400/40 text-red-400'
                                : 'border-purple-400/40 text-purple-400'
                            }`}
                          >
                            {row.type}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 px-5 py-4">
                          <span className={`size-1.5 shrink-0 rounded-full ${dot}`} />
                          <span className={`font-mono text-xs tracking-widest uppercase ${text}`}>
                            {label}
                          </span>
                        </div>

                        <div className="text-muted-foreground px-5 py-4 font-mono text-xs tracking-widest uppercase tabular-nums">
                          {row.bondUSDC} USDC
                        </div>

                        <div className="px-5 py-4 font-mono text-xs tracking-widest uppercase tabular-nums">
                          {row.pnl === null ? (
                            <span className="text-muted-foreground/30">—</span>
                          ) : row.pnl.startsWith('+') ? (
                            <span className="text-primary">{row.pnl}</span>
                          ) : (
                            <span className="text-red-400">{row.pnl}</span>
                          )}
                        </div>
                      </Link>
                    </td>
                  </m.tr>
                );
              })}
            </tbody>
          </table>

          {rows.length === 0 && (
            <div className="flex flex-1 items-center justify-center py-16">
              <span className="text-muted-foreground/50 font-mono text-sm tracking-[0.25em] uppercase">
                No disputes found
              </span>
            </div>
          )}
        </div>
      </section>
      </Rise>
    </div>
  );
}
