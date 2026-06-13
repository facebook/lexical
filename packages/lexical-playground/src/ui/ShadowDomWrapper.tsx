/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './ShadowDomWrapper.css';

import {
  type JSX,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {createPortal} from 'react-dom';

function isStyleNode(node: Node): node is HTMLStyleElement | HTMLLinkElement {
  return (
    node instanceof HTMLStyleElement ||
    (node instanceof HTMLLinkElement && node.rel === 'stylesheet')
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
  for (const node of document.head.querySelectorAll(
    'style, link[rel="stylesheet"]',
  )) {
    shadowRoot.appendChild(node.cloneNode(true));
  }

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (isStyleNode(node)) {
          shadowRoot.appendChild(node.cloneNode(true));
        }
      }
    }
  });
  observer.observe(document.head, {childList: true});
  return () => observer.disconnect();
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
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (host === null) {
      return;
    }
    const root = host.shadowRoot ?? host.attachShadow({mode: 'open'});
    const disposeStyles = adoptDocumentStyles(root);
    setShadowRoot(root);
    return disposeStyles;
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
