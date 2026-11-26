// 推广位：读取仓库根目录的 affiliate-links.json，在管理后台「关于我们」页渲染卡片。
// 设计原则：只做纯字符串注入、不改任何原有业务逻辑；配置损坏或关闭时返回空串，
// 绝不让推广位影响管理后台本身可用。改完 JSON 刷新页面即生效（按 mtime 失效缓存）。
import { readFileSync, statSync } from 'node:fs'

const CONFIG_URL = new URL('../affiliate-links.json', import.meta.url)
const SLOT = '<!-- AFFILIATE_SLOT -->'

let cache = { mtime: -1, html: '' }

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// 只放行 https 绝对地址：避免配置里误写 javascript: / 内网地址造成安全或可用性问题
function safeUrl(value) {
  if (!value) return ''
  try {
    const u = new URL(String(value))
    return u.protocol === 'https:' ? u.href : ''
  } catch {
    return ''
  }
}

function safeColor(value, fallback = '#28714f') {
  return /^#[0-9a-fA-F]{3,8}$/.test(String(value ?? '')) ? String(value) : fallback
}

// 一段文案输出中英两份，由容器的 data-aff-lang + CSS 决定显示哪一份
function bi(obj) {
  const zh = esc(obj?.zh ?? '')
  const en = esc(obj?.en ?? zh)
  return `<span data-aff-zh>${zh}</span><span data-aff-en>${en}</span>`
}

function externalLink(href, className, label, extra = '') {
  const url = safeUrl(href)
  if (!url) return ''
  return `<a class="${className}" href="${esc(url)}" target="_blank" rel="noopener noreferrer"${extra}>${label}</a>`
}

const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10"/></svg>'

function renderCard(item) {
  if (!item || typeof item !== 'object') return ''
  const url = safeUrl(item.url)
  if (!url) return ''
  const accent = safeColor(item.accent)
  const id = esc(String(item.id ?? '').replace(/[^a-zA-Z0-9_-]/g, ''))

  const warning = item.warning
    ? `<div class="aff-warning"><span class="aff-warning-label" data-aff-zh>注意</span><span class="aff-warning-label" data-aff-en>Heads up</span><span class="aff-warning-text">${bi(item.warning)}</span></div>`
    : ''

  // 次级链接允许中英指向不同页面（实测文章中英双版），由容器语言决定显示哪一个
  const moreZh = safeUrl(item.moreUrl)
  const moreEn = safeUrl(item.moreUrlEn || item.moreUrl)
  let more = ''
  if (moreZh) more += `<a class="aff-more" data-aff-zh href="${esc(moreZh)}" target="_blank" rel="noopener noreferrer">${esc(item.more?.zh ?? '')}</a>`
  if (moreEn) more += `<a class="aff-more" data-aff-en href="${esc(moreEn)}" target="_blank" rel="noopener noreferrer">${esc(item.more?.en ?? item.more?.zh ?? '')}</a>`

  return `<article class="aff-card"${id ? ` data-aff-id="${id}"` : ''} style="--aff-accent:${accent}">
    <div class="aff-card-head">
      <span class="aff-glyph" aria-hidden="true">${esc(item.glyph ?? '·')}</span>
      <div class="aff-title-wrap">
        <h3>${bi(item.name)}</h3>
        <span class="aff-tag">${bi(item.tag)}</span>
      </div>
      <span class="aff-refbadge">${bi({ zh: '推广链接', en: 'Referral' })}</span>
    </div>
    <p class="aff-desc">${bi(item.desc)}</p>
    ${warning}
    <div class="aff-actions">
      ${externalLink(url, 'aff-cta', `${bi(item.cta)}${ARROW}`)}
      ${more}
    </div>
  </article>`
}

function buildHtml(cfg) {
  const links = Array.isArray(cfg.links) ? cfg.links.map(renderCard).filter(Boolean) : []
  if (!links.length) return ''
  const title = bi(cfg.title || { zh: '站长推荐', en: 'Recommended' })
  const subtitle = bi(cfg.subtitle || { zh: '', en: '' })
  const disclosure = bi(cfg.disclosure || { zh: '', en: '' })
  return `<section class="aff-section" id="affiliateSection" data-aff-lang="zh" aria-label="Recommended resources">
    <div class="aff-head">
      <div class="aff-head-copy">
        <h2>${title}</h2>
        <p>${subtitle}</p>
      </div>
      <button type="button" class="aff-lang" id="affLangToggle" onclick="toggleAffiliateLang()" aria-label="Switch language / 切换语言">EN</button>
    </div>
    <div class="aff-grid">${links.join('')}</div>
    <p class="aff-disclosure">${disclosure}</p>
  </section>`
}

// 返回注入后的完整页面；找不到占位符时原样返回（兼容性优先）
export function injectAffiliate(html) {
  if (typeof html !== 'string' || !html.includes(SLOT)) return html
  try {
    const off = String(process.env.mAffiliateEnabled ?? '').trim().toLowerCase()
    if (['false', '0', 'off', 'no'].includes(off)) return html.replace(SLOT, '')

    const st = statSync(CONFIG_URL)
    if (st.mtimeMs !== cache.mtime) {
      const cfg = JSON.parse(readFileSync(CONFIG_URL, 'utf-8'))
      cache = { mtime: st.mtimeMs, html: cfg.enabled === false ? '' : buildHtml(cfg) }
    }
    return html.replace(SLOT, cache.html)
  } catch (error) {
    console.warn('[affiliate] 推广位配置读取失败，已跳过：', error.message)
    return html.replace(SLOT, '')
  }
}

export { SLOT }
