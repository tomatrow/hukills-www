import type { Handle } from "@sveltejs/kit"
import { dev } from "$app/env"
import { VERCEL_ENV } from "$app/env/private"
import customCode from "$lib/cms/custom-code.json"

/** `<!--custom-code:*-->` placeholders in `app.html`, mapped to their CMS field. */
const slotFields = {
	head: "head",
	"body-start": "bodyStart",
	"body-end": "bodyEnd"
} as const

type Slot = keyof typeof slotFields

const PLACEHOLDER = /<!--custom-code:(head|body-start|body-end)-->/g

// VERCEL_ENV is static, so this is fixed at build time: prerendered pages bake
// the snippets in, and runtime-rendered pages (the 404) match them.
const notProductionReason =
	dev || VERCEL_ENV !== "production" ? `not production (VERCEL_ENV=${VERCEL_ENV || "unset"})` : ""

/**
 * Fill the CMS-managed custom code slots (Tracking & Custom Code singleton).
 * Snippets render only in production and never on the /admin CMS shell; elsewhere
 * each slot becomes a comment so it's visible why nothing was injected.
 */
export const handle: Handle = ({ event, resolve }) => {
	const suppressedReason =
		notProductionReason || (/^\/admin(\/|$)/.test(event.route.id ?? "") ? "/admin" : "")

	return resolve(event, {
		transformPageChunk: ({ html }) =>
			// Function replacer so `$` sequences in snippets are inserted literally.
			// Every slot keeps a marker comment: SvelteKit's dev check warns ("Removing
			// comments in transformPageChunk can break Svelte's hydration") whenever the
			// comment count drops, even though these slots sit outside hydrated markup.
			html.replace(PLACEHOLDER, (_, slot: Slot) =>
				suppressedReason ?
					`<!-- custom code (${slot}) suppressed: ${suppressedReason} -->`
				:	`<!-- custom code (${slot}) -->${customCode[slotFields[slot]] || ""}`
			)
	})
}
