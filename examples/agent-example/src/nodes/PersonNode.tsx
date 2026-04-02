/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {DecoratorTextNode} from '@lexical/extension';
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

function $convertPersonElement(
  domNode: HTMLElement,
): DOMConversionOutput | null {
  const personName = domNode.getAttribute('data-lexical-person');
  if (personName) {
    return {node: $createPersonNode(personName)};
  }
  return null;
}

const personNameState = createState('personName', {
  parse: (v) => (typeof v === 'string' ? v : ''),
});

export class PersonNode extends DecoratorTextNode {
  $config() {
    return this.config('person', {
      extends: DecoratorTextNode,
      importDOM: buildImportMap({
        span: (domNode) =>
          domNode.hasAttribute('data-lexical-person')
            ? {conversion: $convertPersonElement, priority: 1}
            : null,
      }),
      stateConfigs: [{flat: true, stateConfig: personNameState}],
    });
  }

  getPersonName(): StateConfigValue<typeof personNameState> {
    return $getState(this, personNameState);
  }

  setPersonName(
    valueOrUpdater: StateValueOrUpdater<typeof personNameState>,
  ): this {
    return $setState(this, personNameState, valueOrUpdater);
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('span');
    element.setAttribute('data-lexical-person', this.getPersonName());
    element.textContent = this.getPersonName();
    return {element};
  }

  getTextContent(): string {
    return this.getPersonName();
  }

  decorate(): JSX.Element {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(this.getPersonName())}`;
    return (
      <a
        href={searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={`Search for ${this.getPersonName()}`}
        className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1 py-0.5 text-blue-700 no-underline transition-colors hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
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
          <path d="M8 0a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 8c-4 0-6 2-6 3.5V13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1.5C14 10 12 8 8 8z" />
        </svg>
        {this.getPersonName()}
      </a>
    );
  }
}

export const PersonNodeExtension = defineExtension({
  name: '@lexical/agent-example/person-node',
  nodes: () => [PersonNode],
});

export function $createPersonNode(personName: string): PersonNode {
  return $create(PersonNode).setPersonName(personName);
}

export function $isPersonNode(
  node: LexicalNode | null | undefined,
): node is PersonNode {
  return node instanceof PersonNode;
}
