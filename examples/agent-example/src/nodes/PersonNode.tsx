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

function $convertPersonElement(
  domNode: HTMLElement,
): DOMConversionOutput | null {
  const personName = domNode.getAttribute('data-lexical-person');
  if (!personName) {
    return null;
  }
  const node = $createPersonNode(personName);
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
    element.appendChild(
      applyFormatToDom(
        this,
        document.createTextNode(this.getPersonName()),
        TAG_TO_FORMAT,
      ),
    );
    return {element};
  }

  getTextContent(): string {
    return this.getPersonName();
  }

  decorate(): JSX.Element {
    return (
      <EntityLink
        href={`https://www.google.com/search?q=${encodeURIComponent(this.getPersonName())}`}
        title={`Search for ${this.getPersonName()}`}
        className="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
        format={this.getFormat()}
        icon={
          <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            width="12"
            height="12"
            style={{flexShrink: 0, opacity: 0.7}}>
            <path d="M8 0a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 8c-4 0-6 2-6 3.5V13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1.5C14 10 12 8 8 8z" />
          </svg>
        }>
        {this.getPersonName()}
      </EntityLink>
    );
  }
}

export const PersonNodeExtension = defineExtension({
  dependencies: [DecoratorTextExtension, ReactExtension],
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
