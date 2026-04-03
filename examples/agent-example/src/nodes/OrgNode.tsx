/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {
  applyFormatFromStyle,
  applyFormatToDom,
  DecoratorTextExtension,
  DecoratorTextNode,
} from '@lexical/extension';
import {ReactExtension} from '@lexical/react/ReactExtension';
import {
  $create,
  $getState,
  $isTextNode,
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

import {EntityLink} from './EntityLink';

const TAG_TO_FORMAT = {b: 'bold', i: 'italic', u: 'underline'} as const;

function $convertOrgElement(domNode: HTMLElement): DOMConversionOutput | null {
  const orgName = domNode.getAttribute('data-lexical-org');
  if (!orgName) {
    return null;
  }
  const node = $createOrgNode(orgName);
  return {
    after: (children) => {
      const firstChild = children[0];
      if ($isTextNode(firstChild)) {
        node.setFormat(firstChild.getFormat());
      }
      return children;
    },
    node: applyFormatFromStyle(node, domNode.style),
  };
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
    element.appendChild(
      applyFormatToDom(
        this,
        document.createTextNode(this.getOrgName()),
        TAG_TO_FORMAT,
      ),
    );
    return {element};
  }

  getTextContent(): string {
    return this.getOrgName();
  }

  decorate(): JSX.Element {
    return (
      <EntityLink
        href={`https://www.google.com/search?q=${encodeURIComponent(this.getOrgName())}`}
        title={`Search for ${this.getOrgName()}`}
        className="bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-950 dark:text-violet-300 dark:hover:bg-violet-900"
        format={this.getFormat()}
        icon={
          <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            width="12"
            height="12"
            style={{flexShrink: 0, opacity: 0.7}}>
            <path d="M3 1a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v14H3V1zm2 2h2v2H5V3zm4 0h2v2H9V3zM5 7h2v2H5V7zm4 0h2v2H9V7zm-2 4h2v4H7v-4z" />
          </svg>
        }>
        {this.getOrgName()}
      </EntityLink>
    );
  }
}

export const OrgNodeExtension = defineExtension({
  dependencies: [DecoratorTextExtension, ReactExtension],
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
