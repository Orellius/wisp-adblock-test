import '../sass/index.sass'
import data from '../data/adblock_data.json'
import packageJSON from '../../package.json'
import { icons } from '../data/icons'
import { navbar } from './components/navbar'
import A11yDialog from './components/dialog'
import { themeManager } from './components/themeManager'
import { aos } from './components/aos'
import { fadeIn, fadeOut } from './components/fade'
import { Snackbar } from './components/snackbar'
import { LocalStorageManager } from './components/localStorage'
const DEFAULT_SETTINGS = {
	showCF: true,
	showSL: true
}
const HOST_FETCH_TIMEOUT_MS = 8000
const HOST_FETCH_CONCURRENCY = 50
const FIREFOX_MAC_HOST_FETCH_TIMEOUT_MS = 2500
const FIREFOX_MAC_HOST_FETCH_CONCURRENCY = 1
const TASK_YIELD_INTERVAL = 10
const FIREFOX_MAC_TASK_YIELD_INTERVAL = 1

function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeSettings(raw) {
	const normalized = { ...DEFAULT_SETTINGS }
	if (!isPlainObject(raw)) return normalized
	Object.keys(DEFAULT_SETTINGS).forEach((key) => {
		if (typeof raw[key] === 'boolean') normalized[key] = raw[key]
	})
	return normalized
}

function normalizeResults(raw) {
	if (!Array.isArray(raw)) return []
	return raw
		.map((entry) => {
			if (!isPlainObject(entry) || !isPlainObject(entry.abt)) return null
			return {
				time: Number.isFinite(entry.time) ? entry.time : Date.now(),
				date: typeof entry.date === 'string' ? entry.date : '',
				note: typeof entry.note === 'string' ? entry.note : '',
				abt: {
					total: Number.isFinite(entry.abt.total)
						? entry.abt.total
						: 0,
					blocked: Number.isFinite(entry.abt.blocked)
						? entry.abt.blocked
						: 0,
					notblocked: Number.isFinite(entry.abt.notblocked)
						? entry.abt.notblocked
						: 0,
					cosmetic_test: isPlainObject(entry.abt.cosmetic_test)
						? entry.abt.cosmetic_test
						: { static: null, dynamic: null },
					script: isPlainObject(entry.abt.script)
						? entry.abt.script
						: { ads: null, pagead: null },
					hosts: isPlainObject(entry.abt.hosts) ? entry.abt.hosts : {}
				}
			}
		})
		.filter(Boolean)
		.slice(-10)
}
function createIconText(iconMarkup, text) {
	const span = document.createElement('span')
	span.innerHTML = iconMarkup
	span.append(document.createTextNode(text))
	return span
}

function waitForNextPaint() {
	return new Promise((resolve) => {
		requestAnimationFrame(() => setTimeout(resolve, 0))
	})
}

async function runTasksWithConcurrency(
	tasks,
	limit = HOST_FETCH_CONCURRENCY,
	yieldInterval = TASK_YIELD_INTERVAL
) {
	if (tasks.length === 0) return
	let index = 0
	let completed = 0
	const workers = Array.from(
		{ length: Math.min(limit, tasks.length) },
		async () => {
			while (index < tasks.length) {
				const taskIndex = index++
				await tasks[taskIndex]()
				completed += 1
				if (completed % yieldInterval === 0) {
					await waitForNextPaint()
				}
			}
		}
	)
	await Promise.all(workers)
}

function isFirefoxBasedMac() {
	const ua = navigator.userAgent || ''
	const platform = navigator.platform || ''
	const isFirefoxFamily =
		/\b(Firefox|FxiOS|Waterfox|LibreWolf|IceCat|PaleMoon)\//.test(ua)
	const isGecko =
		/\bGecko\/\d/.test(ua) &&
		!/AppleWebKit|Chrome|Chromium|Edg|OPR|Safari/.test(ua)
	const isMac = /Mac/.test(platform) || /Mac OS X/.test(ua)

	return (isFirefoxFamily || isGecko) && isMac
}

function getHostFetchConcurrency() {
	return isFirefoxBasedMac()
		? FIREFOX_MAC_HOST_FETCH_CONCURRENCY
		: HOST_FETCH_CONCURRENCY
}

function getHostFetchTimeout() {
	return isFirefoxBasedMac()
		? FIREFOX_MAC_HOST_FETCH_TIMEOUT_MS
		: HOST_FETCH_TIMEOUT_MS
}

function getTaskYieldInterval() {
	return isFirefoxBasedMac()
		? FIREFOX_MAC_TASK_YIELD_INTERVAL
		: TASK_YIELD_INTERVAL
}

const cd = document.querySelector('#dlg_changelog')
const ch_dialog = cd ? new A11yDialog(cd) : null
const TZ = new LocalStorageManager('toolz')
const version = packageJSON.version
const tzversion = TZ.get('version')
if (ch_dialog && tzversion !== null && tzversion !== version) {
	ch_dialog.show()
	TZ.set('version', version)
}
const LS = new LocalStorageManager('adb_tool')
let results = normalizeResults(LS.get('results'))
let settings = normalizeSettings(LS.get('settings'))
LS.set('results', results)
LS.set('settings', settings)

let tslog = ''
function resetTestState() {
	tslog = ''
	abt.total = 0
	abt.blocked = 0
	abt.notblocked = 0
	abt.cosmetic_test.static = null
	abt.cosmetic_test.dynamic = null
	abt.script.ads = null
	abt.script.pagead = null
	abt.hosts = {}
}
const test_log = document.getElementById('test_log')
const snackbar = new Snackbar({
	topPos: '10px',
	classNames: 'success',
	autoClose: true,
	autoCloseTimeout: 2000
})
function downloadResult(k) {
	const targetTime = Number(k)
	const r = results.find((ri) => ri['time'] === targetTime)
	if (!r) return
	const jsonData = JSON.stringify(r)
	const blob = new Blob([jsonData], { type: 'application/json' })
	const url = URL.createObjectURL(blob)
	const linkElement = document.createElement('a')
	linkElement.href = url
	const safeDate = r.date.replace(/[/:]/g, '-').replace(/ /g, '_')
	linkElement.setAttribute('download', 'adblocktest_' + safeDate + '.json')
	document.body.appendChild(linkElement)
	linkElement.click()
	linkElement.remove()
	setTimeout(() => URL.revokeObjectURL(url), 1000)
}
async function copyToClip(str) {
	try {
		await navigator.clipboard.writeText(str)
		snackbar.show('URL copied to clipboard !')
	} catch (err) {
		const txt = document.createElement('textarea')
		txt.value = str
		txt.setAttribute('readonly', '')
		txt.style.position = 'absolute'
		txt.style.left = '-9999px'
		document.body.appendChild(txt)

		txt.select()
		txt.setSelectionRange(0, 99999)
		const copied = document.execCommand('copy')
		txt.remove()
		if (!copied) throw err
		snackbar.show('URL copied to clipboard !')
	}
}
let abt = {
	total: 0,
	blocked: 0,
	notblocked: 0,
	cosmetic_test: {
		static: null,
		dynamic: null
	},
	script: {
		ads: null,
		pagead: null
	},
	hosts: {}
}
const testWrapper = document.getElementById('test')

// Pre-calculate total test count from data to avoid race conditions (#5)
function countTotalTests() {
	let count = 0
	Object.keys(data).forEach((key) => {
		const category = data[key]
		Object.keys(category).forEach((keyC) => {
			if (Object.prototype.hasOwnProperty.call(category, keyC)) {
				count += category[keyC].length
			}
		})
	})
	return count
}

// --- One-screen tile grid -------------------------------------------------
// Each test family renders as a live instrument tile; details open in a dialog.
const TILE_ICONS = {
	'Cosmetic Filter':
		"<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' stroke-width='2' stroke='currentColor' fill='none' stroke-linecap='round' stroke-linejoin='round'><path d='M0 0h24v24H0z' stroke='none'/><circle cx='12' cy='12' r='2'/><path d='M22 12c-2.667 4.667-6 7-10 7s-7.333-2.333-10-7c2.667-4.667 6-7 10-7s7.333 2.333 10 7'/></svg>",
	'Ad Scripts':
		"<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' stroke-width='2' stroke='currentColor' fill='none' stroke-linecap='round' stroke-linejoin='round'><path stroke='none' d='M0 0h24v24H0z' fill='none'/><path d='M17 20h-11a3 3 0 0 1 0 -6h11a3 3 0 0 0 0 6h1a3 3 0 0 0 3 -3v-11a2 2 0 0 0 -2 -2h-10a2 2 0 0 0 -2 2v8'/></svg>"
}

// Most icon strings lack a viewBox, so CSS downscaling crops them instead of scaling.
function vb(markup) {
	if (!markup) return ''
	return markup.indexOf('viewBox') === -1
		? markup.replace('<svg ', "<svg viewBox='0 0 24 24' ")
		: markup
}

function tileEntries() {
	const entries = Object.keys(data).map((key) => {
		let total = 0
		Object.keys(data[key]).forEach((p) => {
			total += data[key][p].length
		})
		return { key, kind: 'hosts', total }
	})
	if (settings['showCF'] === true) {
		entries.push({ key: 'Cosmetic Filter', kind: 'cosmetic', total: 2 })
	}
	if (settings['showSL'] === true) {
		entries.push({ key: 'Ad Scripts', kind: 'script', total: 2 })
	}
	return entries
}

function buildTiles() {
	const tilesWrap = document.getElementById('tiles')
	if (!tilesWrap) return
	tilesWrap.innerHTML = ''
	tileEntries().forEach((entry, i) => {
		const tile = document.createElement('button')
		tile.type = 'button'
		tile.className = 'tile is-running'
		tile.dataset.cat = entry.key
		tile.dataset.kind = entry.kind
		tile.style.setProperty('--boot', i * 70 + 'ms')
		tile.setAttribute('aria-label', entry.key + ' test details')
		tile.innerHTML =
			"<span class='tile_head'>" +
			vb(icons[entry.key] || TILE_ICONS[entry.key]) +
			'<span>' +
			entry.key +
			'</span></span>' +
			"<span class='tile_count'><b>0</b><i>/" +
			entry.total +
			'</i></span>' +
			"<span class='tile_bar'><i></i></span>" +
			"<span class='tile_sub'>testing…</span>"
		tile.addEventListener('click', () => {
			openCategoryDialog(entry)
		})
		tilesWrap.appendChild(tile)
	})
	const gaugeValue = document.querySelector('.lt_value')
	if (gaugeValue) gaugeValue.textContent = '0%'
}

function tileProgress(entry) {
	let blocked = 0
	let done = 0
	if (entry.kind === 'hosts') {
		const cat = abt.hosts[entry.key] || {}
		Object.keys(cat).forEach((provider) => {
			Object.keys(cat[provider]).forEach((url) => {
				done += 1
				if (cat[provider][url] === true) blocked += 1
			})
		})
	} else {
		const pair =
			entry.kind === 'cosmetic'
				? [abt.cosmetic_test.static, abt.cosmetic_test.dynamic]
				: [abt.script.ads, abt.script.pagead]
		pair.forEach((result) => {
			if (result !== null) {
				done += 1
				if (result === true) blocked += 1
			}
		})
	}
	return { blocked, done }
}

function tileColor(blocked, total) {
	const ratio = total === 0 ? 0 : blocked / total
	if (ratio > 0.6) return 'var(--green)'
	if (ratio > 0.3) return 'var(--orange)'
	return 'var(--red)'
}

function update_tiles() {
	document.querySelectorAll('#tiles .tile').forEach((tile) => {
		const entry = {
			key: tile.dataset.cat,
			kind: tile.dataset.kind
		}
		const total = Number(
			tile.querySelector('.tile_count i').textContent.slice(1)
		)
		const { blocked, done } = tileProgress(entry)
		tile.querySelector('.tile_count b').textContent = blocked
		const color = tileColor(blocked, total)
		tile.style.setProperty('--tile-color', color)
		tile.querySelector('.tile_bar i').style.width =
			total === 0 ? '0%' : (100 / total) * blocked + '%'
		const sub = tile.querySelector('.tile_sub')
		if (done < total) {
			sub.textContent = done + ' of ' + total + ' checked…'
		} else {
			tile.classList.remove('is-running')
			const leaked = total - blocked
			sub.textContent =
				leaked === 0
					? 'fully blocked'
					: leaked + ' got through — details'
		}
	})
}

function hostRow(label, status, onCopy) {
	const row = document.createElement(onCopy ? 'button' : 'div')
	if (onCopy) row.type = 'button'
	row.className = 'host_row'
	const statusIcon =
		status === true
			? icons['v']
			: status === false
			? icons['x']
			: icons['cdot']
	row.innerHTML = vb(statusIcon)
	const span = document.createElement('span')
	span.textContent = label
	row.appendChild(span)
	if (onCopy) {
		row.addEventListener('click', onCopy)
		row.setAttribute('title', 'Copy to clipboard')
	}
	return row
}

function openCategoryDialog(entry) {
	const dialogEl = document.getElementById('dlg_category')
	if (!dialogEl) return
	document.getElementById('dlg_category-title').textContent = entry.key
	const body = document.getElementById('dlg_category_body')
	body.innerHTML = ''
	if (entry.kind === 'hosts') {
		const cat = abt.hosts[entry.key] || {}
		Object.keys(data[entry.key]).forEach((provider) => {
			const head = document.createElement('div')
			head.className = 'cat_provider'
			head.innerHTML = vb(icons[provider]) + '<span></span>'
			head.querySelector('span').textContent = provider
			body.appendChild(head)
			data[entry.key][provider].forEach((url) => {
				const status = cat[provider] ? cat[provider][url] : undefined
				body.appendChild(
					hostRow(url, status, () => {
						copyToClip(url)
					})
				)
			})
		})
	} else if (entry.kind === 'cosmetic') {
		body.appendChild(hostRow('Static ad element', abt.cosmetic_test.static))
		body.appendChild(
			hostRow('Dynamic ad element', abt.cosmetic_test.dynamic)
		)
		const explainer = document.querySelector('#cf_wrap details')
		if (explainer) body.appendChild(explainer.cloneNode(true))
	} else {
		body.appendChild(hostRow('ads.js', abt.script.ads))
		body.appendChild(hostRow('pagead.js', abt.script.pagead))
		const explainer = document.querySelector('#sl_wrap details')
		if (explainer) body.appendChild(explainer.cloneNode(true))
	}
	new A11yDialog(dialogEl).show()
}

function update_totals() {
	const r = document.querySelector('#adb_test_r')
	if (!r) return
	r.innerHTML =
		'<span>' +
		vb(icons['cdot']) +
		' Total : ' +
		abt.total +
		'</span><span>' +
		vb(icons['v']) +
		' ' +
		abt.blocked +
		' blocked</span><span>' +
		vb(icons['x']) +
		' ' +
		abt.notblocked +
		' not blocked</span>'
}

function fetchWithTimeout(resource, config, timeoutMs) {
	if (typeof AbortController !== 'undefined') {
		const controller = new AbortController()
		const abortTimeout = setTimeout(() => {
			controller.abort()
		}, timeoutMs)
		return fetch(resource, {
			...config,
			signal: controller.signal
		}).finally(() => {
			clearTimeout(abortTimeout)
		})
	}

	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			const timeoutError = new Error('timeout')
			timeoutError.name = 'TimeoutError'
			reject(timeoutError)
		}, timeoutMs)

		fetch(resource, config)
			.then((response) => {
				clearTimeout(timeout)
				resolve(response)
			})
			.catch((error) => {
				clearTimeout(timeout)
				reject(error)
			})
	})
}

function markUnknownHost(url, hostDiv, parent, k1, k2, reason = 'unknown') {
	hostDiv.innerHTML = icons['v']
	const urlSpan = document.createElement('span')
	urlSpan.textContent = url
	hostDiv.appendChild(urlSpan)
	abt.blocked += 1
	Object.assign(abt.hosts[k1][k2], { [url]: true })
	tslog += '<br> ' + url + ' - blocked (' + reason + ')'
}

//Function to check a host blocking status
async function check_url(url, div, parent, k1, k2) {
	const config = {
		method: 'HEAD',
		mode: 'no-cors'
	}
	const hostDiv = document.createElement('div')
	hostDiv.onclick = () => {
		copyToClip(url)
	}
	div.appendChild(hostDiv)
	const urlSpan = document.createElement('span')
	urlSpan.textContent = url
	try {
		await fetchWithTimeout(
			'https://' + url + '/fakepage.html',
			config,
			getHostFetchTimeout()
		)
		// With mode: 'no-cors', a successful response is opaque (status 0).
		// Any response means the request was NOT blocked.
		parent.dataset.hasFailure = 'true'
		parent.style.background = 'var(--red)'
		hostDiv.innerHTML = icons['x']
		hostDiv.appendChild(urlSpan)
		abt.notblocked += 1
		Object.assign(abt.hosts[k1][k2], { [url]: false })
		tslog += '<br> ' + url + ' - not blocked'
	} catch (error) {
		if (
			error &&
			(error.name === 'AbortError' || error.name === 'TimeoutError')
		) {
			markUnknownHost(url, hostDiv, parent, k1, k2, 'timed out')
			return
		}
		hostDiv.innerHTML = icons['v']
		hostDiv.appendChild(urlSpan)
		abt.blocked += 1
		Object.assign(abt.hosts[k1][k2], { [url]: true })
		tslog += '<br> ' + url + ' - blocked'
	}
}

// Track elements that already have click listeners
const _clickListenerElements = new WeakSet()

// Function to fetch all the tests
async function fetchTests() {
	let tasks = []
	Object.keys(data).forEach((key) => {
		const catEl = document.createElement('div')
		catEl.className = 'grid'
		catEl.id = key
		catEl.innerHTML =
			'<div><h5>' + icons[key] + '&nbsp;&nbsp;' + key + '</h5></div>'
		testWrapper.appendChild(catEl)
		const category = data[key]
		let total_hosts = 0
		abt.hosts[key] = {}
		const dd_left = document.createElement('div')
		dd_left.classList.add('col-6')
		const dd_right = document.createElement('div')
		dd_right.classList.add('col-6')

		catEl.appendChild(dd_left)
		catEl.appendChild(dd_right)
		let i = 0
		Object.keys(category).forEach((keyC) => {
			const testInfo = document.createElement('div')
			let tests_count = 0
			const div = document.createElement('div')
			const dw = document.createElement('div')
			div.classList.add('test')
			div.id = keyC
			div.style.background = 'var(--green)'
			let tc = icons[keyC] != undefined ? icons[keyC] + '&nbsp;' : ''
			div.innerHTML =
				"<span class='test_collapse'>" + tc + keyC + '</span>'
			div.appendChild(dw)
			if (i % 2 == 0) {
				dd_left.appendChild(div)
			} else {
				dd_right.appendChild(div)
			}
			i++
			Object.assign(abt.hosts[key], { [keyC]: {} })
			if (Object.prototype.hasOwnProperty.call(category, keyC)) {
				const value = category[keyC]
				for (let j = 0; j < value.length; j++) {
					tasks.push(() =>
						check_url(value[j], dw, div, key, keyC).then(() => {
							set_liquid()
						})
					)
					tests_count++
				}
			}
			testInfo.innerHTML = keyC + ' => n° tests => ' + tests_count
			test_log.appendChild(testInfo)
			total_hosts += tests_count
		})
		const total_tests = document.createElement('div')
		total_tests.innerHTML =
			key +
			' => Total n° tests => ' +
			total_hosts +
			'<br> ------------------------- '
		test_log.appendChild(total_tests)
	})

	await runTasksWithConcurrency(
		tasks,
		getHostFetchConcurrency(),
		getTaskYieldInterval()
	)
}

function ad_script_test() {
	return new Promise((resolve) => {
		const log = document.createElement('div')
		const sfa1 = document.querySelector('#sfa_1')
		const sfa2 = document.querySelector('#sfa_2')

		abt.script.ads = typeof s_test_ads === 'undefined'
		abt.script.pagead = typeof s_test_pagead === 'undefined'
		sfa1.classList.add(abt.script.ads ? '_bg-green' : '_bg-red')
		sfa2.classList.add(abt.script.pagead ? '_bg-green' : '_bg-red')
		abt.blocked += (abt.script.ads ? 1 : 0) + (abt.script.pagead ? 1 : 0)
		abt.notblocked += (abt.script.ads ? 0 : 1) + (abt.script.pagead ? 0 : 1)
		test_log.appendChild(log)
		log.innerHTML =
			'<div>script_ads : ' +
			abt.script.ads +
			'</div><div>script_pagead : ' +
			abt.script.pagead +
			'</div><br> ------------------------- '
		set_liquid()
		resolve()
	})
}
const ctd = document.querySelector('#ctd_test')

//Static — returns a promise so Promise.all can wait for it (#25)
function cosmetic_test_static() {
	return new Promise((resolve) => {
		setTimeout(function () {
			const cts = document.querySelector('#cts_test')
			abt.cosmetic_test.static =
				!cts || !(cts.clientHeight || cts.offsetHeight) ? true : false
			abt.blocked += abt.cosmetic_test.static ? 1 : 0
			abt.notblocked += abt.cosmetic_test.static ? 0 : 1
			document
				.querySelector('#ct_static')
				.classList.add(
					abt.cosmetic_test.static ? '_bg-green' : '_bg-red'
				)
			const log = document.createElement('div')
			test_log.appendChild(log)
			log.innerHTML =
				' cosmetic_static_ad : ' +
				abt.cosmetic_test.static +
				'<br><br> ------------------------- '
			set_liquid()
			resolve()
		}, 1200)
	})
}
//Dynamic — returns a promise so Promise.all can wait for it (#25)
function cosmetic_test_dynamic() {
	return new Promise((resolve) => {
		const log = document.createElement('div')
		const existing = document.querySelector('#ad_ctd')
		if (existing) existing.remove()
		const ad = document.createElement('div')
		ad.id = 'ad_ctd'
		ad.className =
			'textads banner-ads banner_ads ad-unit afs_ads ad-zone ad-space adsbox'
		ad.innerHTML = '&nbsp;'
		ctd.appendChild(ad)
		setTimeout(function () {
			const adt = document.querySelector('#ad_ctd')
			abt.cosmetic_test.dynamic =
				!adt || !(adt.offsetHeight || adt.clientHeight) ? true : false
			abt.blocked += abt.cosmetic_test.dynamic ? 1 : 0
			abt.notblocked += abt.cosmetic_test.dynamic ? 0 : 1
			test_log.appendChild(log)
			log.innerHTML =
				' cosmetic_dynamic_ad : ' +
				abt.cosmetic_test.dynamic +
				'<br><br> ------------------------- '
			document
				.querySelector('#ct_dynamic')
				.classList.add(
					abt.cosmetic_test.dynamic ? '_bg-green' : '_bg-red'
				)
			set_liquid()
			resolve()
		}, 1200)
	})
}

const lt_particles = document.querySelector('.lt_particles')
const lt_cwrap = document.querySelector('.lt_cwrap')

function showCategoryState(categorySelector, isVisible) {
	const element = document.querySelector(categorySelector)
	if (element) element.style.display = isVisible ? '' : 'none'
}

async function startAdBlockTesting() {
	document.body.classList.add('_overflowhidden')
	resetTestState()
	testWrapper.innerHTML = ''
	test_log.innerHTML = ''
	// Pre-calculate total so percentage doesn't jump (#5)
	abt.total = countTotalTests()
	if (settings['showCF'] === true) {
		abt.total += 2
	}
	if (settings['showSL'] === true) {
		abt.total += 2
	}

	// Make #adb_test visible for measurement (cosmetic tests need offsetHeight)
	document.querySelector('#adb_test').classList.add('measuring')

	document.querySelector('.lt_wrap').classList.add('start')
	lt_cwrap.classList.add('start')
	let tests = []
	if (settings['showCF'] === true) {
		showCategoryState('#cf_wrap', true)
		tests.push(cosmetic_test_static())
		tests.push(cosmetic_test_dynamic())
	} else {
		showCategoryState('#cf_wrap', false)
	}
	if (settings['showSL'] === true) {
		showCategoryState('#sl_wrap', true)
		tests.push(ad_script_test())
	} else {
		showCategoryState('#sl_wrap', false)
	}

	tests.push(fetchTests())
	await Promise.all(tests)
}

function set_liquid() {
	if (abt.total === 0) return
	const p = (100 / abt.total) * abt.blocked
	const c =
		p > 30 ? (p > 60 ? 'var(--green)' : 'var(--orange)') : 'var(--red)'
	document.body.style.setProperty('--liquid-percentage', 45 - p + '%')
	document.body.style.setProperty('--liquid-color', c)
	const gaugeValue = document.querySelector('.lt_value')
	if (gaugeValue) gaugeValue.textContent = Math.round(p) + '%'
	update_tiles()
	update_totals()
}

function stopAdBlockTesting() {
	if (lt_particles) {
		fadeOut(lt_particles, () => {
			document.querySelector('.lt_wrap').classList.remove('start')
			fadeIn(lt_particles, 'flex')
			document.body.classList.remove('_overflowhidden')
		})
	} else {
		document.body.classList.remove('_overflowhidden')
	}
	if (lt_cwrap) lt_cwrap.classList.remove('start')
}

function render_tests() {
	const r_wrap = document.querySelector('.r_wrap')
	r_wrap.innerHTML = ''
	results.forEach((r, index) => {
		const div = document.createElement('div')
		div.className = 'col-6'
		const abt_r = results[index].abt
		const card = document.createElement('div')
		card.className = 'card'
		const cardInfo = document.createElement('div')
		cardInfo.appendChild(
			createIconText(icons['cdot'], 'Total : ' + abt_r.total)
		)
		cardInfo.appendChild(document.createElement('br'))
		cardInfo.appendChild(
			createIconText(icons['x'], ' ' + abt_r.notblocked + ' not blocked')
		)
		cardInfo.appendChild(
			createIconText(icons['v'], ' ' + abt_r.blocked + ' blocked')
		)
		cardInfo.appendChild(document.createElement('br'))
		const dateTitle = document.createElement('h6')
		dateTitle.textContent = r.date
		cardInfo.appendChild(dateTitle)
		const cardActions = document.createElement('div')
		const button = document.createElement('button')
		button.className = 'btn-blue outline'
		button.setAttribute('data-r', r.time)
		button.setAttribute('type', 'button')
		button.innerHTML = icons['download']
		cardActions.appendChild(button)
		card.appendChild(cardInfo)
		card.appendChild(cardActions)
		div.appendChild(card)
		r_wrap.insertBefore(div, r_wrap.children[0])
	})
	if (!_clickListenerElements.has(r_wrap)) {
		_clickListenerElements.add(r_wrap)
		r_wrap.addEventListener('click', (e) => {
			const btn = e.target.closest('button[data-r]')
			if (btn) downloadResult(btn.getAttribute('data-r'))
		})
	}
}

function leading_zero(val) {
	return (val < 10 ? '0' : '') + val
}

function add_report() {
	const ms = Date.now()
	const date = new Date(ms)
	const d =
		date.getDate() +
		'/' +
		(date.getMonth() + 1) +
		'/' +
		date.getFullYear() +
		' ' +
		leading_zero(date.getHours()) +
		':' +
		leading_zero(date.getMinutes()) +
		':' +
		leading_zero(date.getSeconds())
	// Deep copy abt to avoid reference issues (#7)
	const abtSnapshot = JSON.parse(JSON.stringify(abt))
	if (results.length < 10) {
		results.push({ time: ms, date: d, note: '', abt: abtSnapshot })
	} else {
		results.splice(0, 1)
		results.push({ time: ms, date: d, note: '', abt: abtSnapshot })
	}
	LS.set('results', results)
	render_tests()
}
document.addEventListener('DOMContentLoaded', function () {
	new navbar()
	new themeManager()
	document.querySelectorAll('.theme-toggle').forEach(function (toggle) {
		toggle.addEventListener('keydown', function (e) {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault()
				toggle.click()
			}
		})
	})
	new aos()
	Object.keys(settings).forEach((key) => {
		try {
			const c = document.querySelector('#' + key)
			c.checked = settings[key]
			c.addEventListener('change', () => {
				settings[key] = c.checked
				LS.set('settings', settings)
			})
		} catch (error) {
			// Setting element not found, skip
		}
	})
	render_tests()
	buildTiles()

	let testRunning = false
	async function runTest() {
		if (testRunning) return
		testRunning = true
		try {
			await startAdBlockTesting()
			await new Promise((resolve) => requestAnimationFrame(resolve))
			add_report()
			const tsl = document.createElement('div')
			tslog +=
				'<br>-----<br> Total : ' +
				abt.total +
				'<br> Blocked : ' +
				abt.blocked +
				'<br> Not Blocked : ' +
				abt.notblocked
			tsl.innerHTML = tslog
			test_log.appendChild(tsl)
			update_totals()
		} catch (error) {
			console.error('Ad block test failed:', error)
			snackbar.show('Test failed. Please retry.', 'error')
			const errorLog = document.createElement('div')
			errorLog.textContent =
				'The test stopped unexpectedly. Please retry or check the console.'
			test_log.appendChild(errorLog)
		} finally {
			stopAdBlockTesting()
			// #adb_test stays hidden: it is the measurement sandbox, the tiles are the UI
			document.querySelector('#adb_test').classList.remove('measuring')
			testRunning = false
		}
	}

	// Delay test start to allow LCP to complete first
	const startDeferred = () => setTimeout(runTest, 100)
	if ('requestIdleCallback' in window) {
		requestIdleCallback(startDeferred, { timeout: 2000 })
	} else {
		setTimeout(startDeferred, 1000)
	}

	document.querySelector('#start_test').addEventListener('click', () => {
		location.reload()
	})
	const stxt =
		'https://raw.githubusercontent.com/Orellius/wisp-adblock-test/master/src/d3host.txt'
	const sadblock =
		'https://raw.githubusercontent.com/Orellius/wisp-adblock-test/master/src/d3host.adblock'
	document
		.querySelector('#hostListTxt')
		.addEventListener('click', function () {
			copyToClip(stxt)
		})
	document
		.querySelector('#hostListAdblock')
		.addEventListener('click', function () {
			copyToClip(sadblock)
		})
})
