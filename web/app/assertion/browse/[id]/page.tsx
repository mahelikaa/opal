'use client';

import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { XIcon } from '@phosphor-icons/react';
import { AnimatePresence, motion as m } from 'motion/react';

import DisputeAction from '@/components/assertion/dispute-action';
import Timeline from '@/components/assertion/timeline';
import VotingPanel from '@/components/assertion/voting-panel';
import Container from '@/components/common/container';
import { Button } from '@/components/ui/button';
import { getOutcomeLabel, getStageLabel } from '@/lib/assertion-labels';
import {
  finalizeAssertion,
  openVote,
  submitLlmResolution,
  useAssertions,
  useUserVote,
} from '@/lib/assertion-store';
import { getTimeRemaining, isDeadlinePast } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import type { AssertionAccount, AssertionState } from '@/types';

const DEADLINE_LABELS: Record<AssertionState, string> = {
  Asserted: 'Liveness Window',
  PendingLLM: 'Awaiting LLM',
  AssertedLLM: 'Challenge Window',
  PendingVote: 'Vote Setup',
  Voting: 'Voting Window',
  Resolved: 'Finalized',
};

const STAGE_COLORS: Record<AssertionState, string> = {
  Asserted: 'text-orange-300',
  PendingLLM: 'text-yellow-300',
  AssertedLLM: 'text-yellow-300',
  PendingVote: 'text-purple-300',
  Voting: 'text-blue-300',
  Resolved: 'text-lime-400',
};

export default function StatementPage() {
  const { id } = useParams();
  const idStr = Array.isArray(id) ? id[0] : id;
  const assertions = useAssertions();
  const assertion = assertions.find((s) => s.id === idStr);

  if (!assertion || !idStr) {
    notFound();
  }

  const userVote = useUserVote(idStr);

  const activeDeadline =
    assertion.state === 'AssertedLLM'
      ? (assertion.llmResolutionRound?.challengeDeadline ?? undefined)
      : assertion.state === 'Voting'
        ? (assertion.voteResolutionRound?.votingDeadline ?? undefined)
        : assertion.livenessDeadline;

  const [showEvidenceModal, setShowEvidenceModal] = useState(false);

  // 1s ticker so countdowns and deadline-gated actions re-evaluate live.
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((tick) => tick + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const remainingTime = getTimeRemaining(activeDeadline);
  const votingClosed = isDeadlinePast(assertion.voteResolutionRound?.votingDeadline);

  // Current non-final answer is inferred from state (docs/resolution.md) —
  // `outcome` is only meaningful once Resolved.
  const llmOutcome = assertion.llmResolutionRound?.outcome;
  const isResolved = assertion.state === 'Resolved';
  const consensus =
    assertion.state === 'Asserted'
      ? 'True (Optimistic)'
      : assertion.state === 'PendingLLM'
        ? 'Pending'
        : assertion.state === 'AssertedLLM'
          ? (llmOutcome ?? 'Pending')
          : assertion.state === 'PendingVote' || assertion.state === 'Voting'
            ? `${llmOutcome ?? 'Unknown'} (Challenged)`
            : getOutcomeLabel(assertion.outcome);

  const consensusColor = !isResolved
    ? 'text-lime-400'
    : assertion.outcome === 'True'
      ? 'text-lime-400'
      : assertion.outcome === 'False'
        ? 'text-red-400'
        : 'text-zinc-400';

  return (
    <Container className="border-muted-foreground/50 flex h-screen flex-col overflow-hidden border-x border-dashed pt-16">
      <header className="border-foreground/40 flex h-16 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-8">
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
              {isResolved ? 'Final Outcome' : 'Current Consensus'}
            </span>

            <span className={cn('font-mono text-sm tracking-wider uppercase', consensusColor)}>
              {consensus}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
              Resolution Stage
            </span>

            <span
              className={cn(
                'font-mono text-sm tracking-wider uppercase',
                STAGE_COLORS[assertion.state]
              )}
            >
              {getStageLabel(assertion.state)}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
              Bond Pool
            </span>

            <span className="font-mono text-sm tracking-wider uppercase tabular-nums">
              {assertion.bondAmountPUSD * (1 + assertion.disputeCount)} USDC
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-0.5">
          <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
            {DEADLINE_LABELS[assertion.state]}
          </span>

          <span className="font-mono text-sm tracking-wider text-lime-400 uppercase tabular-nums">
            {assertion.finalizedAt
              ? new Date(assertion.finalizedAt).toLocaleDateString()
              : assertion.state === 'PendingLLM' || assertion.state === 'PendingVote'
                ? 'PENDING'
                : remainingTime}
          </span>
        </div>
      </header>

      <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-6 overflow-y-auto px-6 pt-8 pb-6">
        <AssertionSection
          assertion={assertion}
          onEvidenceClick={() => setShowEvidenceModal(true)}
        />

        {/* Statement stays pinned at the top; the rest centers in the remaining space. */}
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-6">
          <DisputeAction
            assertion={assertion}
            userVote={userVote}
            onSubmitLlmResolution={(outcome) => submitLlmResolution(idStr, outcome)}
            onOpenVote={() => openVote(idStr)}
            onFinalize={() => finalizeAssertion(idStr)}
          />

          {(assertion.llmResolutionRound || assertion.voteResolutionRound) && (
            <div
              className={cn(
                'grid w-full gap-6',
                assertion.llmResolutionRound && assertion.voteResolutionRound && 'lg:grid-cols-2'
              )}
            >
              {assertion.llmResolutionRound && <LLMSection round={assertion.llmResolutionRound} />}

              {assertion.voteResolutionRound && (
                <VotingPanel
                  round={assertion.voteResolutionRound}
                  votingClosed={votingClosed}
                  userVote={userVote}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 px-4 pb-4">
        <Timeline statement={assertion} />
      </div>

      {/* Evidence Modal */}
      <AnimatePresence>
        {showEvidenceModal && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowEvidenceModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <m.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background border-muted-foreground/30 relative mx-4 max-h-96 w-full max-w-2xl overflow-y-auto rounded-md border p-6"
            >
              <div className="via-primary/70 pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent to-transparent" />
              <button
                onClick={() => setShowEvidenceModal(false)}
                className="text-muted-foreground hover:text-foreground absolute top-4 right-4 transition-colors"
              >
                <XIcon size={20} />
              </button>

              <h2 className="mb-4 text-lg uppercase">Auxiliary Evidence</h2>

              <div className="space-y-4">
                <div>
                  <p className="text-muted-foreground mb-2 font-mono text-xs tracking-widest uppercase">
                    Evidence Hash
                  </p>
                  <p className="font-mono text-sm break-all">{assertion.auxiliaryHash}</p>
                </div>

                <div>
                  <p className="text-muted-foreground mb-2 font-mono text-xs tracking-widest uppercase">
                    Source
                  </p>
                  {assertion.auxiliaryUrl && (
                    <Link
                      href={assertion.auxiliaryUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-primary hover:text-primary/80 font-mono text-xs tracking-widest uppercase underline underline-offset-4 transition-colors"
                    >
                      Open Evidence Source →
                    </Link>
                  )}
                </div>

                <div className="text-muted-foreground/75 pt-2 text-xs leading-relaxed">
                  Auxiliary evidence supplied by the asserter to guide LLM and voting
                  interpretation.
                </div>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </Container>
  );
}

function AssertionSection({
  assertion,
  onEvidenceClick,
}: {
  assertion: AssertionAccount;
  onEvidenceClick: () => void;
}) {
  const { disputeCount } = assertion;

  return (
    <section className="flex w-full flex-col items-center gap-5 text-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="max-w-4xl font-sans text-2xl leading-snug text-balance md:text-3xl">
          {assertion.statement}
        </h1>

        <Button onClick={onEvidenceClick} variant="outline" size="sm">
          View Evidence
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-x-12 gap-y-4">
        <Meta label="Assertion Bond" value={`${assertion.bondAmountPUSD} USDC`} center />

        <Meta label="Disputes" value={`${disputeCount}`} center />

        <Meta label="Created" value={new Date(assertion.createdAt).toLocaleDateString()} center />
      </div>
    </section>
  );
}

function LLMSection({ round }: { round: NonNullable<AssertionAccount['llmResolutionRound']> }) {
  return (
    <Section title="LLM Resolution">
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <Meta label="Outcome" value={round.outcome ?? 'PENDING'} />

        <Meta
          label="Resolved At"
          value={round.resolvedAt ? new Date(round.resolvedAt).toLocaleDateString() : 'PENDING'}
        />

        <Meta
          label="Challenge Deadline"
          value={
            round.challengeDeadline
              ? new Date(round.challengeDeadline).toLocaleDateString()
              : 'NONE'
          }
        />

        <Meta label="Prompt Hash" value={`${round.promptHash.slice(0, 12)}...`} />
      </div>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-muted-foreground/30 flex h-full flex-col gap-4 border p-5">
      <h2 className="text-muted-foreground font-mono text-xs tracking-[0.2em] uppercase">
        {title}
      </h2>

      {children}
    </section>
  );
}

function Meta({
  label,
  value,
  center = false,
}: {
  label: string;
  value: string;
  center?: boolean;
}) {
  return (
    <div className={cn('flex flex-col gap-1', center && 'items-center')}>
      <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
        {label}
      </span>

      <span className="font-mono text-sm break-all uppercase tabular-nums">{value}</span>
    </div>
  );
}
