/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX, ReactNode} from 'react';

import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

type ShadowDOMWrapperProps = {
  children: ReactNode;
  enabled: boolean;
  className?: string;
};

export default function ShadowDOMWrapper({
  children,
  enabled,
  className,
}: ShadowDOMWrapperProps): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);
  const [stylesAdded, setStylesAdded] = useState(false);

  useEffect(() => {
    if (!enabled || !hostRef.current) {
      setShadowRoot(null);
      setStylesAdded(false);
      return;
    }

    const host = hostRef.current;

    // Create shadow DOM (should be safe with fresh element due to key prop)
    try {
      const shadow = host.attachShadow({mode: 'open'});
      setShadowRoot(shadow);
    } catch (error) {
      // If shadow already exists, use existing one
      if (error instanceof DOMException && error.name === 'NotSupportedError') {
        const existingShadow = host.shadowRoot;
        if (existingShadow) {
          setShadowRoot(existingShadow);
          // Clear existing content
          existingShadow.innerHTML = '';
        }
      } else {
        console.error('Error creating shadow DOM:', error);
        return;
      }
    }

    const shadow = host.shadowRoot;
    if (!shadow) {
      return;
    }

    // Copy all document styles to shadow DOM
    const documentStyles = Array.from(
      document.head.querySelectorAll('style, link[rel="stylesheet"]'),
    );

    documentStyles.forEach((styleElement) => {
      const clonedStyle = styleElement.cloneNode(true) as HTMLElement;
      shadow.appendChild(clonedStyle);
    });

    setStylesAdded(true);

    return () => {
      // Cleanup is automatic when host element is removed
    };
  }, [enabled]);

  // If shadow DOM is not enabled, render children normally
  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  // Return the host element and portal to shadow DOM
  return (
    <div style={{position: 'relative'}}>
      <div
        ref={hostRef}
        className={className}
        style={{
          position: 'relative',
        }}
      />
      {shadowRoot &&
        stylesAdded &&
        createPortal(
          <div
            style={{
              display: 'contents', // This ensures the children render properly
            }}>
            {children}
          </div>,
          shadowRoot,
        )}
    </div>
  );
}
