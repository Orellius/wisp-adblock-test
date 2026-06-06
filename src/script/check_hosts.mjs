// Weekly liveness sweep for the bait-host list. A dead domain reads as
// "blocked" for every visitor, silently inflating scores, so hosts that fail
// DNS or refuse connections on two passes get pruned (with --prune).
// Timeouts are only reported, never pruned: they may be a slow network.
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DATA_PATH = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'../data/adblock_data.json'
)
const REPORT_PATH = path.resolve(process.cwd(), 'liveness-report.md')
const TIMEOUT_MS = 8000
const PASS_GAP_MS = 5000

const prune = process.argv.includes('--prune')

async function probe(host) {
	try {
		await fetch(`https://${host}/fakepage.html`, {
			method: 'HEAD',
			redirect: 'manual',
			signal: AbortSignal.timeout(TIMEOUT_MS)
		})
		return 'alive'
	} catch (error) {
		if (error.name === 'TimeoutError' || error.name === 'AbortError')
			return 'timeout'
		let cause = error.cause
		while (cause && !cause.code && cause.cause) cause = cause.cause
		const code = cause && cause.code ? String(cause.code) : ''
		if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'nxdomain'
		return 'conn-error'
	}
}

async function probeAll(hosts) {
	const results = new Map()
	await Promise.all(
		hosts.map(async (h) => {
			results.set(h, await probe(h))
		})
	)
	return results
}

const data = JSON.parse(await readFile(DATA_PATH, 'utf8'))
const allHosts = Object.values(data).flatMap((providers) =>
	Object.values(providers).flat()
)

const first = await probeAll(allHosts)
const suspects = allHosts.filter((h) => first.get(h) !== 'alive')

let second = new Map()
if (suspects.length > 0) {
	await new Promise((r) => setTimeout(r, PASS_GAP_MS))
	second = await probeAll(suspects)
}

const confirmed = suspects.filter((h) => {
	const a = first.get(h)
	const b = second.get(h)
	return a !== 'timeout' && b !== 'alive' && b !== 'timeout'
})
const timeouts = suspects.filter((h) => !confirmed.includes(h))

let report = `## Bait-host liveness sweep\n\n${allHosts.length} hosts probed twice (HEAD, ${TIMEOUT_MS / 1000}s timeout).\n\n`
if (confirmed.length === 0) {
	report += 'No dead hosts confirmed.\n'
} else {
	report += `### Pruned (failed DNS/connection on both passes)\n\n`
	confirmed.forEach((h) => {
		report += `- \`${h}\`: ${second.get(h)}\n`
	})
}
if (timeouts.length > 0) {
	report += `\n### Flaky (timed out at least once; kept, watch these)\n\n`
	timeouts.forEach((h) => {
		report += `- \`${h}\`: ${first.get(h)} / ${second.get(h) || 'alive'}\n`
	})
}
await writeFile(REPORT_PATH, report)
console.log(report)

if (prune && confirmed.length > 0) {
	for (const providers of Object.values(data)) {
		for (const [name, hosts] of Object.entries(providers)) {
			providers[name] = hosts.filter((h) => !confirmed.includes(h))
			if (providers[name].length === 0) delete providers[name]
		}
	}
	await writeFile(DATA_PATH, JSON.stringify(data, null, '\t') + '\n')
	console.log(`Pruned ${confirmed.length} host(s) from adblock_data.json`)
}
