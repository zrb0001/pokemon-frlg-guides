// 抓取第三世代全国图鉴（1-386）数据、进化链、火红/叶绿遭遇/招式数据与精灵图片
// 用法：node scripts/fetch-pokedex.mjs            # 全量抓取
//       node scripts/fetch-pokedex.mjs --moves-only  # 只重新抓取招式数据（保留其余字段）
// 输出：guide/.vitepress/data/pokedex.json、guide/.vitepress/data/pokemon-details.json、
//       guide/public/sprites/{id}.png

import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = path.join(ROOT, 'guide/.vitepress/data')
const DETAILS_FILE = path.join(DATA_DIR, 'pokemon-details.json')
const SPRITES_DIR = path.join(ROOT, 'guide/public/sprites')
const API = 'https://pokeapi.co/api/v2'
const SPRITE_BASE =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'
const MAX_ID = 386
const DELAY_MS = 100
const MAX_RETRY = 2

const TYPE_ZH = {
  normal: '一般',
  fire: '火',
  water: '水',
  electric: '电',
  grass: '草',
  ice: '冰',
  fighting: '格斗',
  poison: '毒',
  ground: '地面',
  flying: '飞行',
  psychic: '超能',
  bug: '虫',
  rock: '岩石',
  ghost: '幽灵',
  dragon: '龙',
  dark: '恶',
  steel: '钢',
  fairy: '妖精'
}

const STAT_KEYS = {
  hp: 'hp',
  attack: 'atk',
  defense: 'def',
  'special-attack': 'spa',
  'special-defense': 'spd',
  speed: 'spe'
}

// PokéAPI 的 location-area 没有中文名，这里按火红/叶绿实际用到的 139 个地点手工映射
// （七之岛相关地点无官方中文译名，采用常见民间译名）
const LOCATION_ZH = {
  'pallet-town-area': '真新镇',
  'viridian-city-area': '常青市',
  'cerulean-city-area': '华蓝市',
  'vermilion-city-area': '枯叶市',
  'celadon-city-area': '玉虹市',
  'fuchsia-city-area': '浅红市',
  'cinnabar-island-area': '红莲镇',
  'celadon-city-celadon-mansion': '玉虹市 玉虹大厦',
  'celadon-city-prize-corner': '玉虹市 游戏城兑换处',
  'cinnabar-island-cinnabar-lab': '红莲镇 红莲研究所',
  'saffron-city-fighting-dojo': '金黄市 格斗道场',
  'saffron-city-silph-co-7f': '金黄市 西尔佛公司 7F',
  'kanto-pokecenter-area': '宝可梦中心',
  'ss-anne-area': '圣特安努号',
  'kanto-underground-path-area': '地下通道',
  'kanto-route-1-area': '1号道路',
  'kanto-route-2-north-towards-pewter-city': '2号道路（北段）',
  'kanto-route-2-south-towards-viridian-city': '2号道路（南段）',
  'kanto-route-3-area': '3号道路',
  'kanto-route-3-pokemon-center': '3号道路 宝可梦中心',
  'kanto-route-4-area': '4号道路',
  'kanto-route-4-pokemon-center': '4号道路 宝可梦中心',
  'kanto-route-5-area': '5号道路',
  'kanto-route-6-area': '6号道路',
  'kanto-route-7-area': '7号道路',
  'kanto-route-8-area': '8号道路',
  'kanto-route-9-area': '9号道路',
  'kanto-route-10-area': '10号道路',
  'kanto-route-11-area': '11号道路',
  'kanto-route-12-area': '12号道路',
  'kanto-route-13-area': '13号道路',
  'kanto-route-14-area': '14号道路',
  'kanto-route-15-area': '15号道路',
  'kanto-route-16-area': '16号道路',
  'kanto-route-17-area': '17号道路',
  'kanto-route-18-area': '18号道路',
  'kanto-sea-route-19-area': '19号水路',
  'kanto-sea-route-20-area': '20号水路',
  'kanto-sea-route-21-area': '21号水路',
  'kanto-route-22-area': '22号道路',
  'kanto-route-23-area': '23号道路',
  'kanto-route-24-area': '24号道路',
  'kanto-route-25-area': '25号道路',
  'viridian-forest-area': '常青森林',
  'mt-moon-1f': '月见山 1F',
  'mt-moon-b1f': '月见山 B1F',
  'mt-moon-b2f': '月见山 B2F',
  'digletts-cave-area': '地鼠洞',
  'rock-tunnel-1f': '岩山隧道 1F',
  'rock-tunnel-b1f': '岩山隧道 B1F',
  'kanto-power-plant-area': '无人发电厂',
  'pokemon-tower-3f': '宝可梦塔 3F',
  'pokemon-tower-4f': '宝可梦塔 4F',
  'pokemon-tower-5f': '宝可梦塔 5F',
  'pokemon-tower-6f': '宝可梦塔 6F',
  'pokemon-tower-7f': '宝可梦塔 7F',
  'pokemon-mansion-1f': '宝可梦屋 1F',
  'pokemon-mansion-2f': '宝可梦屋 2F',
  'pokemon-mansion-3f': '宝可梦屋 3F',
  'pokemon-mansion-b1f': '宝可梦屋 B1F',
  'seafoam-islands-1f': '双子岛 1F',
  'seafoam-islands-b1f': '双子岛 B1F',
  'seafoam-islands-b2f': '双子岛 B2F',
  'seafoam-islands-b3f': '双子岛 B3F',
  'seafoam-islands-b4f': '双子岛 B4F',
  'kanto-victory-road-2-1f': '冠军之路 1F',
  'kanto-victory-road-2-2f': '冠军之路 2F',
  'kanto-victory-road-2-3f': '冠军之路 3F',
  'cerulean-cave-1f': '华蓝洞窟 1F',
  'cerulean-cave-2f': '华蓝洞窟 2F',
  'cerulean-cave-b1f': '华蓝洞窟 B1F',
  'kanto-safari-zone-area-1-east': '狩猎地带 园区1（东）',
  'kanto-safari-zone-area-2-north': '狩猎地带 园区2（北）',
  'kanto-safari-zone-area-3-west': '狩猎地带 园区3（西）',
  'kanto-safari-zone-middle': '狩猎地带 中部',
  'one-island-area': '一之岛',
  'kindle-road-area': '灯火山道',
  'mt-ember-area': '灯火山',
  'mt-ember-1f-cave-behind-team-rocket': '灯火山 1F（火箭队基地后方）',
  'mt-ember-b1f': '灯火山 B1F',
  'mt-ember-b2f': '灯火山 B2F',
  'mt-ember-b3f': '灯火山 B3F',
  'mt-ember-cave': '灯火山 洞窟',
  'mt-ember-inside': '灯火山 内部',
  'mt-ember-summit': '灯火山 山顶',
  'berry-forest-area': '树果森林',
  'bond-bridge-area': '索桥',
  'cape-brink-area': '布灵海角',
  'five-island-area': '五之岛',
  'five-isle-meadow-area': '五岛草原',
  'memorial-pillar-area': '纪念柱',
  'water-labyrinth-area': '水之迷宫',
  'resort-gorgeous-area': '高级度假区',
  'lost-cave-item-rooms': '不归洞窟 道具房间',
  'lost-cave-room-1': '不归洞窟 房间1',
  'lost-cave-room-2': '不归洞窟 房间2',
  'lost-cave-room-3': '不归洞窟 房间3',
  'lost-cave-room-4': '不归洞窟 房间4',
  'lost-cave-room-5': '不归洞窟 房间5',
  'lost-cave-room-6': '不归洞窟 房间6',
  'lost-cave-room-7': '不归洞窟 房间7',
  'lost-cave-room-8': '不归洞窟 房间8',
  'lost-cave-room-9': '不归洞窟 房间9',
  'lost-cave-room-10': '不归洞窟 房间10',
  'green-path-area': '绿茵小径',
  'water-path-area': '水之步道',
  'outcast-island-area': '外岛',
  'ruin-valley-area': '遗迹山谷',
  'tanoby-ruins-area': '塔诺比遗迹',
  'monean-chamber-area': '莫内亚洞窟',
  'liptoo-chamber-area': '利普图洞窟',
  'weepth-chamber-area': '威普斯洞窟',
  'dilford-chamber-area': '迪尔福德洞窟',
  'scufib-chamber-area': '斯卡菲布洞窟',
  'rixy-chamber-area': '里克西洞窟',
  'viapos-chamber-area': '维亚波斯洞窟',
  'pattern-bush-area': '花纹丛林',
  'canyon-entrance-area': '峡谷入口',
  'sevault-canyon-area': '塞佛峡谷',
  'trainer-tower-area': '训练家塔',
  'four-island-area': '四之岛',
  'icefall-cave-entrance': '冰瀑洞窟 入口',
  'icefall-cave-1f': '冰瀑洞窟 1F',
  'icefall-cave-b1f': '冰瀑洞窟 B1F',
  'icefall-cave-waterfall': '冰瀑洞窟 瀑布',
  'three-isle-port-area': '三岛港口',
  'kanto-altering-cave-a': '变化洞窟',
  'kanto-altering-cave-b': '变化洞窟',
  'kanto-altering-cave-c': '变化洞窟',
  'kanto-altering-cave-d': '变化洞窟',
  'kanto-altering-cave-e': '变化洞窟',
  'kanto-altering-cave-f': '变化洞窟',
  'kanto-altering-cave-g': '变化洞窟',
  'kanto-altering-cave-h': '变化洞窟',
  'kanto-altering-cave-i': '变化洞窟',
  'birth-island-area': '诞生之岛',
  'navel-rock-area': '脐之岩',
  'roaming-kanto-area': '关都地区（游走）',
  'treasure-beach-area': '宝物海滩'
}

const METHOD_ZH = {
  walk: '行走',
  surf: '冲浪',
  'old-rod': '破旧钓竿',
  'good-rod': '好钓竿',
  'super-rod': '厉害钓竿',
  'rock-smash': '碎岩',
  static: '定点',
  'roaming-grass': '游走',
  'roaming-surf': '游走（冲浪）',
  pokeflute: '定点（宝可梦之笛）',
  gift: '赠送/兑换',
  'gift-egg': '赠送（蛋）',
  'npc-trade': 'NPC 交换'
}

// 与简体攻略无关的配信方式，直接过滤
const METHOD_SKIP = new Set(['colosseum-bonus-disc-jpn'])

const DAMAGE_CLASS_ZH = { physical: '物理', special: '特殊', status: '变化' }
const FRLG = 'firered-leafgreen'
const MOVES_ONLY = process.argv.includes('--moves-only')

const VERSION_ZH = { firered: '火红', leafgreen: '叶绿' }
const VERSION_ORDER = { 火红: 0, 叶绿: 1 }

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchJson(url, retries = MAX_RETRY) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      if (attempt >= retries) throw err
      await sleep(500 * (attempt + 1))
    }
  }
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let i = 0
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (i < items.length) {
        const idx = i++
        results[idx] = await fn(items[idx])
      }
    })
  )
  return results
}

async function downloadSprite(id, retries = MAX_RETRY) {
  const file = path.join(SPRITES_DIR, `${id}.png`)
  try {
    await access(file)
    return true
  } catch {
    /* not cached yet */
  }
  const url = `${SPRITE_BASE}/${id}.png`
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      await writeFile(file, buf)
      return true
    } catch (err) {
      if (attempt >= retries) return false
      await sleep(500 * (attempt + 1))
    }
  }
}

const speciesIdFromUrl = (url) => parseInt(url.match(/\/(\d+)\/?$/)[1], 10)
const moveIdFromUrl = (url) => parseInt(url.match(/\/(\d+)\/?$/)[1], 10)

// 招式详情 → 落库字段（中文名/英文名/属性/分类/数值 + 说明文案）
// PokéAPI 招式 effect_entries 无中文，说明文案取 zh-hans flavor_text（去空白）。
// 注意：从《剑/盾》起被删除的招式，其 sword-shield 条目是「无法使用这个招式…」占位文案，
// 必须过滤后再取最后一条；英文 short_effect 一并保留作兜底展示
const PLACEHOLDER_ZH = '无法使用这个招式'
function moveMeta(mv) {
  const flavorZh = mv.flavor_text_entries.filter(
    (e) => e.language.name === 'zh-hans' && !e.flavor_text.includes(PLACEHOLDER_ZH)
  )
  const effectZh = (flavorZh.at(-1)?.flavor_text ?? '').replace(/\s+/g, '')
  return {
    nameZh:
      mv.names.find((n) => n.language.name === 'zh-hans')?.name ??
      mv.names.find((n) => n.language.name === 'zh-hant')?.name ??
      mv.name,
    nameEn: mv.name,
    type: TYPE_ZH[mv.type.name] ?? mv.type.name,
    category: DAMAGE_CLASS_ZH[mv.damage_class.name] ?? mv.damage_class.name,
    power: mv.power,
    accuracy: mv.accuracy,
    pp: mv.pp,
    effectZh: effectZh || null,
    effectEn: mv.effect_entries.find((e) => e.language.name === 'en')?.short_effect ?? null
  }
}

// 把 evolution_details 拍平成保留原始字段的 detail，方便拿到道具中文名后再生成文案
function pickDetail(d) {
  if (!d) return null
  return {
    trigger: d.trigger.name,
    item: d.item?.name ?? null,
    heldItem: d.held_item?.name ?? null,
    minLevel: d.min_level ?? null,
    minHappiness: d.min_happiness ?? null,
    timeOfDay: d.time_of_day || null
  }
}

// 解析进化链为嵌套结构，过滤 386 号以后的宝可梦（如伊布的四代以后进化型）
function parseChainNode(node) {
  const build = (child) => ({
    id: speciesIdFromUrl(child.species.url),
    detail: pickDetail(child.evolution_details[0]),
    evolvesTo: child.evolves_to.map(build).filter((n) => n.id <= MAX_ID)
  })
  const root = {
    id: speciesIdFromUrl(node.species.url),
    detail: null,
    evolvesTo: node.evolves_to.map(build).filter((n) => n.id <= MAX_ID)
  }
  // 链首是四代以后的宝宝形态（魔墙人偶、吉利蛋、毒蔷薇）时，从首个 ≤386 的节点开始展示
  if (root.id > MAX_ID && root.evolvesTo.length) {
    return { ...root.evolvesTo[0], detail: null }
  }
  return root
}

function describeEvolution(fromId, detail, itemNameOf) {
  if (!detail) return '—'
  if (fromId === 265) return 'Lv.7 以上升级（随机进化）'
  const time = detail.timeOfDay
    ? detail.timeOfDay === 'day'
      ? '（白天）'
      : '（夜晚）'
    : ''
  switch (detail.trigger) {
    case 'level-up':
      if (detail.minHappiness) return `亲密度足够时升级${time}`
      if (detail.heldItem)
        return `携带「${itemNameOf(detail.heldItem)}」通信交换`
      if (detail.minLevel) return `Lv.${detail.minLevel} 以上升级`
      return `升级${time}`
    case 'use-item':
      return `使用 ${itemNameOf(detail.item)}`
    case 'trade':
      return detail.heldItem
        ? `通信交换（携带「${itemNameOf(detail.heldItem)}」）`
        : '通信交换'
    case 'shed':
      return '土居忍士进化时自动出现（队伍需有空位）'
    default:
      return '—'
  }
}

// 遭遇数据 → 按（地点+方式+等级+出现率）合并版本，生成地点列表
function processEncounters(raw, unknownAreas) {
  const byKey = new Map()
  for (const loc of raw) {
    const area = LOCATION_ZH[loc.location_area.name]
    for (const v of loc.version_details) {
      const version = VERSION_ZH[v.version.name]
      if (!version) continue
      if (!area) {
        unknownAreas.add(loc.location_area.name)
        continue
      }
      for (const d of v.encounter_details) {
        if (METHOD_SKIP.has(d.method.name)) continue
        const method = METHOD_ZH[d.method.name] ?? d.method.name
        const key = `${area}|${method}|${d.min_level}|${d.max_level}|${d.chance}|${version}`
        const row = byKey.get(key) ?? {
          area,
          method,
          minLevel: d.min_level,
          maxLevel: d.max_level,
          chance: 0,
          versions: []
        }
        row.chance += d.chance
        if (!row.versions.includes(version)) row.versions.push(version)
        byKey.set(key, row)
      }
    }
  }
  // 同地点+方式+等级+出现率的行跨版本合并
  const merged = new Map()
  for (const row of byKey.values()) {
    const key = `${row.area}|${row.method}|${row.minLevel}|${row.maxLevel}|${row.chance}`
    const target = merged.get(key) ?? { ...row, versions: [] }
    for (const v of row.versions) if (!target.versions.includes(v)) target.versions.push(v)
    merged.set(key, target)
  }
  return [...merged.values()]
    .map((r) => ({
      ...r,
      versions: r.versions.sort((a, b) => VERSION_ORDER[a] - VERSION_ORDER[b])
    }))
    .sort(
      (a, b) =>
        a.area.localeCompare(b.area, 'zh-Hans-CN') ||
        a.minLevel - b.minLevel ||
        b.chance - a.chance
    )
}

// 增量模式：只重新抓取招式数据，写回 pokemon-details.json 的 moves 字段，其余字段原样保留
async function mainMovesOnly() {
  const details = JSON.parse(await readFile(DETAILS_FILE, 'utf8'))
  const moveIds = [...new Set(Object.keys(details.moves).map(Number))].sort((a, b) => a - b)
  console.log(`增量抓取招式：${moveIds.length} 个`)
  const moves = {}
  let done = 0
  await mapLimit(moveIds, 8, async (id) => {
    moves[id] = moveMeta(await fetchJson(`${API}/move/${id}`))
    if (++done % 50 === 0) console.log(`进度：${done}/${moveIds.length}`)
  })
  details.moves = moves
  await writeFile(DETAILS_FILE, JSON.stringify(details))
  const missing = moveIds.filter((id) => !moves[id]?.effectZh)
  console.log(`完成：已更新 ${Object.keys(moves).length} 个招式（${missing.length} 个无中文说明）`)
}

async function main() {
  if (MOVES_ONLY) return mainMovesOnly()
  await mkdir(DATA_DIR, { recursive: true })
  await mkdir(SPRITES_DIR, { recursive: true })

  const dex = []
  const missingSprites = []
  const chainUrls = new Map() // chainId -> url
  const encountersById = new Map() // id -> raw encounters
  const flavors = {} // id -> 中文图鉴介绍
  const learnsetsById = new Map() // id -> [{ slug, url, method, level }]
  const moveUrls = new Set() // 招式详情 url（去重）

  for (let id = 1; id <= MAX_ID; id++) {
    const [pokemon, species, encounters] = await Promise.all([
      fetchJson(`${API}/pokemon/${id}`),
      fetchJson(`${API}/pokemon-species/${id}`),
      fetchJson(`${API}/pokemon/${id}/encounters`)
    ])

    const nameZh =
      species.names.find((n) => n.language.name === 'zh-hans')?.name ??
      species.names.find((n) => n.language.name === 'zh-hant')?.name ??
      pokemon.name

    // 图鉴介绍：优先简体，其次繁体，去掉换行与多余空白
    flavors[id] = (
      species.flavor_text_entries.filter((e) => e.language.name === 'zh-hans').at(-1)
        ?.flavor_text ??
      species.flavor_text_entries.filter((e) => e.language.name === 'zh-hant').at(-1)
        ?.flavor_text ??
      ''
    ).replace(/\s+/g, '')

    // 火红/叶绿版本的可学招式
    const learnset = []
    for (const m of pokemon.moves) {
      for (const v of m.version_group_details) {
        if (v.version_group.name !== FRLG) continue
        learnset.push({
          slug: m.move.name,
          url: m.move.url,
          method: v.move_learn_method.name,
          level: v.level_learned_at
        })
        moveUrls.add(m.move.url)
      }
    }
    learnsetsById.set(id, learnset)

    const stats = {}
    let total = 0
    for (const s of pokemon.stats) {
      const key = STAT_KEYS[s.stat.name]
      stats[key] = s.base_stat
      total += s.base_stat
    }
    stats.total = total

    const chainId = speciesIdFromUrl(species.evolution_chain.url)
    chainUrls.set(chainId, species.evolution_chain.url)
    encountersById.set(id, encounters)

    dex.push({
      id,
      nameZh,
      nameEn: pokemon.name,
      types: pokemon.types
        .sort((a, b) => a.slot - b.slot)
        .map((t) => TYPE_ZH[t.type.name] ?? t.type.name),
      stats,
      height: pokemon.height / 10,
      weight: pokemon.weight / 10,
      legendary: species.is_legendary,
      mythical: species.is_mythical,
      sprite: `/sprites/${id}.png`,
      chainId
    })

    const ok = await downloadSprite(id)
    if (!ok) missingSprites.push(id)

    if (id % 50 === 0) console.log(`进度：${id}/${MAX_ID}`)
    await sleep(DELAY_MS)
  }

  // 抓取全部进化链（按链去重）
  console.log(`抓取进化链：${chainUrls.size} 条`)
  const chainEntries = await mapLimit([...chainUrls.entries()], 8, async ([chainId, url]) => {
    const data = await fetchJson(url)
    return [chainId, parseChainNode(data.chain)]
  })
  const rawChains = Object.fromEntries(chainEntries)

  // 收集进化涉及道具的 slug，抓中文名
  const itemSlugs = new Set()
  const walkChain = (node) => {
    if (node.detail?.item) itemSlugs.add(node.detail.item)
    if (node.detail?.heldItem) itemSlugs.add(node.detail.heldItem)
    node.evolvesTo.forEach(walkChain)
  }
  Object.values(rawChains).forEach(walkChain)

  const itemNames = {}
  await mapLimit([...itemSlugs], 8, async (slug) => {
    const data = await fetchJson(`${API}/item/${slug}`)
    itemNames[slug] =
      data.names.find((n) => n.language.name === 'zh-hans')?.name ??
      data.names.find((n) => n.language.name === 'zh-hant')?.name ??
      slug
  })

  const itemNameOf = (slug) => itemNames[slug] ?? slug

  // 生成带中文条件的进化链
  const chains = {}
  for (const [chainId, chain] of Object.entries(rawChains)) {
    const render = (node) => ({
      id: node.id,
      evolvesTo: node.evolvesTo.map((child) => ({
        id: child.id,
        condition: describeEvolution(node.id, child.detail, itemNameOf),
        evolvesTo: render(child).evolvesTo
      }))
    })
    chains[chainId] = render(chain)
  }

  // 遭遇数据落位
  const unknownAreas = new Set()
  for (const p of dex) {
    p.locations = processEncounters(encountersById.get(p.id), unknownAreas)
  }

  // 抓取招式详情（中文名/英文名/属性/分类/数值/说明）与火红叶绿招式机编号
  console.log(`抓取招式：${moveUrls.size} 个`)
  const moves = {}
  const machineUrlByMove = new Map() // moveUrl -> machine url
  await mapLimit([...moveUrls], 8, async (url) => {
    const mv = await fetchJson(url)
    const machine = mv.machines.find((m) => m.version_group.name === FRLG)
    if (machine) machineUrlByMove.set(url, machine.machine.url)
    moves[moveIdFromUrl(url)] = moveMeta(mv)
  })

  const machines = {} // moveId -> 'TM01' / 'HM01'
  await mapLimit([...machineUrlByMove.entries()], 8, async ([moveUrl, mUrl]) => {
    const mc = await fetchJson(mUrl)
    // machine 对象没有编号字段，从道具名（tm22 / hm01）推导
    const m = mc.item.name.match(/^(tm|hm)(\d+)$/i)
    machines[moveIdFromUrl(moveUrl)] = m
      ? `${m[1].toUpperCase()}${m[2].padStart(2, '0')}`
      : mc.item.name.toUpperCase()
  })

  // 每只宝可梦的火红叶绿可学招式（按 招式+方式+等级 去重）
  const learnsets = {}
  for (const p of dex) {
    const seen = new Set()
    learnsets[p.id] = []
    for (const e of learnsetsById.get(p.id)) {
      const moveId = moveIdFromUrl(e.url)
      const key = `${moveId}|${e.method}|${e.level}`
      if (seen.has(key)) continue
      seen.add(key)
      learnsets[p.id].push({ move: moveId, method: e.method, level: e.level })
    }
  }

  const data = {
    updatedAt: new Date().toISOString().slice(0, 10),
    source: 'pokeapi.co',
    dex,
    chains
  }
  await writeFile(
    path.join(DATA_DIR, 'pokedex.json'),
    JSON.stringify(data, null, 2)
  )

  const details = {
    updatedAt: data.updatedAt,
    source: 'pokeapi.co',
    flavors,
    moves,
    machines,
    learnsets
  }
  await writeFile(
    path.join(DATA_DIR, 'pokemon-details.json'),
    JSON.stringify(details)
  )

  console.log(`完成：共 ${dex.length} 只宝可梦，${Object.keys(chains).length} 条进化链，${Object.keys(moves).length} 个招式`)
  if (unknownAreas.size) {
    console.warn(`警告：以下地点 slug 未匹配到中文名，已跳过：${[...unknownAreas].join(', ')}`)
  }
  if (missingSprites.length) {
    console.warn(`精灵图下载失败（${missingSprites.length} 张）：${missingSprites.join(', ')}`)
    process.exitCode = 1
  } else {
    console.log('精灵图：386/386 全部就绪')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
