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
  DecoratorTextNode,
  SerializedDecoratorTextNode,
} from '@lexical/extension';
import {defineImportRule, sel} from '@lexical/html';
import {
  $getState,
  $isTextNode,
  $setState,
  createState,
  DOMExportOutput,
  LexicalNode,
  Spread,
  StateConfigValue,
  StateValueOrUpdater,
} from 'lexical';
import * as React from 'react';

const DateTimeComponent = React.lazy(() => import('./DateTimeComponent'));

const tagToFormat = {
  b: 'bold',
  i: 'italic',
  mark: 'highlight',
  s: 'strikethrough',
  u: 'underline',
} as const;

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

function isGoogleDocsDateRichLinks(value: string | null): boolean {
  if (!value) {
    return false;
  }
  try {
    return JSON.parse(value).type === 'date';
  } catch {
    return false;
  }
}

const dateTimeState = createState('dateTime', {
  parse: v => new Date(v as string),
  unparse: v => v.toISOString(),
});

export class DateTimeNode extends DecoratorTextNode {
  $config() {
    return this.config('datetime', {
      extends: DecoratorTextNode,
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
    const element = document.createElement('span');
    const textDom: HTMLElement | Text = document.createTextNode(
      getDateTimeText(this.getDateTime()),
    );
    element.setAttribute(
      'data-lexical-datetime',
      this.getDateTime()?.toString() || '',
    );
    element.appendChild(applyFormatToDom(this, textDom, tagToFormat));

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
        format={this.getFormat()}
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

const DateTimeRule = defineImportRule({
  $import: (ctx, el, $next) => {
    const dateTimeValue = el.getAttribute('data-lexical-datetime');
    if (dateTimeValue) {
      const node = $createDateTimeNode(new Date(Date.parse(dateTimeValue)));
      const imported = ctx.$importChildren(el);
      const firstChild = imported[0];
      if ($isTextNode(firstChild)) {
        node.setFormat(firstChild.getFormat());
      }
      return [node];
    }
    return $next();
  },
  match: sel.tag('span').attr('data-lexical-datetime', true),
  name: '@lexical/playground/datetime',
});

const GoogleDocsDateRule = defineImportRule({
  $import: (_ctx, el, $next) => {
    const payload = el.getAttribute('data-rich-links');
    if (!isGoogleDocsDateRichLinks(payload)) {
      return $next();
    }
    const parsed = JSON.parse(payload!);
    const parsedDate =
      parsed?.dat_df?.dfie_ts?.tv?.tv_s * 1000 ||
      Date.parse(parsed?.dat_df?.dfie_dt || '');
    if (isNaN(parsedDate)) {
      return $next();
    }
    return [
      applyFormatFromStyle($createDateTimeNode(new Date(parsedDate)), el.style),
    ];
  },
  match: sel.tag('span').attr('data-rich-links', true),
  name: '@lexical/playground/datetime-google-docs',
});

export const DateTimeImportRules = [DateTimeRule, GoogleDocsDateRule];
