// 从 pokedex.json 与 pokemon-details.json 生成每只宝可梦的 Markdown 详情页
// 用法：node scripts/generate-pokedex-pages.mjs
// 输出：guide/pokedex/{001..386}.md

import { readFile, writeFile, readdir, unlink } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_FILE = path.join(ROOT, 'guide/.vitepress/data/pokedex.json')
const DETAILS_FILE = path.join(ROOT, 'guide/.vitepress/data/pokemon-details.json')
const OUT_DIR = path.join(ROOT, 'guide/pokedex')

const pad = (n) => String(n).padStart(3, '0')
const VERSION_ORDER = { 火红: 0, 叶绿: 1 }
const VERSION_CLASS = { 火红: 'ver-firered', 叶绿: 'ver-leafgreen' }
const STAT_MAX = 255

function category(p) {
  if (p.legendary) return '传说宝可梦'
  if (p.mythical) return '幻之宝可梦'
  return '普通宝可梦'
}

// 属性徽章（统一基准 .t-badge + 尺寸类 + 属性配色类，配色定义在 style.css）
const typeBadge = (t, cls = 'dex-type') => `<span class="t-badge ${cls} t-${t}">${t}</span>`

// 无数据提示（纯段落，视觉与正文一致）
const note = (text) => `<p class="dex-note">${text}</p>`

// 头部信息卡（注意：HTML 块内不能出现空行，否则 markdown-it 会截断）
function renderHero(p, no) {
  const types = p.types.map((t) => typeBadge(t)).join('')
  const catClass = p.legendary ? ' dex-cat-legendary' : p.mythical ? ' dex-cat-mythical' : ''
  return [
    `<section class="dex-hero" aria-label="基本信息">`,
    `  <div class="dex-hero-sprite"><img src="/sprites/${p.id}.png" alt="${p.nameZh}" width="128" height="128" /></div>`,
    '  <div class="dex-hero-info">',
    `    <div class="dex-hero-no">#${no} · ${p.nameEn}</div>`,
    `    <h1 class="dex-hero-name">${p.nameZh}</h1>`,
    `    <div class="dex-hero-tags">${types}<span class="dex-cat${catClass}">${category(p)}</span></div>`,
    `    <div class="dex-hero-meta"><span class="dex-meta-chip">身高 ${p.height} m</span><span class="dex-meta-chip">体重 ${p.weight} kg</span></div>`,
    '  </div>',
    '</section>'
  ].join('\n')
}

// 种族值 → 条形图（每项独立配色，见 style.css）
function renderStats(p) {
  const rows = [
    ['HP', p.stats.hp, 'hp'],
    ['攻击', p.stats.atk, 'atk'],
    ['防御', p.stats.def, 'def'],
    ['特攻', p.stats.spa, 'spa'],
    ['特防', p.stats.spd, 'spd'],
    ['速度', p.stats.spe, 'spe']
  ]
  const bars = rows.map(([label, v, key]) => {
    const pct = Math.max(2, Math.round((v / STAT_MAX) * 1000) / 10)
    return `  <div class="dex-stat-row dex-stat-${key}"><span class="dex-stat-label">${label}</span><span class="dex-stat-value">${v}</span><span class="dex-stat-bar"><span class="dex-stat-fill" style="width:${pct}%"></span></span></div>`
  })
  return [
    '<div class="dex-stats">',
    ...bars,
    `  <div class="dex-stat-row dex-stat-total"><span class="dex-stat-label">合计</span><span class="dex-stat-value">${p.stats.total}</span><span></span></div>`,
    '</div>'
  ].join('\n')
}

// 进化链 → 卡片式（分支递归，当前宝可梦高亮）
function evoCard(id, currentId, nameById) {
  const name = nameById[id] ?? `#${id}`
  const current = id === currentId ? ' is-current' : ''
  return `<a class="dex-evo-card${current}" href="/pokedex/${pad(id)}"><img src="/sprites/${id}.png" alt="${name}" width="72" height="72" loading="lazy" /><span class="dex-evo-name">${name}</span><span class="dex-evo-no">#${pad(id)}</span></a>`
}

function evoSubtree(node, currentId, nameById) {
  const card = evoCard(node.id, currentId, nameById)
  if (!node.evolvesTo.length) return card
  const branches = node.evolvesTo
    .map((child) => {
      const cond = child.condition ? `<span class="dex-evo-cond">${child.condition}</span>` : ''
      return `<div class="dex-evo-branch"><span class="dex-evo-arrow">→${cond}</span>${evoSubtree(child, currentId, nameById)}</div>`
    })
    .join('')
  return `<div class="dex-evo-row">${card}<div class="dex-evo-children">${branches}</div></div>`
}

function renderEvolution(p, nameById, chains) {
  const chain = chains[String(p.chainId)]
  if (!chain) return note('进化数据缺失。')
  if (!chain.evolvesTo.length) return note('无进化关系（单阶段宝可梦）。')
  return ['<div class="dex-evo">', evoSubtree(chain, p.id, nameById), '</div>'].join('\n')
}

// 捕捉地点 → 表格（版本列渲染为徽章）
function renderLocations(p) {
  const locs = p.locations ?? []
  if (!locs.length) {
    return note('在《宝可梦 火红/叶绿》中<strong>没有野生出现</strong>，需要通过剧情赠送、化石复活、通信交换等方式获得。')
  }
  const rows = locs.map((l) => {
    const versions = [...l.versions]
      .sort((a, b) => (VERSION_ORDER[a] ?? 9) - (VERSION_ORDER[b] ?? 9))
      .map((v) => `<span class="ver-chip ${VERSION_CLASS[v] ?? 'ver-other'}">${v}</span>`)
      .join(' ')
    const lv =
      l.minLevel === l.maxLevel ? `Lv.${l.minLevel}` : `Lv.${l.minLevel}–${l.maxLevel}`
    return `| ${l.area} | ${versions} | ${l.method} | ${lv} | ${l.chance}% |`
  })
  return [
    '| 地点 | 版本 | 方式 | 等级 | 出现率 |',
    '| --- | --- | --- | --- | ---: |',
    ...rows
  ].join('\n')
}

// 招式元信息：名称（链接到招式详情页） + 属性徽章/分类/威力/命中/PP 单元格
function moveCells(moveId, details) {
  const meta = details.moves[String(moveId)]
  if (!meta) return { name: `#${moveId}`, cells: ['—', '—', '—', '—', '—'] }
  const num = (v) => (v ?? null) === null ? '—' : String(v)
  return {
    name: `<a href="/moves/${String(moveId).padStart(3, '0')}">${meta.nameZh}</a>`,
    cells: [
      typeBadge(meta.type, 'mv-type'),
      `<span class="mv-cat mv-cat-${meta.category}">${meta.category}</span>`,
      num(meta.power),
      num(meta.accuracy),
      num(meta.pp)
    ]
  }
}

// 升级/教学/蛋招式 → 表格（可选等级列）
function renderMoveTable(rows, withLevel, details) {
  const head = withLevel
    ? '| 等级 | 招式 | 属性 | 分类 | 威力 | 命中 | PP |'
    : '| 招式 | 属性 | 分类 | 威力 | 命中 | PP |'
  const sep = withLevel
    ? '| --- | --- | --- | --- | ---: | ---: | ---: |'
    : '| --- | --- | --- | ---: | ---: | ---: |'
  const body = rows.map((r) => {
    const m = moveCells(r.move, details)
    const lv = r.level === 0 ? '进化' : `Lv.${r.level}`
    return withLevel
      ? `| ${lv} | ${m.name} | ${m.cells.join(' | ')} |`
      : `| ${m.name} | ${m.cells.join(' | ')} |`
  })
  return [head, sep, ...body].join('\n')
}

// 技能机器/秘传机 → 带编号表格，TM 在前、按编号排序
function renderMachineTable(rows, details) {
  const head = '| 编号 | 招式 | 属性 | 分类 | 威力 | 命中 | PP |'
  const sep = '| --- | --- | --- | --- | ---: | ---: | ---: |'
  const body = rows.map((r) => {
    const m = moveCells(r.move, details)
    return `| ${r.label} | ${m.name} | ${m.cells.join(' | ')} |`
  })
  return [head, sep, ...body].join('\n')
}

// 按学习方式拆分并去重
function splitLearnset(p, details) {
  const all = details.learnsets[String(p.id)] ?? []
  const dedupe = (rows) => {
    const seen = new Set()
    return rows.filter((r) => {
      const key = `${r.move}|${r.level}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  const levelUp = dedupe(all.filter((r) => r.method === 'level-up')).sort(
    (a, b) => a.level - b.level || a.move - b.move
  )
  const machines = dedupe(all.filter((r) => r.method === 'machine'))
    .map((r) => ({ ...r, label: details.machines[String(r.move)] ?? '??' }))
    .sort((a, b) => {
      const pa = a.label.startsWith('HM') ? 1 : 0
      const pb = b.label.startsWith('HM') ? 1 : 0
      return pa - pb || a.label.localeCompare(b.label)
    })
  const tutors = dedupe(all.filter((r) => r.method === 'tutor')).sort(
    (a, b) => a.move - b.move
  )
  const eggs = dedupe(all.filter((r) => r.method === 'egg')).sort(
    (a, b) => a.move - b.move
  )
  return { empty: all.length === 0, levelUp, machines, tutors, eggs }
}

function renderPage(p, prev, next, nameById, chains, details) {
  const no = pad(p.id)
  const learn = splitLearnset(p, details)
  const flavor = details.flavors[String(p.id)]
  const prevName = nameById[parseInt(prev, 10)] ?? ''
  const nextName = nameById[parseInt(next, 10)] ?? ''
  const lines = [
    '---',
    `title: ${p.nameZh}（#${no}）`,
    '---',
    '',
    renderHero(p, no),
    '',
    '<section class="dex-section" aria-label="介绍">',
    '',
    '## 介绍',
    '',
    flavor ? `<div class="dex-flavor">${flavor}</div>` : note('暂无介绍。'),
    '',
    '</section>',
    '',
    '<section class="dex-section" aria-label="种族值">',
    '',
    '## 种族值',
    '',
    renderStats(p),
    '',
    '</section>',
    '',
    '<section class="dex-section" aria-label="进化链">',
    '',
    '## 进化链',
    '',
    renderEvolution(p, nameById, chains),
    '',
    '</section>',
    '',
    '<section class="dex-section" aria-label="捕捉地点">',
    '',
    '## 捕捉地点',
    '',
    renderLocations(p),
    '',
    '</section>',
    '',
    '<section class="dex-section" aria-label="升级招式">',
    '',
    '## 升级招式',
    '',
    learn.empty
      ? note('该宝可梦未在火红/叶绿中登场，无招式数据。')
      : learn.levelUp.length
        ? renderMoveTable(learn.levelUp, true, details)
        : note('无升级招式数据。'),
    '',
    '</section>',
    '',
    '<section class="dex-section" aria-label="技能学习">',
    '',
    '## 技能学习',
    ''
  ]

  if (!learn.empty) {
    if (learn.machines.length) {
      lines.push('### 技能机器 / 秘传机', '', renderMachineTable(learn.machines, details), '')
    }
    if (learn.tutors.length) {
      lines.push('### 教学招式', '', renderMoveTable(learn.tutors, false, details), '')
    }
    if (learn.eggs.length) {
      lines.push('### 蛋招式', '', renderMoveTable(learn.eggs, false, details), '')
    }
    if (!learn.machines.length && !learn.tutors.length && !learn.eggs.length) {
      lines.push(note('无技能机器、教学或蛋招式数据。'), '')
    }
  }

  lines.push(
    '</section>',
    '',
    '---',
    '',
    '<div class="dex-pager">',
    `  <a href="/pokedex/${prev}">← #${prev} ${prevName}</a>`,
    '  <a href="/pokedex/">返回图鉴</a>',
    `  <a href="/pokedex/${next}">#${next} ${nextName} →</a>`,
    '</div>',
    ''
  )
  return lines.join('\n')
}

async function main() {
  const data = JSON.parse(await readFile(DATA_FILE, 'utf8'))
  const details = JSON.parse(await readFile(DETAILS_FILE, 'utf8'))
  const dex = data.dex
  const chains = data.chains ?? {}
  const nameById = Object.fromEntries(dex.map((p) => [p.id, p.nameZh]))

  // 清理旧的生成页（保留 index.md 与非数字命名的文件）
  const existing = await readdir(OUT_DIR)
  for (const f of existing) {
    if (/^\d{3}\.md$/.test(f)) await unlink(path.join(OUT_DIR, f))
  }

  for (const p of dex) {
    const no = pad(p.id)
    const prev = pad(p.id === 1 ? dex.length : p.id - 1)
    const next = pad(p.id === dex.length ? 1 : p.id + 1)
    await writeFile(
      path.join(OUT_DIR, `${no}.md`),
      renderPage(p, prev, next, nameById, chains, details)
    )
  }

  console.log(`已生成 ${dex.length} 个详情页到 ${path.relative(ROOT, OUT_DIR)}/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
