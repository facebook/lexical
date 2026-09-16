/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {ReactExtension} from '@lexical/react/ReactExtension';
import {defineExtension} from 'lexical';

import {PagesExtension} from '../PagesExtension';
import {PageSetupComponent} from './PageSetupComponent';

export {
  PageSetupComponent,
  type PageSetupComponentProps,
  /** @deprecated Use {@link PageSetupComponentProps}. */
  type PageSetupComponentProps as PageSetupDropdownProps,
} from './PageSetupComponent';
export {PAGE_SIZE_ORDER, PageSetupDialog} from './PageSetupDialog';

/** @deprecated The dropdown became a dialog; use {@link PageSetupComponent}. */
export const PageSetupDropdownComponent = PageSetupComponent;

export const PagesReactExtension = defineExtension({
  build: () => ({Component: PageSetupComponent}),
  dependencies: [ReactExtension, PagesExtension],
  name: '@lexical/playground/PagesReact',
});
