// Uso: npm run build && npm run preview (em outro terminal) && npm run lighthouse
import { launch } from 'chrome-launcher'
import lighthouse from 'lighthouse'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173'
const pages = { home: '/', detalhe: '/nft/emerald-ape-042' }
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]
mkdirSync('lighthouse', { recursive: true })
const summary = {}
for (const profile of ['mobile', 'desktop']) for (const [name, path] of Object.entries(pages)) {
  const runs = []
  for (let i = 0; i < 3; i++) {
    const chrome = await launch({ chromeFlags: ['--headless=new', '--no-sandbox'] })
    const cfg = profile === 'desktop' ? { extends: 'lighthouse:default', settings: { formFactor: 'desktop', screenEmulation: { disabled: true }, throttlingMethod: 'simulate', throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 } } } : undefined
    const r = await lighthouse(BASE + path, { port: chrome.port, output: ['json', 'html'], logLevel: 'error' }, cfg)
    writeFileSync(`lighthouse/${name}-${profile}-${i + 1}.html`, r.report[1]); writeFileSync(`lighthouse/${name}-${profile}-${i + 1}.json`, r.report[0])
    const c = r.lhr.categories, a = r.lhr.audits
    runs.push({ performance: c.performance.score * 100, accessibility: c.accessibility.score * 100, 'best-practices': c['best-practices'].score * 100, seo: c.seo.score * 100, LCP: a['largest-contentful-paint'].numericValue, CLS: a['cumulative-layout-shift'].numericValue, TBT: a['total-blocking-time'].numericValue })
    await chrome.kill()
  }
  summary[`${name}/${profile}`] = Object.fromEntries(Object.keys(runs[0]).map((k) => [k, median(runs.map((r) => r[k]))]))
}
writeFileSync('lighthouse/summary.json', JSON.stringify(summary, null, 2)); console.table(summary)
