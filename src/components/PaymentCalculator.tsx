import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Info, ArrowRight } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import {
	APPLY_URL,
	LOAN_MIN,
	LOAN_MAX,
	LOAN_STEP,
	LOAN_DEFAULT,
	APR_MIN,
	APR_MAX,
	APR_STEP,
	APR_DEFAULT,
	TERM_YEAR_MIN,
	TERM_YEAR_MAX,
	TERM_YEAR_DEFAULT,
	TERM_MONTH_MIN,
	TERM_MONTH_MAX,
	TERM_MONTH_DEFAULT,
	calcMonthlyPayment,
	creditTierForAPR,
	formatCurrency,
	formatPercent
} from "@/lib/financing"

// ─── helpers ──────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max)
}

function snapLoan(value: number) {
	return clamp(Math.round(value / LOAN_STEP) * LOAN_STEP, LOAN_MIN, LOAN_MAX)
}

// ─── component ────────────────────────────────────────────────────────────────

export default function PaymentCalculator() {
	const [loan, setLoan] = useState(LOAN_DEFAULT)
	const [apr, setApr] = useState(APR_DEFAULT)
	const [term, setTerm] = useState(TERM_YEAR_DEFAULT)

	// When APR = 0 Enhancify switches to a month-based term
	const isPromo = apr === 0
	const termMin = isPromo ? TERM_MONTH_MIN : TERM_YEAR_MIN
	const termMax = isPromo ? TERM_MONTH_MAX : TERM_YEAR_MAX
	const termLabel = isPromo ? "months" : "years"

	// Clamp term into the valid range whenever APR mode switches
	const effectiveTerm = clamp(term, termMin, termMax)

	const monthly = calcMonthlyPayment(loan, apr, effectiveTerm, isPromo)
	const tier = creditTierForAPR(apr)

	// APR slider thumb position 0–100 %
	const aprPct = ((apr - APR_MIN) / (APR_MAX - APR_MIN)) * 100

	// ── loan input handlers ──────────────────────────────────────────────────

	const [loanInput, setLoanInput] = useState("")
	const [loanFocused, setLoanFocused] = useState(false)

	function handleLoanFocus() {
		setLoanFocused(true)
		setLoanInput(String(loan))
	}
	function handleLoanBlur() {
		setLoanFocused(false)
		const parsed = parseFloat(loanInput.replace(/[^0-9.]/g, ""))
		if (!isNaN(parsed)) setLoan(snapLoan(parsed))
		setLoanInput("")
	}

	// ── APR input handlers ───────────────────────────────────────────────────

	const [aprInput, setAprInput] = useState("")
	const [aprFocused, setAprFocused] = useState(false)

	function handleAprFocus() {
		setAprFocused(true)
		setAprInput(formatPercent(apr))
	}
	function handleAprBlur() {
		setAprFocused(false)
		const parsed = parseFloat(aprInput.replace(/[^0-9.]/g, ""))
		if (!isNaN(parsed)) {
			const snapped = Math.round(clamp(parsed, APR_MIN, APR_MAX) / APR_STEP) * APR_STEP
			setApr(Math.round(snapped * 10) / 10)
		}
		setAprInput("")
	}

	// ── term input handlers ──────────────────────────────────────────────────

	const [termInput, setTermInput] = useState("")
	const [termFocused, setTermFocused] = useState(false)

	function handleTermFocus() {
		setTermFocused(true)
		setTermInput(String(effectiveTerm))
	}
	function handleTermBlur() {
		setTermFocused(false)
		const parsed = parseInt(termInput, 10)
		if (!isNaN(parsed)) setTerm(clamp(parsed, termMin, termMax))
		setTermInput("")
	}

	// ── APR change (slider / input) ──────────────────────────────────────────

	function changeApr(next: number) {
		const rounded = Math.round(next * 10) / 10
		setApr(rounded)
		// When crossing into/out of 0 % promo, reset term to the new range's default
		const wasPromo = apr === 0
		const willBePromo = rounded === 0
		if (wasPromo !== willBePromo) {
			setTerm(willBePromo ? TERM_MONTH_DEFAULT : TERM_YEAR_DEFAULT)
		}
	}

	return (
		<Card className="bg-card border-border">
			<CardHeader className="pb-2">
				<CardTitle className="font-display text-2xl uppercase tracking-tight">
					Payment Estimator
				</CardTitle>
				<p className="text-sm text-muted-foreground">
					Adjust the sliders to estimate your monthly payment.
				</p>
			</CardHeader>

			<CardContent className="space-y-8">
				{/* ── Loan amount ─────────────────────────────────────────── */}
				<div className="space-y-3">
					<div className="flex items-center justify-between gap-4">
						<Label className="text-base font-medium">Loan amount</Label>
						<Input
							className="w-36 text-right font-mono text-sm"
							value={loanFocused ? loanInput : formatCurrency(loan, 0)}
							onFocus={handleLoanFocus}
							onBlur={handleLoanBlur}
							onChange={(e) => setLoanInput(e.target.value)}
							inputMode="numeric"
						/>
					</div>
					<Slider
						min={LOAN_MIN}
						max={LOAN_MAX}
						step={LOAN_STEP}
						value={[loan]}
						onValueChange={([v]) => setLoan(v)}
					/>
					<div className="flex justify-between text-xs text-muted-foreground">
						<span>{formatCurrency(LOAN_MIN, 0)}</span>
						<span>{formatCurrency(LOAN_MAX, 0)}</span>
					</div>
				</div>

				{/* ── APR ─────────────────────────────────────────────────── */}
				<div className="space-y-3">
					<div className="flex items-center justify-between gap-4">
						<div className="flex items-center gap-1.5">
							<Label className="text-base font-medium">APR</Label>
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										type="button"
										className="text-muted-foreground hover:text-foreground transition-colors"
										aria-label="APR information"
									>
										<Info className="h-4 w-4" />
									</button>
								</TooltipTrigger>
								<TooltipContent side="top" className="max-w-xs">
									<p className="font-semibold">{tier.label}</p>
									<p className="text-xs text-muted-foreground">Credit score {tier.range}</p>
									<p className="mt-1 text-xs">
										Your actual rate depends on creditworthiness and is determined at time of
										application.
									</p>
								</TooltipContent>
							</Tooltip>
						</div>
						<Input
							className="w-24 text-right font-mono text-sm"
							value={aprFocused ? aprInput : formatPercent(apr)}
							onFocus={handleAprFocus}
							onBlur={handleAprBlur}
							onChange={(e) => setAprInput(e.target.value)}
							inputMode="decimal"
						/>
					</div>

					{/* Slider + floating tier badge */}
					<div className="relative pb-6">
						<Slider
							min={APR_MIN}
							max={APR_MAX}
							step={APR_STEP}
							value={[apr]}
							onValueChange={([v]) => changeApr(v)}
						/>
						{/* Credit-tier badge floats above the thumb */}
						<span
							className="pointer-events-none absolute -top-7 -translate-x-1/2 whitespace-nowrap rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground"
							style={{ left: `${aprPct}%` }}
						>
							{tier.label}
						</span>
					</div>

					<div className="flex justify-between text-xs text-muted-foreground">
						<span>{formatPercent(APR_MIN)} — promo rate</span>
						<span>{formatPercent(APR_MAX, 0)}</span>
					</div>
				</div>

				{/* ── Term ────────────────────────────────────────────────── */}
				<div className="space-y-3">
					<div className="flex items-center justify-between gap-4">
						<Label className="text-base font-medium">
							Financing term{" "}
							<span className="font-normal text-muted-foreground">({termLabel})</span>
						</Label>
						<div className="flex items-center gap-1.5">
							<Input
								className="w-20 text-right font-mono text-sm"
								value={termFocused ? termInput : String(effectiveTerm)}
								onFocus={handleTermFocus}
								onBlur={handleTermBlur}
								onChange={(e) => setTermInput(e.target.value)}
								inputMode="numeric"
							/>
							<span className="text-sm text-muted-foreground">{termLabel}</span>
						</div>
					</div>
					<Slider
						min={termMin}
						max={termMax}
						step={1}
						value={[effectiveTerm]}
						onValueChange={([v]) => setTerm(v)}
					/>
					<div className="flex justify-between text-xs text-muted-foreground">
						<span>
							{termMin} {termLabel}
						</span>
						<span>
							{termMax} {termLabel}
						</span>
					</div>
				</div>

				{/* ── Result panel ─────────────────────────────────────────── */}
				<div className="rounded-lg bg-primary px-6 py-5 text-center text-primary-foreground">
					<p className="text-sm font-medium uppercase tracking-wider opacity-80">
						Estimated monthly payment
					</p>
					<AnimatePresence mode="popLayout">
						<motion.p
							key={monthly.toFixed(2)}
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
							transition={{ duration: 0.15 }}
							className="mt-1 font-display text-5xl font-bold tracking-tight"
						>
							{formatCurrency(monthly)}
						</motion.p>
					</AnimatePresence>
					<p className="mt-2 text-sm opacity-70">Total financed {formatCurrency(loan, 0)}</p>
				</div>

				{/* ── Apply CTA ────────────────────────────────────────────── */}
				<Button asChild size="lg" className="w-full">
					<a href={APPLY_URL} target="_blank" rel="noopener noreferrer">
						Apply Now
						<ArrowRight className="ml-2 h-4 w-4" />
					</a>
				</Button>
			</CardContent>
		</Card>
	)
}
