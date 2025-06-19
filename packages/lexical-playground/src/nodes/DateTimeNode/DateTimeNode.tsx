/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {
  DecoratorNode,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  ElementNode,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

const DateTimeComponent = React.lazy(() => import('./DateTimeComponent'));

export type SerializedDateTimeNode = Spread<
  {
    dateTime: Date;
  },
  SerializedLexicalNode
>;

function $convertDateTimeElement(domNode: HTMLElement): DOMConversionOutput | null {
  const dateTimeValue = domNode.getAttribute('data-lexical-date-time');
  if (dateTimeValue) {
    const node = $createDateTimeNode(new Date(Date.parse(dateTimeValue)));
    return {node};
  }
  return null;
}

export class DateTimeNode extends DecoratorNode<JSX.Element> {
  __dateTime: Date | undefined;

  static getType(): string {
    return 'date-time';
  }

  static clone(node: DateTimeNode): DateTimeNode {
    return new DateTimeNode(node.__dateTime, node.__key);
  }

  constructor(dateTime: Date | undefined, key?: NodeKey) {
    super(key);
    this.__dateTime = dateTime;
  }

  static importJSON(serializedNode: SerializedDateTimeNode): DateTimeNode {
    return $createDateTimeNode(
      serializedNode.dateTime
    ).updateFromJSON(serializedNode);
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute('data-lexical-date-time')) {
          return null;
        }
        return {
          conversion: $convertDateTimeElement,
          priority: 2,
        };
      },
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('span');
    element.setAttribute('data-lexical-date-time', this.getDateTime()?.toDateString() || '');
    return {element};
  }

  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement {
    const elem = document.createElement('span');
    elem.style.display = 'inline-block';
    elem.textContent = 'this is date';
    return elem;
  }

  updateDOM(): false {
    return false;
  }

  getDateTime(): Date | undefined {
    return this.getLatest().__dateTime;
  }
  
  setDateTime(dateTime: Date | undefined): void {
    this.getWritable().__dateTime = dateTime;
  }

  isInline(): boolean {
    return true;
  }

  decorate(): JSX.Element {
    return (
      <p>{"aaa"}</p>
      // <DateTimeComponent
      //   dateTime={this.getDateTime()}
      //   nodeKey={this.__key}
      // />
    );
  }
}

export function $createDateTimeNode(dateTime: Date | undefined): DateTimeNode {
  return new DateTimeNode(dateTime);
}

export function $isDateTimeNode(
  node: LexicalNode | null | undefined,
): node is DateTimeNode {
  return node instanceof DateTimeNode;
}
