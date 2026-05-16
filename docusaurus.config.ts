import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'AWE Documentation',
  tagline: 'Automation Workflow Engine',
  favicon: 'img/awe-logo-mark.png',

  // Disable Faster/Rspack because its HMR currently panics on this Windows/OneDrive path.
  future: {
    faster: false,
  },

  url: 'https://ttanhsonsisu.github.io',
  baseUrl: '/AWE-docs/',
  organizationName: 'AWE-docs',
  projectName: 'AWE-Automation-Workflow-Engine',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: undefined,
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl: undefined,
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'AWE Docs',
      logo: {
        alt: 'AWE logo',
        src: 'img/awe-logo-mark.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {to: '/docs/awe/overview', label: 'AWE Platform', position: 'left'},
        {to: '/docs/awe/builtin-plugins', label: 'Plugins', position: 'left'},
        // {to: '/blog', label: 'Updates', position: 'left'},
        {
          href: 'https://github.com/ttanhsonsisu/AWE-Automation-Workflow-Engine',
          label: 'Repository',
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
            {label: 'AWE Platform', to: '/docs/awe/overview'},
            {label: 'Built-in Plugins', to: '/docs/awe/builtin-plugins'},
            {label: 'Implement Plugin', to: '/docs/awe/custom-plugin-sdk'},
          ],
        },
        {
          title: 'Runtime',
          items: [
            {label: 'Usage Guide', to: '/docs/awe/user-guide'},
            {label: 'Plugin API', to: '/docs/awe/plugin-management-api'},
          ],
        },
        {
          title: 'More',
          items: [
            {label: 'Updates', to: '/blog'},
            {
              label: 'Repository',
              href: 'https://github.com/ttanhsonsisu/AWE-Automation-Workflow-Engine',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} AWE. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
