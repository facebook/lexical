/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  DOMConversionMap,
  DOMConversionOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';
import type {JSX} from 'react';

import {
  $applyNodeReplacement,
  DecoratorNode,
  defineExtension,
  DOMExportOutput,
} from 'lexical';

export type SerializedOrgNode = Spread<
  {
    orgName: string;
  },
  SerializedLexicalNode
>;

function $convertOrgElement(domNode: HTMLElement): DOMConversionOutput | null {
  const orgName = domNode.getAttribute('data-lexical-org');
  if (orgName) {
    return {node: $createOrgNode(orgName)};
  }
  return null;
}

export class OrgNode extends DecoratorNode<JSX.Element> {
  __orgName: string;

  static getType(): string {
    return 'org';
  }

  static clone(node: OrgNode): OrgNode {
    return new OrgNode(node.__orgName, node.__key);
  }

  constructor(orgName: string, key?: NodeKey) {
    super(key);
    this.__orgName = orgName;
  }

  afterCloneFrom(prevNode: this): void {
    super.afterCloneFrom(prevNode);
    this.__orgName = prevNode.__orgName;
  }

  static importJSON(serializedNode: SerializedOrgNode): OrgNode {
    return $createOrgNode(serializedNode.orgName).updateFromJSON(
      serializedNode,
    );
  }

  exportJSON(): SerializedOrgNode {
    return {
      ...super.exportJSON(),
      orgName: this.__orgName,
    };
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    span.style.display = 'inline';
    return span;
  }

  updateDOM(): boolean {
    return false;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('span');
    element.setAttribute('data-lexical-org', this.__orgName);
    element.textContent = this.__orgName;
    return {element};
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute('data-lexical-org')) {
          return null;
        }
        return {
          conversion: $convertOrgElement,
          priority: 1,
        };
      },
    };
  }

  isInline(): boolean {
    return true;
  }

  getTextContent(): string {
    return this.__orgName;
  }

  decorate(): JSX.Element {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(this.__orgName)}`;
    return (
      <a
        href={searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={`Search for ${this.__orgName}`}
        className="inline-flex items-center gap-0.5 rounded bg-violet-50 px-1 py-0.5 text-violet-700 no-underline transition-colors hover:bg-violet-100 dark:bg-violet-950 dark:text-violet-300 dark:hover:bg-violet-900"
        style={{
          borderBottom: '1px dashed currentColor',
          cursor: 'pointer',
          fontSize: 'inherit',
          lineHeight: 'inherit',
        }}>
        <svg
          viewBox="0 0 16 16"
          fill="currentColor"
          width="12"
          height="12"
          style={{flexShrink: 0, opacity: 0.7}}>
          <path d="M3 1a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v14H3V1zm2 2h2v2H5V3zm4 0h2v2H9V3zM5 7h2v2H5V7zm4 0h2v2H9V7zm-2 4h2v4H7v-4z" />
        </svg>
        {this.__orgName}
      </a>
    );
  }
}

export const OrgNodeExtension = defineExtension({
  name: '@lexical/agent-example/org-node',
  nodes: () => [OrgNode],
});

export function $createOrgNode(orgName: string): OrgNode {
  return $applyNodeReplacement(new OrgNode(orgName));
}

export function $isOrgNode(
  node: LexicalNode | null | undefined,
): node is OrgNode {
  return node instanceof OrgNode;
}
