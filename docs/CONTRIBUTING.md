# Contributing to Stratalyx

## Getting Started

```bash
git clone <repo>
cd stratalyx
npm install
cp .env.example .env
# Fill in your API keys in .env
npm run dev
```

## Branching Strategy

```
main          ← production-ready, protected
develop       ← integration branch
feature/xxx   ← new features (branch from develop)
fix/xxx       ← bug fixes (branch from develop)
docs/xxx      ← documentation only
```

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org):

```
feat(screener): add sector filter to stock table
fix(analyzer): clamp moatScore when LLM returns > 10
docs(adr): add ADR-008 for rate limiting strategy
test(unit): add edge cases for extractJson()
refactor(engine): split analyze.ts into fmp.ts + prompt.ts
chore(deps): update msw to 2.3.1
```

## Before Opening a PR

```bash
npm run typecheck   # 0 TypeScript errors
npm test            # 0 test failures
npm run lint        # 0 ESLint errors
```

Coverage must not drop below:
- Statements: 90%
- Lines: 90%
- Functions: 85%
- Branches: 80%

## Adding a New Investor

1. Open `src/constants/investors.ts`
2. Add a new `Investor` object — TypeScript will flag any missing required fields
3. Required fields: `id`, `name`, `shortName`, `era`, `style`, `tagline`, `avatar`, `color`, `ctx`, `rules` (≥4), `equations` (≥2)
4. The `ctx` field is injected verbatim into every LLM prompt for this investor — write it as if briefing an analyst
5. Test avatar URL loads correctly
6. Run `npm run typecheck`
7. Manually verify the strategy appears correctly in the Strategies page

## Code Style

- TypeScript strict mode — no `any`
- Functional components only — no class components
- No external UI component libraries
- All colours from `C` token object — no hardcoded hex
- All async logic in hooks or engine — not in reducer
- All HTTP calls via `/api/*` proxy — never direct from browser

## Documentation

When making significant changes, update the relevant docs:
- New feature → `docs/PRD.md` (Feature Requirements section)
- Architecture change → `docs/ADR.md` (new ADR entry)
- Any change → `docs/CHANGELOG.md` (Unreleased section)
- Breaking convention → `CLAUDE.md` (update the relevant rule)
