/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {DecoratorTextNode} from '@lexical/extension';
import {ReactExtension} from '@lexical/react/ReactExtension';
import {
  $create,
  $getState,
  $setState,
  buildImportMap,
  createState,
  defineExtension,
  DOMConversionOutput,
  DOMExportOutput,
  LexicalNode,
  StateConfigValue,
  StateValueOrUpdater,
} from 'lexical';

function $convertOrgElement(domNode: HTMLElement): DOMConversionOutput | null {
  const orgName = domNode.getAttribute('data-lexical-org');
  if (orgName) {
    return {node: $createOrgNode(orgName)};
  }
  return null;
}

const orgNameState = createState('orgName', {
  parse: (v) => (typeof v === 'string' ? v : ''),
});

export class OrgNode extends DecoratorTextNode {
  $config() {
    return this.config('org', {
      extends: DecoratorTextNode,
      importDOM: buildImportMap({
        span: (domNode) =>
          domNode.hasAttribute('data-lexical-org')
            ? {conversion: $convertOrgElement, priority: 1}
            : null,
      }),
      stateConfigs: [{flat: true, stateConfig: orgNameState}],
    });
  }

  getOrgName(): StateConfigValue<typeof orgNameState> {
    return $getState(this, orgNameState);
  }

  setOrgName(valueOrUpdater: StateValueOrUpdater<typeof orgNameState>): this {
    return $setState(this, orgNameState, valueOrUpdater);
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('span');
    element.setAttribute('data-lexical-org', this.getOrgName());
    element.textContent = this.getOrgName();
    return {element};
  }

  getTextContent(): string {
    return this.getOrgName();
  }

  decorate(): JSX.Element {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(this.getOrgName())}`;
    return (
      <a
        href={searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={`Search for ${this.getOrgName()}`}
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
        {this.getOrgName()}
      </a>
    );
  }
}

export const OrgNodeExtension = defineExtension({
  dependencies: [ReactExtension],
  name: '@lexical/agent-example/org-node',
  nodes: () => [OrgNode],
});

export function $createOrgNode(orgName: string): OrgNode {
  return $create(OrgNode).setOrgName(orgName);
}

export function $isOrgNode(
  node: LexicalNode | null | undefined,
): node is OrgNode {
  return node instanceof OrgNode;
}
