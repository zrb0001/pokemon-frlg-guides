import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: '宝可梦火红叶绿攻略',
  description: '宝可梦 火红/叶绿 中文攻略站点',
  srcDir: '.',
  base: '/',
  cleanUrls: true,

  themeConfig: {
    logo: '/pokeball.svg',
    nav: [
      { text: '图鉴', link: '/pokedex/' },
      { text: '招式', link: '/moves/' },
      { text: '要素', link: '/elements/' }
    ],

    sidebar: {
      '/': [
        {
          text: '快速导航',
          items: [
            { text: '首页', link: '/' },
            { text: '图鉴与捕捉地点', link: '/pokedex/' },
            { text: '招式图鉴', link: '/moves/' }
          ]
        },
        {
          text: '要素',
          items: [
            { text: '要素索引', link: '/elements/' },
            { text: '特性介绍', link: '/elements/abilities' },
            { text: '性格介绍', link: '/elements/natures' },
            { text: '道馆馆主与四天王', link: '/elements/gym-leaders-elite-four' },
            { text: '狩猎地带捕捉攻略', link: '/elements/safari-zone' },
            { text: '垂钓地图', link: '/elements/fishing' },
            { text: '交换宝可梦的 NPC', link: '/elements/npc-trades' },
            { text: '技能、道具与隐藏要素', link: '/secrets/' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com' }
    ],

    footer: {
      message: '本站点为玩家攻略整理，宝可梦相关版权归任天堂与 Game Freak 所有。',
      copyright: '© 2026 宝可梦火红叶绿攻略站'
    }
  }
})
