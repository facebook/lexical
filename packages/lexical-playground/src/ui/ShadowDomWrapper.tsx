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
  // Track original → clone so a removed light-DOM stylesheet also drops its
  // mirrored copy from the shadow root, instead of leaking under HMR churn.
  const clones = new Map<Node, Node>();
  for (const node of document.head.querySelectorAll(
    'style, link[rel="stylesheet"]',
  )) {
    const clone = node.cloneNode(true);
    clones.set(node, clone);
    shadowRoot.appendChild(clone);
  }

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') {
        // Vite HMR replaces the style's text content in place rather than
        // swapping in a new <style> node, so the childList branch below
        // never sees it. Walk up to the enclosing style/link and mirror
        // the new contents onto the clone so the shadow root stays in
        // sync.
        let node: Node | null = mutation.target;
        while (node !== null && !isStyleNode(node)) {
          node = node.parentNode;
        }
        if (node !== null) {
          const clone = clones.get(node);
          if (clone !== undefined) {
            clone.textContent = node.textContent;
          }
        }
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (isStyleNode(node)) {
          const clone = node.cloneNode(true);
          clones.set(node, clone);
          shadowRoot.appendChild(clone);
        }
      }
      for (const node of mutation.removedNodes) {
        const clone = clones.get(node);
        if (clone !== undefined) {
          // Use clone.remove() rather than shadowRoot.removeChild(clone)
          // so a clone that was already detached by an upstream HMR pass
          // is a no-op instead of throwing NotFoundError.
          (clone as ChildNode).remove();
          clones.delete(node);
        }
      }
    }
  });
  observer.observe(document.head, {
    characterData: true,
    childList: true,
    subtree: true,
  });

  // Vite HMR fallback: Chrome / Safari sometimes update CSS through
  // CSSOM (style.sheet.replaceSync / insertRule) rather than the DOM, so
  // the MutationObserver above never fires. The vite:afterUpdate event
  // does fire on every HMR pass, so reconcile clones against document.head
  // verbatim then. No-ops in production builds (import.meta.hot is
  // undefined).
  const resyncFromHead = (): void => {
    for (const [source, clone] of clones) {
      if (!document.head.contains(source)) {
        (clone as ChildNode).remove();
        clones.delete(source);
      } else if (clone.textContent !== source.textContent) {
        clone.textContent = source.textContent;
      }
    }
    for (const source of document.head.querySelectorAll(
      'style, link[rel="stylesheet"]',
    )) {
      if (!clones.has(source)) {
        const clone = source.cloneNode(true);
        clones.set(source, clone);
        shadowRoot.appendChild(clone);
      }
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
    // Drop the mirrored stylesheets too: React 18 StrictMode runs the mount
    // effect twice, and a browser-attached shadow root can't be detached, so
    // the second mount would re-scan document.head on top of the first batch
    // and leak duplicate <style>/<link> clones (also during Vite HMR).
    for (const clone of clones.values()) {
      (clone as ChildNode).remove();
    }
    clones.clear();
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
