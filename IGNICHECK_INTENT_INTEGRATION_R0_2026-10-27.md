# NorAutoMatch × IgniCheck Conversation Intent R0

**Date:** 2026-10-27
**State:** CANDIDATE / NOT PROMOTED

## Purpose

Put the IgniCheck Conversation Intent Compiler in front of NorAutoMatch inventory search so normal shopper language is translated into bounded search intent before inventory matching.

## Candidate branch

`feature/2026-10-27-ignicheck-conversation-intent-r0`

## Implemented

- Added `src/lib/ignicheck-intent.ts`.
- Added `searchInventoryConversational()` without deleting or changing the existing exact search entrypoint.
- Customer inventory UI now uses the conversational path on this candidate branch.
- Preserves raw shopper text.
- Distinguishes allowed vs excluded body styles.
- Supports hard maximum price and mileage.
- Supports explicit feature hints such as third row / CarPlay.
- Preserves fuel economy as a preference when normalized MPG evidence is unavailable.
- Added regression scenarios based on the observed natural-language failure.

## Core example

Input:

`I want a small sedan that's good on fuel economy, but it could be an SUV. No more than $29,800.`

Expected interpretation:

- allowed body styles: SEDAN or SUV
- price ceiling: $29,800
- fuel economy: preference only
- no invented MPG threshold
- raw query preserved

## Truth boundary

`CONVERSATION_COMPILED != USER_INTENT_FULLY_KNOWN`

`PREFERENCE != HARD_REQUIREMENT`

`FUEL_ECONOMY_PREFERENCE != VERIFIED_MPG_FILTER`

`CANDIDATE_CODE != PRODUCTION_PROVEN`

The session that created this candidate could not run a local TypeScript build because the execution environment could not resolve github.com for cloning. Promotion requires normal repository typecheck/build/regression execution in an environment with the repository available.

## Recommended proof before promotion

1. Run TypeScript typecheck.
2. Run existing inventory-search behavior suite plus new IgniCheck cases.
3. Run Next.js build.
4. Compare old vs conversational search on the recorded NorAutoMatch phrases.
5. Confirm no regression for exact searches such as model/color/AWD/CarPlay.
6. Preview in non-production before production promotion.
