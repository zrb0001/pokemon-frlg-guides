# AGENTS.md

本文件面向 AI 代理与协作者，说明本项目的结构、命令与开发约定。

## 项目简介

《宝可梦 火红/叶绿》简体中文攻略站点，基于 VitePress 1.x 构建。图鉴（386 只）、招式（351 个）与「要素」栏目（特性、性格、道馆与四天王、交换 NPC）均为真实数据；`secrets` 页仅收录技能机获得地点，内容持续补充中。

## 技术栈

- VitePress 1.x + Vue 3（Markdown 驱动，支持在 Markdown 中嵌入 Vue 组件）
- 无测试框架、无 lint 配置（如需添加请先与用户确认）
- 包管理：npm

## 常用命令

```bash
npm install          # 安装依赖
npm run docs:dev     # 本地开发（默认 http://localhost:5173）
npm run docs:build   # 构建静态站点，输出到 guide/.vitepress/dist/
npm run docs:preview # 预览构建产物
node scripts/fetch-pokedex.mjs       # 从 PokéAPI 重新抓取图鉴数据（含进化链、火红/叶绿遭遇与招式数据）与精灵图片
node scripts/fetch-pokedex.mjs --moves-only  # 只重新抓取招式数据（保留 pokemon-details.json 其余字段）
npm run docs:gen                     # 重新生成 386 个宝可梦详情页 + 351 个招式详情页 Markdown
npm run docs:gen-moves               # 只重新生成招式详情页
```

抓取数据后需要重新生成详情页：`node scripts/fetch-pokedex.mjs && npm run docs:gen`。

改动完成后必须运行 `npm run docs:build` 确认构建无报错。

## 目录结构

```
guide/                              # VitePress 文档根目录（site root）
├── .vitepress/
│   ├── config.mts                  # 站点配置：语言、导航、侧边栏、搜索、页脚
│   ├── theme/
│   │   ├── index.ts                # 主题入口：扩展默认主题、挂载配色切换按钮
│   │   └── style.css               # 全部自定义样式（配色变量 + 简洁风格 + 占位样式）
│   ├── components/                 # Markdown 中使用的 Vue 组件
│   │   ├── PaletteToggle.vue       # 导航栏配色切换（火红/叶绿）
│   │   ├── PokedexTable.vue        # 全国图鉴（属性筛选，386 只单页展示）
│   │   └── MovesTable.vue          # 招式图鉴（属性筛选，351 个单页展示）
│   └── data/
│       ├── pokedex.json            # 全国图鉴数据（基础信息/进化链/捕捉地点，scripts/fetch-pokedex.mjs 生成）
│       └── pokemon-details.json    # 图鉴介绍/招式元数据/招式机/学习列表（scripts/fetch-pokedex.mjs 生成，仅生成脚本读取）
├── public/
│   ├── pokeball.svg                # 站点 Logo
│   └── sprites/{编号}.png           # 精灵图（本地，386 张）
├── index.md                        # 首页（home 布局）
├── pokedex/
│   ├── index.md                    # 宝可梦图鉴（列表页）
│   └── {001..386}.md               # 每只宝可梦的详情页（scripts 生成，勿手改）
├── moves/
│   ├── index.md                    # 招式图鉴（列表页）
│   └── {编号}.md                    # 每个招式的详情页（scripts 生成，勿手改）
├── elements/
│   ├── index.md                    # 要素专题索引
│   ├── abilities.md                # 特性介绍
│   ├── natures.md                  # 性格介绍
│   ├── gym-leaders-elite-four.md   # 道馆馆主与四天王
│   └── npc-trades.md               # 交换宝可梦的 NPC
└── secrets/index.md                # 技能、道具与隐藏要素
scripts/
├── fetch-pokedex.mjs               # 从 PokéAPI 抓取图鉴数据（含进化链、火红/叶绿遭遇与招式数据）与精灵图片；--moves-only 只抓招式
├── generate-pokedex-pages.mjs      # 从 pokedex.json + pokemon-details.json 生成 386 个详情页 Markdown
└── generate-move-pages.mjs         # 从 pokemon-details.json 生成 351 个招式详情页 Markdown
```

## 配色系统

UI 为简洁风格，提供火红 / 叶绿两套配色，各含亮色与暗色变体，定义在 `guide/.vitepress/theme/style.css`：

- 默认火红；通过 `html[data-palette='leafgreen']` 切换叶绿
- 暗色由 VitePress 内置的 `html.dark` 驱动，暗色品牌色定义在对应选择器下
- 不持久化用户选择（无 localStorage），刷新后回到默认火红
- 新增组件样式时，品牌色一律引用 `--vp-c-brand-*` 系列变量，不要硬编码颜色，以保证四套配色下都正确

## 内容约定

- 全站使用简体中文
- 图鉴等结构化数据放在 `.vitepress/data/` 下的 JSON 文件中，由 `scripts/` 下的脚本生成，不要手写
- Markdown 中引入组件的方式：`<script setup>` import + 模板中使用（参考 `guide/pokedex/index.md`）
- 精灵图片下载到本地 `guide/public/sprites/`，不要引用外部 CDN（由抓取脚本统一更新）
- 站点开启 `cleanUrls`，内部链接使用无 `.html` 后缀的路径（如 `/pokedex/001`）

## 数据来源参考

填充真实攻略数据时，以下来源可供查证与采集：

- **Bulbapedia**（bulbagarden.net）——最权威的英文宝可梦百科，火红叶绿有独立页面，涵盖剧情、地图、道具、训练家数据、版本差异等，适合查原始设定数据。
- **Serebii.net**——老牌英文站，火红叶绿专区整理了捕获地点表、招式学习列表、七岛流程、配信活动历史等，数据颗粒度很细。
- **Veekun**（veekun.com）——把历代宝可梦数据做成了可下载的数据库（含第三代种族值、招式、Encounter 数据），适合做数据分析或二次开发。
- **PokéAPI**（pokeapi.co）——免费 RESTful API，可程序化查询第三世代宝可梦、招式、道具数据，适合做工具或小程序。本站图鉴与招式数据（含招式中文说明）均由 `scripts/fetch-pokedex.mjs` 抓取自该 API；招式说明取自各招式的 zh-hans flavor text（PokéAPI 的招式 effect_entries 无中文）。
