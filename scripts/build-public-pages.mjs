import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
const policies = JSON.parse(readFileSync(new URL('../src/content/policies.json', import.meta.url), 'utf8'))
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char])
for (const [slug, policy] of Object.entries(policies)) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(policy.title)}</title><style>body{font:16px/1.7 system-ui,sans-serif;background:#f0f2f5;color:#1c2b4a;margin:0;padding:24px}main{max-width:760px;margin:auto;background:white;padding:28px;border-radius:12px}h1{line-height:1.25}h2{font-size:21px}a{color:#1556ac}nav{display:flex;gap:18px;flex-wrap:wrap}</style></head><body><main><a href="/">FMCI Network</a><h1>${escape(policy.title)}</h1><p>Updated ${escape(policy.updated)}</p>${policy.sections.map(section=>`<section><h2>${escape(section.title)}</h2>${section.paragraphs.map(p=>`<p>${escape(p)}</p>`).join('')}</section>`).join('')}<p><a href="mailto:luke@dyerplex.com">Contact Luke Dyer — luke@dyerplex.com</a></p><nav><a href="/privacy/">Privacy</a><a href="/terms/">Community rules</a><a href="/support/">Support</a></nav></main></body></html>`
  mkdirSync(new URL(`../dist/${slug}/`, import.meta.url), { recursive: true })
  writeFileSync(new URL(`../dist/${slug}/index.html`, import.meta.url), html)
}
console.log('Built public privacy, support, and community rules pages')
