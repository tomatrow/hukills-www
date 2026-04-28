# Payment Calculator — In-House Replacement Plan

## Goal

Replace the third-party Enhancify payment calculator widget with an in-house
React/Tailwind/shadcn implementation that produces identical numerical output
and uses the same Apply CTA, but with Hukill's visual design, no external
script, no runtime XHR, and no Shadow DOM.

## Context

The current implementation (`src/components/EnhancifyWidget.tsx`) loads a
vendored 388 KB webpack-dev-build of Enhancify's calculator at runtime
(`public/vendor/enhancify-paymentcalculator.js`), which then XHRs merchant
config from `https://www.enhancify.com?siteaction=paymentcalculatorwidget&...`
to instantiate `new PaymentCalculator(...)` inside a Shadow DOM.

Source inspection of that script confirmed the widget is a **pure client-side
calculator** — no form submission. The only outbound action is a click-through
on the Apply CTA to a static merchant URL.

### Merchant config (page=9933370, fetched once for parity)

| Key            | Value                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| `min_loan`     | `500`                                                                    |
| `max_loan`     | `200000`                                                                 |
| `coBrandedUrl` | `https://www.enhancify.com/hukills?utm_source=widget-payment-calculator` |
| `min_apr`      | unspecified → falls back to `0`                                          |
| `max_apr`      | unspecified → falls back to `39`                                         |

### Calculator behavior (extracted from upstream source)

| Control     | Range           | Step | Default |
| ----------- | --------------- | ---- | ------- |
| Loan amount | $500 – $200,000 | $500 | $20,000 |
| APR         | 0% – 39%        | 0.1% | 12.4%   |
| Term        | 1 – 12 years    | 1    | 5       |

When APR > 0 (standard amortization):

```
monthly = P × (r/1200) / (1 − (1 + r/1200)^(−n×12))
total   = P   // total interest is not displayed
```

When APR = 0 (Enhancify "promo" mode, NOT true 0% interest):

- Term semantics flip to **months**: `1–21`, default `12`
- `monthly = P × 0.015` (1.5% flat fee per month)

APR tooltip credit-tier mapping:

| APR threshold | Tier label                 |
| ------------- | -------------------------- |
| ≤ 12.5%       | Excellent credit (720–850) |
| ≤ 17.7%       | Good credit (680–719)      |
| ≤ 21.9%       | Average credit (640–679)   |
| ≤ 39%         | Poor credit (300–639)      |

## Decisions (confirmed with user)

1. **Slider scaling:** linear, step $500. Power users use the text input for
   precision. Matches Enhancify exactly.
2. **0% APR math:** match Enhancify exactly (`P × 0.015`) so calculator output
   never diverges from what Enhancify offers at apply time.
3. **Color scheme:** Hukill brand tokens (`--primary`, `--card`, `--muted`).
   Calculator should feel native to the page.
4. **Apply URL:** plain link, no query-param pre-fill.
5. **Powered-by attribution:** drop it. We own the UI; Apply CTA already
   navigates to Enhancify.
6. **Tests:** Vitest tests for the math module, including parity assertions
   against known Enhancify outputs.

## File changes

### New files

#### `src/lib/financing.ts` (~60 lines)

Pure math + formatting helpers. No React, no DOM, fully SSR-safe and testable.

```ts
export const APPLY_URL = "https://www.enhancify.com/hukills?utm_source=widget-payment-calculator"

export const LOAN_MIN = 500
export const LOAN_MAX = 200_000
export const LOAN_STEP = 500
export const LOAN_DEFAULT = 20_000

export const APR_MIN = 0
export const APR_MAX = 39
export const APR_STEP = 0.1
export const APR_DEFAULT = 12.4

export const TERM_YEAR_MIN = 1
export const TERM_YEAR_MAX = 12
export const TERM_YEAR_DEFAULT = 5

export const TERM_MONTH_MIN = 1
export const TERM_MONTH_MAX = 21
export const TERM_MONTH_DEFAULT = 12

export type CreditTier = { label: string; range: string }

export function calcMonthlyPayment(
	principal: number,
	apr: number,
	term: number,
	isMonthBased: boolean
): number

export function creditTierForAPR(apr: number): CreditTier

export function formatCurrency(value: number, fractionDigits?: 0 | 2): string

export function formatPercent(value: number, digits?: number): string
```

#### `src/lib/financing.test.ts` (~50 lines)

- **Parity tests** for `calcMonthlyPayment`: 5–6 known input/output pairs
  derived from Enhancify's formula (e.g. P=20000, APR=12.4, term=5 →
  $447.21/mo; assert within $0.01).
- **0% APR mode**: assert `calcMonthlyPayment(20000, 0, 12, true) === 300`.
- **All four credit-tier boundaries** in `creditTierForAPR`.
- Edge cases: min APR (0%), max APR (39%), boundary inputs at tier
  thresholds (12.5, 17.7, 21.9).

#### `src/components/PaymentCalculator.tsx` (~180 lines)

Single component. State held in three `useState` hooks. Re-renders on every
slider change. No effects, no refs needed.

Structure:

```
<Card>
  <CardHeader>
    Payment Estimator
  </CardHeader>
  <CardContent>
    ControlRow: Loan amount
      <Label /> + <Input> (currency formatter on blur)
      min label ── <Slider> ── max label

    ControlRow: APR
      <Label /> + info <Tooltip> + <Input> (percent formatter on blur)
      <div class="relative">
        <Slider />
        <span style="left: {pct}%">{creditTier.label}</span>  // floating badge
      </div>

    ControlRow: Financing term
      <Label /> + <Input type="number"> + "years" / "months" suffix
      <Slider />

    ResultPanel  // Hukill primary gradient background
      "Estimated monthly payment"
      <motion.p key={monthlyPayment}>  // subtle pop animation on change
        {formatCurrency(monthlyPayment, 2)}
      </motion.p>
      "Total amount {formatCurrency(totalAmount, 0)}"

    <Button asChild size="lg" className="w-full">
      <a href={APPLY_URL} target="_blank" rel="noopener noreferrer">
        Apply Now <ArrowRight />
      </a>
    </Button>
  </CardContent>
</Card>
```

Props: none for v1. All ranges and the apply URL are constants from
`@/lib/financing`. Props can be added later if merchant override is needed.

### Modified files

#### `src/pages/Index.tsx`

```diff
- import EnhancifyWidget from "@/components/EnhancifyWidget"
+ import PaymentCalculator from "@/components/PaymentCalculator"

- <EnhancifyWidget
-     page="9933370"
-     color1="#68BA62"
-     color2="#1C418C"
-     coBrandedColor="#FFFFFF"
-     border
- />
+ <PaymentCalculator />
```

Section heading and wrapper unchanged.

### Deleted files

- `src/components/EnhancifyWidget.tsx` (117 lines)
- `public/vendor/enhancify-paymentcalculator.js` (388 KB asset)

## Verification

1. **Tests:** `pnpm test` — all parity tests green.
2. **Type check:** `pnpm check` clean.
3. **Format:** `pnpm format` (Prettier, tabs, no semis, printWidth 100).
4. **Build:** `pnpm build` clean (19 SSG routes still render).
5. **Visual parity (manual):** during dev, temporarily mount both
   `<EnhancifyWidget>` and `<PaymentCalculator>` side-by-side on `/`. Move
   sliders in lockstep, confirm matching monthly-payment values. Delete
   Enhancify side once confirmed.
6. **SPA navigation:** Home → Services → Home, calculator re-renders cleanly
   (pure React, no script injection).
7. **Apply click:** opens
   `https://www.enhancify.com/hukills?utm_source=widget-payment-calculator`
   in a new tab.

## Estimated effort

| File                                           | Change   | Lines       |
| ---------------------------------------------- | -------- | ----------- |
| `src/lib/financing.ts`                         | new      | ~60         |
| `src/lib/financing.test.ts`                    | new      | ~50         |
| `src/components/PaymentCalculator.tsx`         | new      | ~180        |
| `src/pages/Index.tsx`                          | modified | 3-line swap |
| `src/components/EnhancifyWidget.tsx`           | deleted  | −117        |
| `public/vendor/enhancify-paymentcalculator.js` | deleted  | −388 KB     |

Net: ~290 lines added, ~120 lines + 388 KB removed.

## Out of scope (v1)

- Pre-filling Enhancify's apply form via URL params — no public docs; add later
  if Enhancify confirms supported params.
- Amortization schedule expander (year-by-year breakdown) — easy future add.
- CMS-managed loan ranges or apply URL — hardcoded constants for v1; can promote
  to `src/cms/financing.json` later if needed.
- Merchant-config XHR shim — we hardcode the values that XHR returned for
  `page=9933370`, losing the ability for Enhancify to update them server-side,
  but eliminating all enhancify.com runtime calls (except the apply click-through).
