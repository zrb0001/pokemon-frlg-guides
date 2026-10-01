// 从 pokemon-details.json 生成每个招式的 Markdown 详情页
// 用法：node scripts/generate-move-pages.mjs
// 输出：guide/moves/{id}.md（id 为招式编号，3 位补零，仅包含火红/叶绿存在的招式）

import { readFile, writeFile, readdir, unlink, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_FILE = path.join(ROOT, 'guide/.vitepress/data/pokedex.json')
const DETAILS_FILE = path.join(ROOT, 'guide/.vitepress/data/pokemon-details.json')
const OUT_DIR = path.join(ROOT, 'guide/moves')

const pad = (n) => String(n).padStart(3, '0')
const num = (v) => (v ?? null) === null ? '—' : String(v)

const typeBadge = (t, cls = 'mv-type') => `<span class="t-badge ${cls} t-${t}">${t}</span>`
const catBadge = (c) => `<span class="mv-cat mv-cat-${c}">${c}</span>`
const note = (text) => `<p class="dex-note">${text}</p>`

// 头部信息卡（HTML 块内不能出现空行，否则 markdown-it 会截断）
function renderHero(id, meta, machine) {
  const tags = [typeBadge(meta.type), catBadge(meta.category)]
  if (machine) tags.push(`<span class="mv-tm">${machine}</span>`)
  return [
    `<section class="mv-hero" aria-label="基本信息">`,
    '  <div class="mv-hero-info">',
    `    <div class="mv-hero-no">招式 ${pad(id)} · ${meta.nameEn}</div>`,
    `    <h1 class="mv-hero-name">${meta.nameZh}</h1>`,
    `    <div class="mv-hero-tags">${tags.join('')}</div>`,
    '    <div class="mv-hero-meta">',
    `      <span class="mv-meta-chip">威力 ${num(meta.power)}</span>`,
    `      <span class="mv-meta-chip">命中 ${num(meta.accuracy)}</span>`,
    `      <span class="mv-meta-chip">PP ${num(meta.pp)}</span>`,
    '    </div>',
    '  </div>',
    '</section>'
  ].join('\n')
}

function renderEffect(meta) {
  if (meta.effectZh) return `<div class="dex-flavor">${meta.effectZh}</div>`
  if (meta.effectEn) {
    return [
      `<div class="dex-flavor">${meta.effectEn.replace(/\n+/g, ' ')}</div>`,
      note('暂无官方中文说明，上方为英文原文。')
    ].join('\n')
  }
  return note('暂无招式说明。')
}

// 可学习宝可梦 → 按学习方式分组
// learners: moveId -> [{ pokeId, method, level }]
function pokeCell(pokeId, nameById) {
  const name = nameById[pokeId] ?? `#${pokeId}`
  return `<a class="mv-poke" href="/pokedex/${pad(pokeId)}"><img class="mv-poke-sprite" src="/sprites/${pokeId}.png" alt="${name}" width="32" height="32" loading="lazy" />${name}</a>`
}

function renderLevelTable(rows, nameById) {
  const body = rows
    .slice()
    .sort((a, b) => a.level - b.level || a.pokeId - b.pokeId)
    .map((r) => {
      const lv = r.level === 0 ? '进化' : `Lv.${r.level}`
      return `| ${pokeCell(r.pokeId, nameById)} | ${lv} |`
    })
  return ['| 宝可梦 | 等级 |', '| --- | --- |', ...body].join('\n')
}

function renderPlainTable(rows, nameById) {
  const body = rows
    .slice()
    .sort((a, b) => a.pokeId - b.pokeId)
    .map((r) => `| ${pokeCell(r.pokeId, nameById)} |`)
  return ['| 宝可梦 |', '| --- |', ...body].join('\n')
}

function renderLearners(learners, nameById) {
  if (!learners.length) return note('没有宝可梦能在火红/叶绿中学会该招式。')
  const byMethod = (m) => learners.filter((r) => r.method === m)
  const groups = [
    ['升级招式', byMethod('level-up'), renderLevelTable],
    ['技能机器 / 秘传机', byMethod('machine'), renderPlainTable],
    ['教学招式', byMethod('tutor'), renderPlainTable],
    ['蛋招式', byMethod('egg'), renderPlainTable]
  ]
  const sections = []
  for (const [title, rows, render] of groups) {
    if (!rows.length) continue
    sections.push(`### ${title}`, '', render(rows, nameById), '')
  }
  return sections.join('\n')
}

function renderPage(id, meta, machine, learners, prev, next, nameById, moveName) {
  const prevName = moveName(prev) ?? ''
  const nextName = moveName(next) ?? ''
  return [
    '---',
    `title: ${meta.nameZh}`,
    '---',
    '',
    renderHero(id, meta, machine),
    '',
    '<section class="dex-section" aria-label="招式说明">',
    '',
    '## 招式说明',
    '',
    renderEffect(meta),
    '',
    '</section>',
    '',
    '<section class="dex-section" aria-label="可学习宝可梦">',
    '',
    '## 可学习宝可梦（火红/叶绿）',
    '',
    renderLearners(learners, nameById),
    '',
    '</section>',
    '',
    '---',
    '',
    '<div class="dex-pager">',
    `  <a href="/moves/${pad(prev)}">← ${prevName}</a>`,
    '  <a href="/moves/">返回招式图鉴</a>',
    `  <a href="/moves/${pad(next)}">${nextName} →</a>`,
    '</div>',
    ''
  ].join('\n')
}

async function main() {
  const data = JSON.parse(await readFile(DATA_FILE, 'utf8'))
  const details = JSON.parse(await readFile(DETAILS_FILE, 'utf8'))
  const nameById = Object.fromEntries(data.dex.map((p) => [p.id, p.nameZh]))

  const moveIds = Object.keys(details.moves).map(Number).sort((a, b) => a - b)

  // 反向索引：招式 -> 可学习的宝可梦
  const learners = new Map(moveIds.map((id) => [id, []]))
  for (const [pokeId, entries] of Object.entries(details.learnsets)) {
    for (const e of entries) {
      const list = learners.get(e.move)
      if (list) list.push({ pokeId: Number(pokeId), method: e.method, level: e.level })
    }
  }

  // 清理旧的生成页（保留 index.md 与非数字命名的文件）
  await mkdir(OUT_DIR, { recursive: true })
  const existing = await readdir(OUT_DIR)
  for (const f of existing) {
    if (/^\d{3}\.md$/.test(f)) await unlink(path.join(OUT_DIR, f))
  }

  const moveName = (id) => details.moves[String(id)]?.nameZh ?? `#${pad(id)}`
  for (let i = 0; i < moveIds.length; i++) {
    const id = moveIds[i]
    const prev = moveIds[i === 0 ? moveIds.length - 1 : i - 1]
    const next = moveIds[i === moveIds.length - 1 ? 0 : i + 1]
    await writeFile(
      path.join(OUT_DIR, `${pad(id)}.md`),
      renderPage(id, details.moves[String(id)], details.machines[String(id)], learners.get(id), prev, next, nameById, moveName)
    )
  }

  console.log(`已生成 ${moveIds.length} 个招式页到 ${path.relative(ROOT, OUT_DIR)}/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
