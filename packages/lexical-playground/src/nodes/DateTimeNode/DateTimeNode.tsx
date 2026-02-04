/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {
  DecoratorTextNode,
  SerializedDecoratorTextNode,
} from '@lexical/react/LexicalDecoratorTextNode';
import {
  $getState,
  $setState,
  buildImportMap,
  createState,
  DOMConversionOutput,
  DOMExportOutput,
  LexicalNode,
  Spread,
  StateConfigValue,
  StateValueOrUpdater,
  TextFormatType,
} from 'lexical';
import * as React from 'react';

const DateTimeComponent = React.lazy(() => import('./DateTimeComponent'));

const getDateTimeText = (dateTime: Date) => {
  if (dateTime === undefined) {
    return '';
  }
  const hours = dateTime?.getHours();
  const minutes = dateTime?.getMinutes();
  return (
    dateTime.toDateString() +
    (hours === 0 && minutes === 0
      ? ''
      : ` ${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}`)
  );
};

export type SerializedDateTimeNode = Spread<
  {
    dateTime?: string;
  },
  SerializedDecoratorTextNode
>;

function wrapElementWith(
  element: HTMLElement | Text,
  tag: string,
): HTMLElement {
  const el = document.createElement(tag);
  el.appendChild(element);
  return el;
}

const nodeNameToTextFormat: Record<string, TextFormatType> = {
  code: 'code',
  em: 'italic',
  i: 'italic',
  mark: 'highlight',
  s: 'strikethrough',
  strong: 'bold',
  sub: 'subscript',
  sup: 'superscript',
  u: 'underline',
};

function convertBringAttentionToElement(
  domNode: HTMLElement,
): DOMConversionOutput {
  // domNode is a <b> since we matched it by nodeName
  const b = domNode;
  // Google Docs wraps all copied HTML in a <b> with font-weight normal
  const hasNormalFontWeight = b.style.fontWeight === 'normal';

  return {
    forChild: applyTextFormatFromStyle(
      b.style,
      hasNormalFontWeight ? undefined : 'bold',
    ),
    node: null,
  };
}
function convertFormatElement(domNode: HTMLElement): DOMConversionOutput {
  const format = nodeNameToTextFormat[domNode.nodeName.toLowerCase()];
  if (format === undefined) {
    return {node: null};
  }
  return {
    forChild: applyTextFormatFromStyle(domNode.style, format),
    node: null,
  };
}

function applyTextFormatFromStyle(
  style: CSSStyleDeclaration,
  shouldApply?: TextFormatType,
) {
  const fontWeight = style.fontWeight;
  const textDecoration = style.textDecoration.split(' ');
  // Google Docs uses span tags + font-weight for bold text
  const hasBoldFontWeight = fontWeight === '700' || fontWeight === 'bold';
  // Google Docs uses span tags + text-decoration: line-through for strikethrough text
  const hasLinethroughTextDecoration = textDecoration.includes('line-through');
  // Google Docs uses span tags + font-style for italic text
  const hasItalicFontStyle = style.fontStyle === 'italic';
  // Google Docs uses span tags + text-decoration: underline for underline text
  const hasUnderlineTextDecoration = textDecoration.includes('underline');
  // Google Docs uses span tags + vertical-align to specify subscript and superscript
  const verticalAlign = style.verticalAlign;

  return (lexicalNode: LexicalNode) => {
    if (!$isDateTimeNode(lexicalNode)) {
      return lexicalNode;
    }
    if (hasBoldFontWeight && !lexicalNode.hasFormat('bold')) {
      lexicalNode.toggleFormat('bold');
    }
    if (
      hasLinethroughTextDecoration &&
      !lexicalNode.hasFormat('strikethrough')
    ) {
      lexicalNode.toggleFormat('strikethrough');
    }
    if (hasItalicFontStyle && !lexicalNode.hasFormat('italic')) {
      lexicalNode.toggleFormat('italic');
    }
    if (hasUnderlineTextDecoration && !lexicalNode.hasFormat('underline')) {
      lexicalNode.toggleFormat('underline');
    }
    if (verticalAlign === 'sub' && !lexicalNode.hasFormat('subscript')) {
      lexicalNode.toggleFormat('subscript');
    }
    if (verticalAlign === 'super' && !lexicalNode.hasFormat('superscript')) {
      lexicalNode.toggleFormat('superscript');
    }

    if (shouldApply && !lexicalNode.hasFormat(shouldApply)) {
      lexicalNode.toggleFormat(shouldApply);
    }

    return lexicalNode;
  };
}

function $convertDateTimeElement(
  domNode: HTMLElement,
): DOMConversionOutput | null {
  const dateTimeValue = domNode.getAttribute('data-lexical-datetime');
  if (dateTimeValue) {
    const node = $createDateTimeNode(new Date(Date.parse(dateTimeValue)));
    return {node};
  }
  const gDocsDateTimePayload = domNode.getAttribute('data-rich-links');
  if (!gDocsDateTimePayload) {
    return null;
  }
  const parsed = JSON.parse(gDocsDateTimePayload);
  const parsedDate =
    parsed?.dat_df?.dfie_ts.tv.tv_s * 1000 ||
    Date.parse(parsed?.dat_df?.dfie_dt || '');
  if (isNaN(parsedDate)) {
    return null;
  }
  const dateTimeNode = $createDateTimeNode(new Date(parsedDate));
  // The format is applied directly to DateTimeNode cause it is a terminal node and cannot contain children
  const formattedNode = applyTextFormatFromStyle(domNode.style)(dateTimeNode);
  return {forChild: () => null, node: formattedNode};
}

const dateTimeState = createState('dateTime', {
  parse: (v) => new Date(v as string),
  unparse: (v) => v.toISOString(),
});

export class DateTimeNode extends DecoratorTextNode {
  $config() {
    return this.config('datetime', {
      extends: DecoratorTextNode,
      importDOM: buildImportMap({
        b: () => ({
          conversion: convertBringAttentionToElement,
          priority: 2,
        }),
        em: () => ({
          conversion: convertFormatElement,
          priority: 2,
        }),
        i: () => ({
          conversion: convertFormatElement,
          priority: 2,
        }),
        mark: () => ({
          conversion: convertFormatElement,
          priority: 2,
        }),
        s: () => ({
          conversion: convertFormatElement,
          priority: 2,
        }),
        span: (domNode) =>
          domNode.getAttribute('data-lexical-datetime') !== null ||
          // GDocs Support
          (domNode.getAttribute('data-rich-links') !== null &&
            JSON.parse(domNode.getAttribute('data-rich-links') || '{}').type ===
              'date')
            ? {
                conversion: $convertDateTimeElement,
                priority: 2,
              }
            : null,
        strong: () => ({
          conversion: convertFormatElement,
          priority: 2,
        }),
        u: () => ({
          conversion: convertFormatElement,
          priority: 2,
        }),
      }),
      stateConfigs: [{flat: true, stateConfig: dateTimeState}],
    });
  }

  getDateTime(): StateConfigValue<typeof dateTimeState> {
    return $getState(this, dateTimeState);
  }

  setDateTime(valueOrUpdater: StateValueOrUpdater<typeof dateTimeState>): this {
    return $setState(this, dateTimeState, valueOrUpdater);
  }

  getTextContent(): string {
    const dateTime = this.getDateTime();
    return getDateTimeText(dateTime);
  }

  exportDOM(): DOMExportOutput {
    let element = document.createElement('span');
    element.textContent = getDateTimeText(this.getDateTime());
    element.setAttribute(
      'data-lexical-datetime',
      this.getDateTime()?.toString() || '',
    );

    if (this.hasFormat('highlight')) {
      element = wrapElementWith(element, 'mark');
    }
    if (this.hasFormat('bold')) {
      element = wrapElementWith(element, 'b');
    }
    if (this.hasFormat('italic')) {
      element = wrapElementWith(element, 'i');
    }
    if (this.hasFormat('strikethrough')) {
      element = wrapElementWith(element, 's');
    }
    if (this.hasFormat('underline')) {
      element = wrapElementWith(element, 'u');
    }

    return {element};
  }

  createDOM(): HTMLElement {
    const element = document.createElement('span');
    element.setAttribute(
      'data-lexical-datetime',
      this.getDateTime()?.toString() || '',
    );
    element.style.display = 'inline-block';
    return element;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): JSX.Element {
    return (
      <DateTimeComponent
        dateTime={this.getDateTime()}
        format={this.__format}
        nodeKey={this.__key}
      />
    );
  }
}

export function $createDateTimeNode(dateTime: Date): DateTimeNode {
  return new DateTimeNode().setDateTime(dateTime);
}

export function $isDateTimeNode(
  node: LexicalNode | null | undefined,
): node is DateTimeNode {
  return node instanceof DateTimeNode;
}
