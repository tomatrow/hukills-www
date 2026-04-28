// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreditTier = { label: string; range: string }

// ─── Math ─────────────────────────────────────────────────────────────────────

/**
 * Calculate the estimated monthly payment.
 *
 * Matches Enhancify widget behaviour exactly:
 *  - APR > 0 → standard amortization formula
 *  - APR = 0 → Enhancify's flat 1.5 % / month promo rate (P × 0.015)
 *
 * @param principal  Loan amount in dollars
 * @param apr        Annual percentage rate (0–39)
 * @param term       Number of years (APR > 0) or months (APR = 0)
 * @param isMonthBased  true when APR = 0 (term is in months)
 */
export function calcMonthlyPayment(
	principal: number,
	apr: number,
	term: number,
	isMonthBased: boolean
): number {
	if (apr === 0) {
		// Enhancify promo mode: flat 1.5 % per month, term in months
		return principal * 0.015
	}

	const r = apr / 1200 // monthly rate
	const n = isMonthBased ? term : term * 12 // number of payments
	return (principal * r) / (1 - Math.pow(1 + r, -n))
}

// ─── Credit tiers ─────────────────────────────────────────────────────────────

const TIERS: Array<{ max: number; label: string; range: string }> = [
	{ max: 12.5, label: "Excellent credit", range: "720–850" },
	{ max: 17.7, label: "Good credit", range: "680–719" },
	{ max: 21.9, label: "Average credit", range: "640–679" },
	{ max: 39, label: "Poor credit", range: "300–639" }
]

export function creditTierForAPR(apr: number): CreditTier {
	for (const tier of TIERS) {
		if (apr <= tier.max) return { label: tier.label, range: tier.range }
	}
	return { label: TIERS[TIERS.length - 1].label, range: TIERS[TIERS.length - 1].range }
}

// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatCurrency(value: number, fractionDigits: 0 | 2 = 2): string {
	return value.toLocaleString("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: fractionDigits,
		maximumFractionDigits: fractionDigits
	})
}

export function formatPercent(value: number, digits = 1): string {
	return value.toFixed(digits) + "%"
}
