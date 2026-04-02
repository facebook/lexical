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

function $convertPlaceElement(
  domNode: HTMLElement,
): DOMConversionOutput | null {
  const placeName = domNode.getAttribute('data-lexical-place');
  if (placeName) {
    return {node: $createPlaceNode(placeName)};
  }
  return null;
}

const placeNameState = createState('placeName', {
  parse: (v) => (typeof v === 'string' ? v : ''),
});

export class PlaceNode extends DecoratorTextNode {
  $config() {
    return this.config('place', {
      extends: DecoratorTextNode,
      importDOM: buildImportMap({
        span: (domNode) =>
          domNode.hasAttribute('data-lexical-place')
            ? {conversion: $convertPlaceElement, priority: 1}
            : null,
      }),
      stateConfigs: [{flat: true, stateConfig: placeNameState}],
    });
  }

  getPlaceName(): StateConfigValue<typeof placeNameState> {
    return $getState(this, placeNameState);
  }

  setPlaceName(
    valueOrUpdater: StateValueOrUpdater<typeof placeNameState>,
  ): this {
    return $setState(this, placeNameState, valueOrUpdater);
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('span');
    element.setAttribute('data-lexical-place', this.getPlaceName());
    element.textContent = this.getPlaceName();
    return {element};
  }

  getTextContent(): string {
    return this.getPlaceName();
  }

  decorate(): JSX.Element {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(this.getPlaceName())}`;
    return (
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={`View ${this.getPlaceName()} on Google Maps`}
        className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1 py-0.5 text-emerald-700 no-underline transition-colors hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
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
          <path d="M8 0C5.2 0 3 2.3 3 5.2 3 9.1 8 16 8 16s5-6.9 5-10.8C13 2.3 10.8 0 8 0zm0 7.5a2.2 2.2 0 110-4.4 2.2 2.2 0 010 4.4z" />
        </svg>
        {this.getPlaceName()}
      </a>
    );
  }
}

export const PlaceNodeExtension = defineExtension({
  dependencies: [ReactExtension],
  name: '@lexical/agent-example/place-node',
  nodes: () => [PlaceNode],
});

export function $createPlaceNode(placeName: string): PlaceNode {
  return $create(PlaceNode).setPlaceName(placeName);
}

export function $isPlaceNode(
  node: LexicalNode | null | undefined,
): node is PlaceNode {
  return node instanceof PlaceNode;
}
