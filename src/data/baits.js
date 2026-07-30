// Bait battery for the path-pattern and cosmetic families.
//
// Every entry cites the live filter rule that matches it and the list that
// ships the rule. Rules re-verified against the published lists on
// 2026-07-30 (easylist.txt / easyprivacy.txt as fetched that day); the
// liveness workflow re-checks the host list, but these citations are
// checked by hand — if a list drops a rule, the bait decays to a
// strict-list bait and should be re-labeled or replaced.
//
// `kind: 'script'` baits are same-origin <script> tags in index.ejs that set
// `window.__wb_<id>` — blocked means the global never appeared.
// `kind: 'image'` baits are probed with a fresh Image() per run — blocked
// means the request errored.

export const REQUEST_BAITS = [
	{
		id: 'ads',
		kind: 'script',
		label: 'widget/ads.js',
		global: 's_test_ads',
		rule: '/widget/ads.',
		list: 'strict-list bait (d3ward heritage; not in default EasyList)'
	},
	{
		id: 'pagead',
		kind: 'script',
		label: 'pagead.js',
		global: 's_test_pagead',
		rule: '/pagead.js',
		list: 'strict-list bait (d3ward heritage; not in default EasyList)'
	},
	{
		id: 'conversion',
		kind: 'script',
		label: 'pagead/conversion.js',
		global: '__wb_conversion',
		rule: '/pagead/conversion.js$script',
		list: 'EasyList'
	},
	{
		id: 'prebid',
		kind: 'script',
		label: 'prebid.js',
		global: '__wb_prebid',
		rule: '/prebid.$script,domain=~prebid.org',
		list: 'EasyList'
	},
	{
		id: 'adscript',
		kind: 'script',
		label: 'dist/adscript.js',
		global: '__wb_adscript',
		rule: '/dist/adscript.js$script',
		list: 'EasyList'
	},
	{
		id: 'analytics',
		kind: 'script',
		label: 'analytics/analytics.js',
		global: '__wb_analytics',
		rule: '/analytics/analytics.js',
		list: 'EasyPrivacy'
	},
	{
		id: 'ga',
		kind: 'script',
		label: 'common/ga.js',
		global: '__wb_ga',
		rule: '/common/ga.js',
		list: 'EasyPrivacy'
	},
	{
		id: 'gtm',
		kind: 'script',
		label: 'gtm.js',
		global: '__wb_gtm',
		rule: '/gtm.js',
		list: 'EasyPrivacy'
	},
	{
		id: 'beacon',
		kind: 'script',
		label: 'beacon.js',
		global: '__wb_beacon',
		rule: '/beacon.js',
		list: 'EasyPrivacy'
	},
	{
		id: 'pixel',
		kind: 'image',
		label: 'pixel.gif',
		src: './assets/track/pixel.gif',
		rule: '/pixel.gif?',
		list: 'EasyPrivacy'
	},
	{
		id: 'banner300',
		kind: 'image',
		label: '300x250.gif',
		src: './assets/track/300x250.gif',
		rule: '/300x250.$image',
		list: 'EasyList'
	},
	{
		id: 'adbanners',
		kind: 'image',
		label: 'adbanners/ad.gif',
		src: './assets/adbanners/ad.gif',
		rule: '/adbanners/*$image',
		list: 'EasyList'
	},
	{
		id: 'bannerad',
		kind: 'image',
		label: 'banner-ad.gif',
		src: './assets/track/banner-ad.gif',
		rule: '/banner-ad.$~script,~xmlhttprequest',
		list: 'EasyList'
	}
]

// Cosmetic baits are static elements in index.ejs (present at parse time, so
// engines that only apply generic element hiding on load still see them) plus
// the one dynamically injected element, which exercises DOM-observer hiding.
// Blocked means the element measures collapsed (offsetHeight/clientHeight 0).
export const COSMETIC_BAITS = [
	{
		id: 'static',
		label: 'Static ad element',
		el: 'cts_test',
		rule: '##.adsbox (combo bait div)',
		list: 'strict-list bait (d3ward heritage; not in default EasyList)'
	},
	{
		id: 'dynamic',
		label: 'Dynamic ad element',
		el: 'ad_ctd',
		rule: 'injected .adsbox combo, DOM-observer hiding',
		list: 'strict-list bait (d3ward heritage; not in default EasyList)'
	},
	{
		id: 'carbonads',
		label: '#carbonads',
		el: 'carbonads',
		rule: '###carbonads',
		list: 'EasyList'
	},
	{
		id: 'ad_banner',
		label: '#ad_banner',
		el: 'ad_banner',
		rule: '###ad_banner',
		list: 'EasyList'
	},
	{
		id: 'sponsored',
		label: '.sponsored-ad',
		el: 'cb_sponsored',
		rule: '##.sponsored-ad',
		list: 'EasyList'
	},
	{
		id: 'adspace',
		label: '.ad-space',
		el: 'cb_adspace',
		rule: '##.ad-space',
		list: 'EasyList'
	},
	{
		id: 'adunit',
		label: '.ad-unit',
		el: 'cb_adunit',
		rule: '##.ad-unit',
		list: 'EasyList'
	}
]
