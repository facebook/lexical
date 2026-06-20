/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './ShadowDomWrapper.css';

import {objectKlassEquals} from '@lexical/utils';
import {
  type JSX,
  type ReactNode,
  type RefCallback,
  useCallback,
  useState,
} from 'react';
import {createPortal} from 'react-dom';

function isStyleNode(node: Node): node is HTMLStyleElement | HTMLLinkElement {
  return (
    objectKlassEquals(node, HTMLStyleElement) ||
    (objectKlassEquals(node, HTMLLinkElement) && node.rel === 'stylesheet')
  );
}

/**
 * Mirror the document's stylesheets into the shadow root. Shadow DOM
 * encapsulates styles, so the playground/theme CSS injected into the light DOM
 * (including Vite's dev `<style>` tags) does not reach the editor once it is
 * inside a shadow tree. We clone the existing `<style>`/`<link>` nodes and keep
 * the shadow root in sync with any that are injected later (e.g. HMR).
 *
 * We scope both the initial scan and the MutationObserver to `document.head`,
 * which is where Vite and the playground inject stylesheets. Keeping both
 * stages aligned avoids cloning body-injected styles on mount only to miss
 * any added later.
 */
function adoptDocumentStyles(shadowRoot: ShadowRoot): () => void {
  const adopted = new Map<HTMLStyleElement | HTMLLinkElement, CSSStyleSheet>();

  const syncAdoptedList = (): void => {
    shadowRoot.adoptedStyleSheets = Array.from(adopted.values());
  };

  const readSheetText = (
    source: HTMLStyleElement | HTMLLinkElement,
  ): string | null => {
    const sheet = source.sheet;
    if (sheet === null) {
      return null;
    }
    try {
      // CSSStyleSheet.replaceSync drops @import rules with a console warning
      // in Chrome. The host document already resolves them (the shadow tree
      // inherits the result through cascade for properties like font-family),
      // so strip them up front to keep the migration silent.
      return Array.from(sheet.cssRules)
        .map(rule => rule.cssText)
        .filter(text => !text.startsWith('@import'))
        .join('\n');
    } catch {
      // SecurityError on cross-origin <link rel="stylesheet">. The shadow
      // tree skips it: playground has no cross-origin sheets today, and a
      // future addition surfaces via the dev warning below.
      if (import.meta.env?.DEV) {
        console.warn(
          '[ShadowDomWrapper] skipping unreadable stylesheet (likely cross-origin):',
          source,
        );
      }
      return null;
    }
  };

  const addSource = (source: HTMLStyleElement | HTMLLinkElement): void => {
    if (adopted.has(source)) {
      return;
    }
    const text = readSheetText(source);
    if (text === null) {
      return;
    }
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(text);
    adopted.set(source, sheet);
    syncAdoptedList();
  };

  const removeSource = (source: Node): void => {
    if (adopted.delete(source as HTMLStyleElement)) {
      syncAdoptedList();
    }
  };

  const refreshSource = (source: Node): void => {
    if (!isStyleNode(source)) {
      return;
    }
    const sheet = adopted.get(source);
    if (sheet === undefined) {
      // Source wasn't adopted (unreadable at mount); retry now in case the
      // sheet finished loading.
      addSource(source);
      return;
    }
    const text = readSheetText(source);
    if (text !== null) {
      sheet.replaceSync(text);
    }
  };

  for (const node of document.head.querySelectorAll<
    HTMLStyleElement | HTMLLinkElement
  >('style, link[rel="stylesheet"]')) {
    addSource(node);
  }

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') {
        let node: Node | null = mutation.target;
        while (node !== null && !isStyleNode(node)) {
          node = node.parentNode;
        }
        if (node !== null) {
          refreshSource(node);
        }
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (isStyleNode(node)) {
          addSource(node);
        }
      }
      for (const node of mutation.removedNodes) {
        if (isStyleNode(node)) {
          removeSource(node);
        }
      }
    }
  });
  observer.observe(document.head, {
    characterData: true,
    childList: true,
    subtree: true,
  });

  const resyncFromHead = (): void => {
    for (const source of Array.from(adopted.keys())) {
      if (!document.head.contains(source)) {
        removeSource(source);
      } else {
        refreshSource(source);
      }
    }
    for (const source of document.head.querySelectorAll<
      HTMLStyleElement | HTMLLinkElement
    >('style, link[rel="stylesheet"]')) {
      addSource(source);
    }
  };
  const hot = import.meta.hot;
  if (hot) {
    hot.on('vite:afterUpdate', resyncFromHead);
  }

  return () => {
    observer.disconnect();
    if (hot) {
      hot.off('vite:afterUpdate', resyncFromHead);
    }
    shadowRoot.adoptedStyleSheets = [];
    adopted.clear();
  };
}

/**
 * Renders its children inside an open DOM ShadowRoot via a React portal. React
 * context still flows across the portal, so the Lexical editor tree is built
 * normally — only its DOM lives inside the shadow tree. This exercises
 * Lexical's DOM shadow root support (selection resolved with
 * Selection.getComposedRanges, focus resolved with ShadowRoot.activeElement).
 */
export default function ShadowDomWrapper({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);
  const hostRef = useCallback<RefCallback<HTMLElement>>(host => {
    if (host) {
      const root = host.shadowRoot ?? host.attachShadow({mode: 'open'});
      const disposeStyles = adoptDocumentStyles(root);
      setShadowRoot(root);
      return disposeStyles;
    }
  }, []);

  return (
    <div
      ref={hostRef}
      className="shadow-dom-host"
      data-test-id="shadow-dom-host">
      {shadowRoot !== null ? createPortal(children, shadowRoot) : null}
    </div>
  );
}
