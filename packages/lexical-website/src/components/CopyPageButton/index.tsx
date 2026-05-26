/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useDoc} from '@docusaurus/plugin-content-docs/client';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import clsx from 'clsx';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import styles from './styles.module.css';

/**
 * The path namespace under which the build-time `copy-page-button` plugin emits
 * a Markdown copy of every doc page. Must stay in sync with the plugin's
 * `OUTPUT_NAMESPACE`.
 */
const MARKDOWN_NAMESPACE = 'llms';

// location.origin can't change without a full navigation (which remounts), so
// there is nothing to subscribe to.
const subscribeToOrigin = () => () => {};
const getClientOrigin = () => window.location.origin;

/**
 * The origin to build absolute Markdown URLs from. Renders with the configured
 * Docusaurus site URL on the server (stable for hydration) and reconciles to
 * the real browser origin on the client, so links are correct on production,
 * preview, and local deployments alike.
 */
function useOrigin(serverOrigin: string): string {
  return useSyncExternalStore(
    subscribeToOrigin,
    getClientOrigin,
    () => serverOrigin,
  );
}

function CopyIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ViewIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function ChatGPTIcon() {
  return (
    <svg
      width="16"
      height="16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-0.17090198558635983 0.482230148717937 41.14235318283891 40.0339509076386"
      aria-hidden="true">
      <path d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835A9.964 9.964 0 0 0 18.306.5a10.079 10.079 0 0 0-9.614 6.977 9.967 9.967 0 0 0-6.664 4.834 10.08 10.08 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 7.516 3.35 10.078 10.078 0 0 0 9.617-6.981 9.967 9.967 0 0 0 6.663-4.834 10.079 10.079 0 0 0-1.243-11.813zM22.498 37.886a7.474 7.474 0 0 1-4.799-1.735c.061-.033.168-.091.237-.134l7.964-4.6a1.294 1.294 0 0 0 .655-1.134V19.054l3.366 1.944a.12.12 0 0 1 .066.092v9.299a7.505 7.505 0 0 1-7.49 7.496zM6.392 31.006a7.471 7.471 0 0 1-.894-5.023c.06.036.162.099.237.141l7.964 4.6a1.297 1.297 0 0 0 1.308 0l9.724-5.614v3.888a.12.12 0 0 1-.048.103l-8.051 4.649a7.504 7.504 0 0 1-10.24-2.744zM4.297 13.62A7.469 7.469 0 0 1 8.2 10.333c0 .068-.004.19-.004.274v9.201a1.294 1.294 0 0 0 .654 1.132l9.723 5.614-3.366 1.944a.12.12 0 0 1-.114.01L7.04 23.856a7.504 7.504 0 0 1-2.743-10.237zm27.658 6.437l-9.724-5.615 3.367-1.943a.121.121 0 0 1 .113-.01l8.052 4.648a7.498 7.498 0 0 1-1.158 13.528v-9.476a1.293 1.293 0 0 0-.65-1.132zm3.35-5.043c-.059-.037-.162-.099-.236-.141l-7.965-4.6a1.298 1.298 0 0 0-1.308 0l-9.723 5.614v-3.888a.12.12 0 0 1 .048-.103l8.05-4.645a7.497 7.497 0 0 1 11.135 7.763zm-21.063 6.929l-3.367-1.944a.12.12 0 0 1-.065-.092v-9.299a7.497 7.497 0 0 1 12.293-5.756 6.94 6.94 0 0 0-.236.134l-7.965 4.6a1.294 1.294 0 0 0-.654 1.132l-.006 11.225zm1.829-3.943l4.33-2.501 4.332 2.5v5l-4.331 2.5-4.331-2.5V18z" />
    </svg>
  );
}

function ClaudeIcon() {
  return (
    <svg
      width="16"
      height="16"
      fill="currentColor"
      fillRule="evenodd"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      aria-hidden="true">
      <path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z" />
    </svg>
  );
}

function PerplexityIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true">
      <path d="M22 12.2H13.4V3.7l-1.4 1.2V12.2H3.4l8.6 7.5V22h1.4v-2.3l8.6-7.5zM12 18.3 5.7 13H12v5.3zm1.4 0V13h5.9l-5.9 5.3zM12 10.7V5.6l5.7 5.1H12zm-1.4 0H4.3L10 5.6v5.1z" />
    </svg>
  );
}

function GeminiIcon() {
  return (
    <svg
      width="16"
      height="16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      aria-hidden="true">
      <path
        d="M16 8.016A8.522 8.522 0 008.016 16h-.032A8.521 8.521 0 000 8.016v-.032A8.521 8.521 0 007.984 0h.032A8.522 8.522 0 0016 7.984v.032z"
        fill="currentColor"
      />
    </svg>
  );
}

function ChevronIcon({open}: {open: boolean}) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={clsx(styles.chevron, open && styles.chevronOpen)}
      aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

type MenuItem = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  onSelect?: () => void;
};

export default function CopyPageButton(): React.ReactNode {
  const {metadata} = useDoc();
  const {siteConfig} = useDocusaurusContext();

  // `permalink` already includes the site baseUrl. Strip it so useBaseUrl can
  // re-add it, keeping the namespace path correct under any baseUrl.
  const baseUrl = siteConfig.baseUrl;
  const relativePermalink = metadata.permalink.startsWith(baseUrl)
    ? metadata.permalink.slice(baseUrl.length)
    : metadata.permalink.replace(/^\/+/, '');
  const markdownPath = useBaseUrl(
    `${MARKDOWN_NAMESPACE}/${relativePermalink.replace(/^\/+/, '')}.md`,
  );

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const copyMarkdown = useCallback(async () => {
    try {
      const response = await fetch(markdownPath);
      const text = await response.text();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard or fetch unavailable; fail silently.
    }
  }, [markdownPath]);

  // Absolute URL of the Markdown file for AI tools to fetch.
  const origin = useOrigin(new URL(siteConfig.url).origin);
  const aiPrompt = `Please read and explain this documentation page: ${origin}${markdownPath}\n\nPlease provide a clear summary and help me understand the key concepts covered in this documentation.`;
  const aiHref = (base: string, extraParams: Record<string, string> = {}) =>
    `${base}?${new URLSearchParams({q: aiPrompt, ...extraParams}).toString()}`;

  // "Open in <tool>" links are plain anchors (target=_blank) rather than
  // window.open() calls: anchors are treated as user-initiated navigations and
  // aren't silently swallowed by popup blockers.
  const items: MenuItem[] = [
    {
      description: copied
        ? 'Copied to clipboard'
        : 'Copy this page as Markdown for LLMs',
      icon: copied ? <CheckIcon /> : <CopyIcon />,
      id: 'copy',
      onSelect: copyMarkdown,
      title: copied ? 'Copied!' : 'Copy as Markdown',
    },
    {
      description: 'View this page as plain Markdown',
      href: markdownPath,
      icon: <ViewIcon />,
      id: 'view',
      title: 'View as Markdown',
    },
    {
      description: 'Ask ChatGPT about this page',
      href: aiHref('https://chatgpt.com/'),
      icon: <ChatGPTIcon />,
      id: 'chatgpt',
      title: 'Open in ChatGPT',
    },
    {
      description: 'Ask Claude about this page',
      href: aiHref('https://claude.ai/new'),
      icon: <ClaudeIcon />,
      id: 'claude',
      title: 'Open in Claude',
    },
    {
      description: 'Ask Perplexity about this page',
      href: aiHref('https://www.perplexity.ai/search'),
      icon: <PerplexityIcon />,
      id: 'perplexity',
      title: 'Open in Perplexity',
    },
    {
      description: 'Ask Gemini about this page',
      href: aiHref('https://www.google.com/search', {udm: '50'}),
      icon: <GeminiIcon />,
      id: 'gemini',
      title: 'Open in Gemini',
    },
  ];

  return (
    <div className={styles.copyPage} ref={containerRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Copy this page as Markdown"
        onClick={() => setOpen(value => !value)}>
        <CopyIcon />
        <span className={styles.triggerLabel}>Copy page</span>
        <ChevronIcon open={open} />
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          {items.map(item => {
            const content = (
              <>
                <span className={styles.itemIcon}>{item.icon}</span>
                <span className={styles.itemText}>
                  <span className={styles.itemTitle}>{item.title}</span>
                  <span className={styles.itemDescription}>
                    {item.description}
                  </span>
                </span>
              </>
            );
            if (item.href) {
              return (
                <a
                  key={item.id}
                  className={styles.item}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  role="menuitem"
                  onClick={() => setOpen(false)}>
                  {content}
                </a>
              );
            }
            return (
              <button
                key={item.id}
                type="button"
                className={styles.item}
                role="menuitem"
                onClick={() => {
                  if (item.onSelect) {
                    item.onSelect();
                  }
                  if (item.id !== 'copy') {
                    setOpen(false);
                  }
                }}>
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
