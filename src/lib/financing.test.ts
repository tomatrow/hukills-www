import { describe, it, expect } from "vitest"
import { calcMonthlyPayment, creditTierForAPR, formatCurrency, formatPercent } from "./financing"

// ─── calcMonthlyPayment — standard amortization ───────────────────────────────

describe("calcMonthlyPayment (APR > 0)", () => {
	// Standard amortization: monthly = P × (r/1200) / (1 − (1 + r/1200)^(−n×12))
	// Expected values computed from the formula directly (precision to 2 dp).

	it("P=20000 APR=12.4 term=5yr", () => {
		expect(calcMonthlyPayment(20_000, 12.4, 5, false)).toBeCloseTo(448.94, 1)
	})

	it("P=10000 APR=12.4 term=5yr (half principal → half payment)", () => {
		expect(calcMonthlyPayment(10_000, 12.4, 5, false)).toBeCloseTo(224.47, 1)
	})

	it("P=50000 APR=8.0 term=10yr", () => {
		expect(calcMonthlyPayment(50_000, 8.0, 10, false)).toBeCloseTo(606.64, 1)
	})

	it("P=200000 APR=39 term=12yr (max values)", () => {
		expect(calcMonthlyPayment(200_000, 39, 12, false)).toBeCloseTo(6565.63, 0)
	})

	it("P=500 APR=12.4 term=1yr (min loan, min term)", () => {
		expect(calcMonthlyPayment(500, 12.4, 1, false)).toBeCloseTo(44.47, 1)
	})

	it("P=20000 APR=17.7 term=3yr", () => {
		expect(calcMonthlyPayment(20_000, 17.7, 3, false)).toBeCloseTo(720.04, 0)
	})
})

// ─── calcMonthlyPayment — 0 % promo mode ─────────────────────────────────────

describe("calcMonthlyPayment (APR = 0, promo mode)", () => {
	it("P=20000 APR=0 → P × 0.015 = 300", () => {
		expect(calcMonthlyPayment(20_000, 0, 12, true)).toBe(300)
	})

	it("P=500 APR=0 → 7.50", () => {
		expect(calcMonthlyPayment(500, 0, 12, true)).toBe(7.5)
	})

	it("P=200000 APR=0 → 3000", () => {
		expect(calcMonthlyPayment(200_000, 0, 12, true)).toBe(3000)
	})
})

// ─── creditTierForAPR ────────────────────────────────────────────────────────

describe("creditTierForAPR", () => {
	it("APR=0 → Excellent", () => {
		expect(creditTierForAPR(0).label).toBe("Excellent credit")
	})

	it("APR=12.5 → Excellent (boundary)", () => {
		expect(creditTierForAPR(12.5).label).toBe("Excellent credit")
	})

	it("APR=12.6 → Good", () => {
		expect(creditTierForAPR(12.6).label).toBe("Good credit")
	})

	it("APR=17.7 → Good (boundary)", () => {
		expect(creditTierForAPR(17.7).label).toBe("Good credit")
	})

	it("APR=17.8 → Average", () => {
		expect(creditTierForAPR(17.8).label).toBe("Average credit")
	})

	it("APR=21.9 → Average (boundary)", () => {
		expect(creditTierForAPR(21.9).label).toBe("Average credit")
	})

	it("APR=22.0 → Poor", () => {
		expect(creditTierForAPR(22.0).label).toBe("Poor credit")
	})

	it("APR=39 → Poor (max)", () => {
		expect(creditTierForAPR(39).label).toBe("Poor credit")
	})

	it("returns correct range for Excellent", () => {
		expect(creditTierForAPR(10).range).toBe("720–850")
	})

	it("returns correct range for Poor", () => {
		expect(creditTierForAPR(30).range).toBe("300–639")
	})
})

// ─── formatCurrency ──────────────────────────────────────────────────────────

describe("formatCurrency", () => {
	it("formats with 2 decimal places by default", () => {
		expect(formatCurrency(447.21)).toBe("$447.21")
	})

	it("formats with 0 decimal places", () => {
		expect(formatCurrency(20_000, 0)).toBe("$20,000")
	})
})

// ─── formatPercent ───────────────────────────────────────────────────────────

describe("formatPercent", () => {
	it("formats to 1 decimal by default", () => {
		expect(formatPercent(12.4)).toBe("12.4%")
	})

	it("respects custom digits", () => {
		expect(formatPercent(12.4, 0)).toBe("12%")
	})
})
