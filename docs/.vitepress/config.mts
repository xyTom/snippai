import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Snippai",
  description: "An AI-powered snipping tool | AI 智能截图工具",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/logo.svg',
    nav: [
      { text: 'Home | 首页', link: '/' },
      { text: 'Getting Started | 快速开始', link: '/api-examples' },
      { text: 'Features | 功能说明', link: '/markdown-examples' }
    ],

    sidebar: [
      {
        text: 'Documentation | 文档',
        items: [
          { text: 'Getting Started | 快速开始', link: '/api-examples' },
          { text: 'Features Guide | 功能说明', link: '/markdown-examples' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/xyTom/snippai' }
    ]
  }
})
