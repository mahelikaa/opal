# Indeterminate assertions settle no-fault

`TooEarly` and `Unresolvable` are merged into a single `Unresolvable` outcome, and an assertion that resolves `Unresolvable` settles **no-fault**: both asserter and disputer bonds are returned, no one is slashed, and the assertion is voided (re-assert later if it becomes determinable). This replaces the rule that treated any `outcome != True` — including indeterminate — as "disputer correct, asserter slashed."

**Why.** `Unresolvable` means nobody was provably wrong: the world wasn't decidable under the spec yet. The old `!= True` rule unjustly slashed the asserter (or, under a True-fallback, the disputer) for a non-determination. `TooEarly` and `Unresolvable` behave identically in settlement, so two codes added no value.

**Considered options.** Timed resolution — assertions carry a resolves-at date and can't finalize early — is more principled but a heavier lifecycle change, deferred to `Vision`. Keeping the `!= True` rule was rejected because of the injustice above.

**Consequences.** No-fault can't be gamed: a frivolous dispute on a genuinely _resolvable_ claim still lands on True/False and is still slashed; only truly indeterminate claims hit the no-fault path. Well-written specs that state _when_ a statement resolves make `Unresolvable`-by-prematurity rare. Builds on [ADR-0001](0001-rubric-relative-truth.md) (indeterminacy is relative to the spec).
