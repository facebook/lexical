/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  $applyNodeReplacement,
  $getRoot,
  $getState,
  $setState,
  createState,
  DecoratorNode,
  LexicalExportJSON,
  LexicalNode,
  StateConfigValue,
  StateValueOrUpdater,
} from 'lexical';

import {DEFAULT_PAGE_SETUP, PAGE_SIZES} from './constants';
import {Orientation, PageSetup, PageSize} from './types';

export const PAGE_SETUP_TAG = 'page-setup';

export type SerializedPageSetupNode = LexicalExportJSON<PageSetupNode>;

const pageSizeState = createState('pageSize', {
  parse: (v): PageSize => {
    if (typeof v === 'string' && v in PAGE_SIZES) {
      return v as PageSize;
    }
    return DEFAULT_PAGE_SETUP.pageSize;
  },
});

const orientationState = createState('orientation', {
  parse: (v): Orientation =>
    v === 'landscape' || v === 'portrait' ? v : DEFAULT_PAGE_SETUP.orientation,
});

const marginsState = createState('margins', {
  isEqual: (a: PageSetup['margins'], b: PageSetup['margins']) =>
    a.top === b.top &&
    a.right === b.right &&
    a.bottom === b.bottom &&
    a.left === b.left,
  parse: (v): PageSetup['margins'] => {
    const defaults = structuredClone(DEFAULT_PAGE_SETUP.margins);
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const o = v as Record<string, unknown>;
      for (const k of ['top', 'right', 'bottom', 'left'] as const) {
        if (typeof o[k] === 'number') {
          defaults[k] = o[k];
        }
      }
    }
    return defaults;
  },
});

export class PageSetupNode extends DecoratorNode<null> {
  $config() {
    return this.config('page-setup', {
      extends: DecoratorNode,
      stateConfigs: [
        {flat: true, stateConfig: pageSizeState},
        {flat: true, stateConfig: orientationState},
        {flat: true, stateConfig: marginsState},
      ],
    });
  }

  createDOM(): HTMLElement {
    const dom = document.createElement('div');
    dom.style.display = 'none';
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  decorate(): null {
    return null;
  }

  isSelected(): boolean {
    return false;
  }

  isKeyboardSelectable(): boolean {
    return false;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }

  excludeFromCopy(): boolean {
    return true;
  }

  getPageSetup(): PageSetup {
    return {
      margins: this.getMargins(),
      orientation: this.getOrientation(),
      pageSize: this.getPageSize(),
    };
  }

  getPageSize(): StateConfigValue<typeof pageSizeState> {
    return $getState(this, pageSizeState);
  }

  getOrientation(): StateConfigValue<typeof orientationState> {
    return $getState(this, orientationState);
  }

  getMargins(): StateConfigValue<typeof marginsState> {
    return $getState(this, marginsState);
  }

  setPageSize(pageSize: StateValueOrUpdater<typeof pageSizeState>): this {
    return $setState(this, pageSizeState, pageSize);
  }

  setOrientation(
    orientation: StateValueOrUpdater<typeof orientationState>,
  ): this {
    return $setState(this, orientationState, orientation);
  }

  setMargins(margins: Partial<PageSetup['margins']>): this {
    return $setState(this, marginsState, (prev: PageSetup['margins']) => ({
      ...prev,
      ...margins,
    }));
  }
}

export function $createPageSetupNode(
  payload = structuredClone(DEFAULT_PAGE_SETUP),
): PageSetupNode {
  const {pageSize, orientation, margins} = payload;
  return $applyNodeReplacement(
    new PageSetupNode()
      .setPageSize(pageSize)
      .setOrientation(orientation)
      .setMargins(margins),
  );
}

export function $isPageSetupNode(
  node: LexicalNode | null | undefined,
): node is PageSetupNode {
  return node instanceof PageSetupNode;
}

export function $getPageSetupNode(): PageSetupNode | null {
  const root = $getRoot();
  const firstChild = root.getFirstChild();
  if ($isPageSetupNode(firstChild)) {
    return firstChild;
  }
  return null;
}
