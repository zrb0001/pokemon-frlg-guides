# 宝可梦火红叶绿攻略站点

基于 [VitePress](https://vitepress.dev/) 构建的《宝可梦 火红/叶绿》简体中文攻略站点骨架。

UI 为简洁风格，内置**火红 / 叶绿**两套配色（均含亮色与暗色变体），默认火红，可通过导航栏右侧按钮切换，不记忆用户选择。

## 项目结构

```
.
├── guide/                          # VitePress 文档根目录
│   ├── .vitepress/
│   │   ├── config.mts              # 站点配置
│   │   ├── theme/
│   │   │   ├── index.ts            # 主题入口
│   │   │   └── style.css           # 自定义样式
│   │   ├── components/             # Vue 组件
│   │   │   ├── PaletteToggle.vue
│   │   │   ├── PokedexTable.vue
│   │   │   └── MovesTable.vue
│   │   └── data/                   # scripts 生成的图鉴/招式数据
│   ├── index.md                    # 首页
│   ├── pokedex/                    # 图鉴（列表页 + 386 个详情页）
│   ├── moves/                      # 招式图鉴（列表页 + 351 个详情页）
│   ├── elements/                   # 要素专题（特性/性格/道馆与四天王/交换 NPC）
│   └── secrets/index.md            # 技能、道具与隐藏要素
├── scripts/                        # 数据抓取与页面生成脚本
├── package.json
└── README.md
```

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run docs:dev

# 构建静态站点
npm run docs:build

# 预览构建产物
npm run docs:preview
```

## 当前状态

图鉴（386 只宝可梦详情页）、招式图鉴（351 个招式详情页）与要素专题（特性、性格、道馆与四天王、交换 NPC）均已填充真实数据；`secrets` 页目前收录技能机获得地点，内容持续补充中。

## 后续计划

1. 补充 secrets 页的完整 TM/HM 获得地点、隐藏道具与传说宝可梦触发条件
2. 添加主线流程攻略
3. 部署到静态托管平台
