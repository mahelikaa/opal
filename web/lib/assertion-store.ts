'use client';

import { useSyncExternalStore } from 'react';

import { ASSERTIONS } from '@/data/assertion';
import type { AssertionAccount, ResolutionOutcome } from '@/types';

// Client-side in-memory store seeded from the mock data. It lets created assertions
// and mock state transitions survive navigation (make → browse → detail) until real
// on-chain reads replace it. Resets on hard refresh.
let assertions: AssertionAccount[] = ASSERTIONS;

// Local record of the connected user's cast vote per assertion id. Mock — real voting
// will read this from the voter's on-chain vote account. Resets on hard refresh.
let userVotes: Record<string, ResolutionOutcome> = {};
const EMPTY_USER_VOTES: Record<string, ResolutionOutcome> = {};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return assertions;
}

function getServerSnapshot() {
  return ASSERTIONS;
}

export function useAssertions() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function getUserVotesSnapshot() {
  return userVotes;
}

function getUserVotesServerSnapshot() {
  return EMPTY_USER_VOTES;
}

export function useUserVote(id: string | undefined): ResolutionOutcome | null {
  const votes = useSyncExternalStore(subscribe, getUserVotesSnapshot, getUserVotesServerSnapshot);
  return (id && votes[id]) || null;
}

export function addAssertion(assertion: AssertionAccount) {
  assertions = [assertion, ...assertions];
  emit();
}

export function updateAssertion(
  id: string,
  update: (assertion: AssertionAccount) => AssertionAccount
) {
  assertions = assertions.map((assertion) => (assertion.id === id ? update(assertion) : assertion));
  emit();
}

// --- Mock protocol transitions ---------------------------------------------------------
// These mirror the programs/opal instructions and are the seams where real transaction
// submission will replace store updates. No on-chain calls are made yet.

const OUTCOME_CODES: Record<ResolutionOutcome, 0 | 1 | 2 | 3> = {
  True: 0,
  False: 1,
  TooEarly: 2,
  Unresolvable: 3,
};

// Short mock windows so the full lifecycle stays walkable in one session.
const MOCK_CHALLENGE_WINDOW_MS = 5 * 60 * 1000;
const MOCK_VOTING_WINDOW_MS = 5 * 60 * 1000;

// Mirrors `dispute_assertion` — challenges the default optimistic TRUE.
export function fileLlmDispute(id: string, disputer: string) {
  const now = new Date().toISOString();
  updateAssertion(id, (prev) => ({
    ...prev,
    state: 'PendingLLM',
    disputeCount: 1,
    llmDispute: {
      pubkey: `MOCK_LLM_DISPUTE_${prev.id}`,
      disputer,
      bondAmountPUSD: prev.bondAmountPUSD,
      createdAt: now,
      settlementResolution: null,
      disputeCorrect: null,
      settled: false,
    },
    llmResolutionRound: {
      pubkey: `MOCK_LLM_ROUND_${prev.id}`,
      outcomeCode: 0,
      outcome: null,
      promptHash: 'pending',
      resolvedAt: null,
      challengeDeadline: null,
    },
  }));
}

// Mirrors `submit_llm_resolution` — permissionless once the council feeds have posted.
// Mock: the chosen outcome stands in for the three-feed majority vote.
export function submitLlmResolution(id: string, outcome: ResolutionOutcome) {
  const now = new Date();
  updateAssertion(id, (prev) => {
    if (!prev.llmResolutionRound) return prev;
    return {
      ...prev,
      state: 'AssertedLLM',
      llmResolutionRound: {
        ...prev.llmResolutionRound,
        outcomeCode: OUTCOME_CODES[outcome],
        outcome,
        resolvedAt: now.toISOString(),
        challengeDeadline: new Date(now.getTime() + MOCK_CHALLENGE_WINDOW_MS).toISOString(),
      },
    };
  });
}

// Mirrors `challenge_llm_resolution` — challenges the proposed LLM outcome.
export function fileVoteDispute(id: string, disputer: string) {
  const now = new Date().toISOString();
  updateAssertion(id, (prev) => {
    if (!prev.llmResolutionRound) return prev;
    return {
      ...prev,
      state: 'PendingVote',
      disputeCount: 2,
      voteDispute: {
        pubkey: `MOCK_VOTE_DISPUTE_${prev.id}`,
        disputer,
        challengedLLMResolution: prev.llmResolutionRound.outcome,
        bondAmountPUSD: prev.bondAmountPUSD,
        createdAt: now,
        settlementResolution: null,
        disputeCorrect: null,
        settled: false,
      },
      voteResolutionRound: {
        pubkey: `MOCK_VOTE_ROUND_${prev.id}`,
        votingStartsAt: null,
        votingDeadline: null,
        totalValidWeight: 0n,
        aggregateVotes: { True: 0, False: 0, TooEarly: 0, Unresolvable: 0 },
        finalOutcome: null,
      },
    };
  });
}

// Mirrors `open_vote` — permissionless; sets the voting window.
export function openVote(id: string) {
  const startsAt = new Date();
  const deadline = new Date(startsAt.getTime() + MOCK_VOTING_WINDOW_MS);
  updateAssertion(id, (prev) => {
    if (!prev.voteResolutionRound) return prev;
    return {
      ...prev,
      state: 'Voting',
      voteResolutionRound: {
        ...prev.voteResolutionRound,
        votingStartsAt: startsAt.toISOString(),
        votingDeadline: deadline.toISOString(),
      },
    };
  });
}

// Mock vote weight until MagicBlock-weighted TWAV voting is wired.
export const MOCK_VOTE_WEIGHT = 5000;

// Mock vote casting — real MagicBlock-weighted TWAV voting is not wired yet.
export function castVote(id: string, outcome: ResolutionOutcome, weight: number) {
  userVotes = { ...userVotes, [id]: outcome };
  updateAssertion(id, (prev) => {
    if (!prev.voteResolutionRound) return prev;
    const aggregateVotes = { ...prev.voteResolutionRound.aggregateVotes };
    aggregateVotes[outcome] += weight;

    const leadingOutcome = (Object.entries(aggregateVotes) as [ResolutionOutcome, number][]).reduce(
      (leader, candidate) => (candidate[1] > leader[1] ? candidate : leader)
    )[0];

    return {
      ...prev,
      voteResolutionRound: {
        ...prev.voteResolutionRound,
        aggregateVotes,
        totalValidWeight: prev.voteResolutionRound.totalValidWeight + BigInt(weight),
        finalOutcome: leadingOutcome,
      },
    };
  });
}

// Mirrors `finalize_undisputed` / `finalize_llm_resolution` / `finalize_vote_resolution`
// depending on the current state. Sets the terminal outcome and settles dispute bonds.
export function finalizeAssertion(id: string) {
  const now = new Date().toISOString();
  updateAssertion(id, (prev) => {
    if (prev.state === 'Asserted') {
      return { ...prev, state: 'Resolved', outcome: 'True', finalizedAt: now };
    }

    if (prev.state === 'AssertedLLM' && prev.llmResolutionRound?.outcome) {
      const outcome = prev.llmResolutionRound.outcome;
      return {
        ...prev,
        state: 'Resolved',
        outcome,
        finalizedAt: now,
        llmDispute: prev.llmDispute && {
          ...prev.llmDispute,
          settlementResolution: outcome,
          disputeCorrect: outcome !== 'True',
          settled: true,
        },
      };
    }

    if (prev.state === 'Voting' && prev.voteResolutionRound) {
      const entries = Object.entries(prev.voteResolutionRound.aggregateVotes) as [
        ResolutionOutcome,
        number,
      ][];
      const [leading, weight] = entries.reduce((top, candidate) =>
        candidate[1] > top[1] ? candidate : top
      );
      const outcome: ResolutionOutcome = weight > 0 ? leading : 'Unresolvable';

      return {
        ...prev,
        state: 'Resolved',
        outcome,
        finalizedAt: now,
        voteResolutionRound: { ...prev.voteResolutionRound, finalOutcome: outcome },
        llmDispute: prev.llmDispute && {
          ...prev.llmDispute,
          settlementResolution: outcome,
          disputeCorrect: outcome !== 'True',
          settled: true,
        },
        voteDispute: prev.voteDispute && {
          ...prev.voteDispute,
          settlementResolution: outcome,
          disputeCorrect: outcome !== prev.voteDispute.challengedLLMResolution,
          settled: true,
        },
      };
    }

    return prev;
  });
}
