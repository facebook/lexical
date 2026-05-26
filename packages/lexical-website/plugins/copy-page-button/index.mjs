/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import fs from 'node:fs';
import path from 'node:path';

const SITE_ALIAS = '@site';

/**
 * Path namespace (under `static/`) where a Markdown copy of every doc page is
 * emitted, e.g. the page `/docs/intro` is written to `static/llms/docs/intro.md`
 * and served at `/llms/docs/intro.md`. Must stay in sync with the
 * `MARKDOWN_NAMESPACE` constant in `src/theme/CopyPageButton/index.tsx`.
 */
const OUTPUT_NAMESPACE = 'llms';

function stripFrontMatter(raw) {
  return raw.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

/**
 * Drop the leading block of MDX `import`/`export` statements (and blank lines)
 * that appear before the first piece of real content. Only the leading block is
 * removed so `import`/`export` lines inside code fences are left untouched.
 */
function stripLeadingMdxStatements(body) {
  const lines = body.split('\n');
  let index = 0;
  for (; index < lines.length; index++) {
    const trimmed = lines[index].trim();
    if (trimmed === '' || /^(?:import|export)\b/.test(trimmed)) {
      continue;
    }
    break;
  }
  return lines.slice(index).join('\n');
}

function relativePermalink(permalink, baseUrl) {
  let rel = permalink;
  if (baseUrl && rel.startsWith(baseUrl)) {
    rel = rel.slice(baseUrl.length);
  }
  rel = rel.replace(/^\/+/, '').replace(/\/+$/, '');
  return rel || 'index';
}

/**
 * Emit a clean Markdown copy of every doc page at build time so the
 * server-rendered CopyPageButton can link to / copy / hand off real Markdown
 * without any client-side DOM scraping.
 *
 * @type {import('@docusaurus/types').PluginModule}
 */
const copyPageButtonPlugin = async function (context) {
  const {siteDir, siteConfig} = context;
  const {baseUrl, url: siteUrl} = siteConfig;
  const outputRoot = path.join(siteDir, 'static', OUTPUT_NAMESPACE);

  const resolveSource = source => {
    if (source.startsWith(SITE_ALIAS)) {
      return path.join(siteDir, source.slice(SITE_ALIAS.length));
    }
    return path.isAbsolute(source) ? source : path.join(siteDir, source);
  };

  return {
    // Runs in both dev and production, after every plugin has loaded its
    // content, so we have the authoritative permalink -> source mapping for
    // every doc (including the generated API reference).
    allContentLoaded({allContent}) {
      const docsContent = allContent['docusaurus-plugin-content-docs'];
      if (!docsContent) {
        return;
      }

      // Regenerate from scratch so renamed/removed pages don't leave orphans.
      fs.rmSync(outputRoot, {force: true, recursive: true});

      const normalizedSiteUrl = String(siteUrl || '').replace(/\/$/, '');

      for (const instance of Object.values(docsContent)) {
        const loadedVersions = (instance && instance.loadedVersions) || [];
        for (const version of loadedVersions) {
          for (const doc of version.docs || []) {
            const sourcePath = resolveSource(doc.source);
            let raw;
            try {
              raw = fs.readFileSync(sourcePath, 'utf-8');
            } catch {
              continue;
            }

            let body = stripFrontMatter(raw);
            if (sourcePath.endsWith('.mdx')) {
              body = stripLeadingMdxStatements(body);
            }
            body = body.trim();

            const pageUrl = `${normalizedSiteUrl}${doc.permalink}`;
            const header = /^#\s/.test(body)
              ? `URL: ${pageUrl}\n\n`
              : `# ${doc.title}\n\nURL: ${pageUrl}\n\n`;

            const outputPath = path.join(
              outputRoot,
              `${relativePermalink(doc.permalink, baseUrl)}.md`,
            );
            fs.mkdirSync(path.dirname(outputPath), {recursive: true});
            fs.writeFileSync(outputPath, `${header}${body}\n`);
          }
        }
      }
    },

    name: 'copy-page-button',
  };
};

export default copyPageButtonPlugin;
