import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import type { Options as DocsOptions } from "@docusaurus/plugin-content-docs";

const config: Config = {
  title: 'GeaFlow',
  tagline: 'Dinosaurs are cool',
  favicon: 'img/favicon.png',
  url: 'https://apache.github.io/',
  baseUrl: '',
  onBrokenLinks: "warn",
  markdown: {
    format: "md",
    mermaid: true,
    preprocessor: ({ filePath, fileContent }) => {
      if (filePath.includes("application-development/1.api/1.overview")) {
        const regex = /<([A-Z\s,]+)>/g;
        const newContent = fileContent
          ?.replace(regex, "")
          ?.replace(/<IVertex>|<IEdge>/g, "");
        return newContent;
      }
      return fileContent;
    },
  },
  i18n: {
    defaultLocale: 'en-US',
    locales: ['en-US', 'zh-CN'],
    localeConfigs: {
      'en-US': {
        path: "en-US",
        label: 'English',
        htmlLang: 'en-US',
      },
      'zh-CN': {
        path: "zh-CN",
        label: '简体中文',
        htmlLang: 'zh-CN',
      },
    },
  },
  presets: [
    [
      'classic',
      {
        docs: {
          id: "en-current",
          sidebarPath: "./versions_sidebars/version-current-en.ts",
          path: "./versions/version-current/docs-en/source",
          routeBasePath: "docs",
        },
        blog: {
          showReadingTime: false,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
          blogSidebarTitle: 'All posts',
          blogSidebarCount: 'ALL',

        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  plugins: [
    [
      "content-docs",
      {
        id: "zh-current",
        sidebarPath: "./versions_sidebars/version-current-zh.ts",
        path: "./versions/version-current/docs-cn/source",
        routeBasePath: "docs/zh",
      } satisfies DocsOptions,
    ],
    [
      "content-docs",
      {
        id: "en-community",
        sidebarPath: "./sidebars.ts",
        path: "./community/en",
        routeBasePath: "community",
      } satisfies DocsOptions,
    ],
    [
      "content-docs",
      {
        id: "zh-community",
        sidebarPath: "./sidebars.ts",
        path: "./community/zh",
        routeBasePath: "community/zh",
        editCurrentVersion: false,
      } satisfies DocsOptions,
    ],
  ],
  themeConfig: {
    algolia: {
      apiKey: "315fd6a0c1acbdeecd5ba56d8062d00d",
      indexName: "geaflow",
      appId: "HO4M21RAQI",
    },
    navbar: {
      title: '',
      logo: {
        alt: 'GeaFlow Logo',
        src: 'img/logo.png',
      },
      items: [
        {
          id: 'docs',
          position: 'left',
          label: 'Docs',
          to: '/guide',
          activeBasePath: 'docs',
        },
        {
          id: 'community',
          to: '/community',
          position: 'left',
          label: 'Community',
          activeBasePath: 'community',
        },
        {
          position: 'left',
          to: '/download',
          label: 'Download',
        },
        { to: '/blog', label: 'Blog', position: 'left' },
        {
          type: 'dropdown',
          label: 'ASF',
          position: 'left',
          items: [
            {
              label: 'Foundation',
              to: 'https://www.apache.org/'
            },
            {
              label: 'License',
              to: 'https://www.apache.org/licenses/'
            },
            {
              label: 'Events',
              to: 'https://www.apache.org/events/current-event.html'
            },
            {
              label: 'Privacy',
              to: 'https://privacy.apache.org/policies/privacy-policy-public.html'
            },
            {
              label: 'Security',
              to: 'https://www.apache.org/security/'
            },
            {
              label: 'Sponsorship',
              to: 'https://www.apache.org/foundation/sponsorship.html'
            },
            {
              label: 'Thanks',
              to: 'https://www.apache.org/foundation/thanks.html'
            },
            {
              label: 'Code of Conduct',
              to: 'https://www.apache.org/foundation/policies/conduct.html'
            }
          ]
        },
        {
          type: 'localeDropdown',
          position: 'right',
          className: 'header-locale-dropdown',
        },
        {
          href: 'https://github.com/apache/geaflow',
          className: 'header-github-link',
          'aria-label': 'GitHub repository',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Quick Start',
              to: 'docs/quick_start/quick_start',
            },
            {
              label: 'Deployment',
              to: 'docs/deploy/install_guide',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Contribute',
              to: 'community/how_to_contribute',
            },
            {
              label: 'Realease',
              to: 'community/how_to_release',
            }
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'TuGraph',
              href: 'https://tugraph.tech',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/apache/geaflow',
            },
          ],
        },
      ],
      // copyright: `Copyright © ${new Date().getFullYear()} My Project, Inc. Built with Docusaurus.`,
    },
  } satisfies Preset.ThemeConfig,
  headTags: [
    {
      tagName: "meta",
      attributes: {
        name: "algolia-site-verification",
        content: "4AB782AC2021573E",
      },
    },
    {
      tagName: "meta",
      attributes: {
        property: "og:image",
        content: "https://mdn.alipayobjects.com/huamei_tu4rvn/afts/img/A*PkdvSLd2A6kAAAAAQMAAAAgAep_eAQ/original",
      },
    }
  ],
};

export default config;
