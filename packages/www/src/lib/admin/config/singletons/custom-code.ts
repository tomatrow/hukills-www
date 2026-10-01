import type { CodeField, CollectionFile } from "@sveltia/cms"

const createCodeField = ({ name, label, hint }: { name: string; label: string; hint: string }) =>
	({
		name,
		label,
		widget: "code",
		required: false,
		output_code_only: true,
		default_language: "html",
		allow_language_selection: false,
		hint
	}) satisfies CodeField

const CAVEAT =
	"**Production site only, on every public page. Goes live on save — a broken snippet can break the whole site.**"

export const customCodeSingleton = {
	name: "customCode",
	label: "Tracking & Custom Code",
	file: "packages/www/src/lib/cms/custom-code.json",
	fields: [
		createCodeField({
			name: "head",
			label: "Head Code",
			hint:
				"Raw HTML inserted at the end of `<head>`, e.g. the Google Tag Manager `<script>` or GA4 `gtag` snippet. " +
				"Pages change without a full reload, so tags must track browser history changes (GA4 does by default). " +
				CAVEAT
		}),
		createCodeField({
			name: "bodyStart",
			label: "Body Start Code",
			hint:
				"Raw HTML inserted right after the opening `<body>` tag, e.g. Google Tag Manager's `<noscript>` iframe. " +
				CAVEAT
		}),
		createCodeField({
			name: "bodyEnd",
			label: "Body End Code",
			hint:
				"Raw HTML inserted just before the closing `</body>` tag, e.g. chat widgets or pixels that ask to load at the end of the page. " +
				CAVEAT
		})
	]
} satisfies CollectionFile
