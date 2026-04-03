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
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ReactExtension} from '@lexical/react/ReactExtension';
import {
  $create,
  $getState,
  $isTextNode,
  $setState,
  buildImportMap,
  createState,
  defineExtension,
  type DOMConversionOutput,
  type DOMExportOutput,
  IS_BOLD,
  IS_ITALIC,
  IS_UNDERLINE,
  type LexicalNode,
  type StateConfigValue,
  type StateValueOrUpdater,
} from 'lexical';

const TAG_TO_FORMAT = {b: 'bold', i: 'italic', u: 'underline'} as const;

interface EntityStyle {
  readonly className: string;
  readonly getHref: (text: string) => string;
  readonly getTitle: (text: string) => string;
  readonly iconPath: string;
}

const ENTITY_STYLES = {
  LOC: {
    className:
      'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900',
    getHref: (text) =>
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`,
    getTitle: (text) => `View ${text} on Google Maps`,
    iconPath:
      'M8 0C5.2 0 3 2.3 3 5.2 3 9.1 8 16 8 16s5-6.9 5-10.8C13 2.3 10.8 0 8 0zm0 7.5a2.2 2.2 0 110-4.4 2.2 2.2 0 010 4.4z',
  },
  ORG: {
    className:
      'bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-950 dark:text-violet-300 dark:hover:bg-violet-900',
    getHref: (text) =>
      `https://www.google.com/search?q=${encodeURIComponent(text)}`,
    getTitle: (text) => `Search for ${text}`,
    iconPath:
      'M3 1a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v14H3V1zm2 2h2v2H5V3zm4 0h2v2H9V3zM5 7h2v2H5V7zm4 0h2v2H9V7zm-2 4h2v4H7v-4z',
  },
  PER: {
    className:
      'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900',
    getHref: (text) =>
      `https://www.google.com/search?q=${encodeURIComponent(text)}`,
    getTitle: (text) => `Search for ${text}`,
    iconPath:
      'M8 0a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 8c-4 0-6 2-6 3.5V13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1.5C14 10 12 8 8 8z',
  },
} as const satisfies Record<string, EntityStyle>;

export type EntityType = keyof typeof ENTITY_STYLES;

export function isEntityType(v: unknown): v is EntityType {
  return typeof v === 'string' && v in ENTITY_STYLES;
}

const entityTextState = createState('entityText', {
  parse: (v) => (typeof v === 'string' ? v : ''),
});

const entityTypeState = createState('entityType', {
  parse: (v): EntityType => (isEntityType(v) ? v : 'PER'),
});

const DATA_ATTRIBUTE = 'data-entity-type';

function $convertEntityElement(
  domNode: HTMLElement,
): DOMConversionOutput | null {
  const entityType = domNode.getAttribute(DATA_ATTRIBUTE);
  if (!isEntityType(entityType)) {
    return null;
  }
  const text = domNode.textContent || '';
  const node = $createEntityNode(entityType, text);
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

export class EntityNode extends DecoratorTextNode {
  $config() {
    return this.config('entity', {
      extends: DecoratorTextNode,
      importDOM: buildImportMap({
        span: (domNode) =>
          domNode.hasAttribute(DATA_ATTRIBUTE)
            ? {conversion: $convertEntityElement, priority: 1}
            : null,
      }),
      stateConfigs: [
        {flat: true, stateConfig: entityTextState},
        {flat: true, stateConfig: entityTypeState},
      ],
    });
  }

  getTextContent(): StateConfigValue<typeof entityTextState> {
    return $getState(this, entityTextState);
  }

  setTextContent(
    valueOrUpdater: StateValueOrUpdater<typeof entityTextState>,
  ): this {
    return $setState(this, entityTextState, valueOrUpdater);
  }

  getEntityType(): StateConfigValue<typeof entityTypeState> {
    return $getState(this, entityTypeState);
  }

  setEntityType(
    valueOrUpdater: StateValueOrUpdater<typeof entityTypeState>,
  ): this {
    return $setState(this, entityTypeState, valueOrUpdater);
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('span');
    element.setAttribute(DATA_ATTRIBUTE, this.getEntityType());
    element.appendChild(
      applyFormatToDom(
        this,
        document.createTextNode(this.getTextContent()),
        TAG_TO_FORMAT,
      ),
    );
    return {element};
  }

  decorate(): JSX.Element {
    return (
      <EntityDecorator
        text={this.getTextContent()}
        entityType={this.getEntityType()}
        format={this.getFormat()}
      />
    );
  }
}

export const EntityNodeExtension = defineExtension({
  dependencies: [DecoratorTextExtension, ReactExtension],
  name: '@lexical/agent-example/entity-node',
  nodes: () => [EntityNode],
});

export function $createEntityNode(
  entityType: EntityType,
  text: string,
): EntityNode {
  return $create(EntityNode).setEntityType(entityType).setTextContent(text);
}

export function $isEntityNode(
  node: LexicalNode | null | undefined,
): node is EntityNode {
  return node instanceof EntityNode;
}

const FORMAT_FLAGS = [
  [IS_BOLD, 'bold'],
  [IS_ITALIC, 'italic'],
  [IS_UNDERLINE, 'underline'],
] as const;

function EntityDecorator({
  entityType,
  format,
  text,
}: {
  entityType: EntityType;
  format: number;
  text: string;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const style = ENTITY_STYLES[entityType];
  const textTheme = editor._config.theme.text;
  const formatClasses =
    textTheme && format !== 0
      ? FORMAT_FLAGS.filter(([flag]) => (format & flag) !== 0)
          .map(([, key]) => textTheme[key])
          .filter(Boolean)
          .join(' ')
      : '';

  return (
    <a
      href={style.getHref(text)}
      target="_blank"
      rel="noopener noreferrer"
      title={style.getTitle(text)}
      className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 no-underline transition-colors ${style.className} ${formatClasses}`}
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
        <path d={style.iconPath} />
      </svg>
      {text}
    </a>
  );
}
