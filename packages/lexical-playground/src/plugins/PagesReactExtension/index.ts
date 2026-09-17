/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {ReactExtension} from '@lexical/react/ReactExtension';
import {configExtension, defineExtension} from 'lexical';

import {buildPlaygroundHeaderFooterEditor} from '../../PlaygroundExtensions';
import {PagesExtension} from '../PagesExtension';
import {PageSetupComponent} from './PageSetupComponent';
import {PageSlotEditorsHostDecorator} from './PageSlotEditorsHost';

export {
  PageSetupComponent,
  type PageSetupComponentProps,
} from './PageSetupComponent';
export {PAGE_SIZE_ORDER, PageSetupDialog} from './PageSetupDialog';
export {PageSlotEditorsHost} from './PageSlotEditorsHost';

export const PagesReactExtension = defineExtension({
  build: () => ({Component: PageSetupComponent}),
  dependencies: [
    // The nested header/footer editors are created outside React; this
    // renders a composer for each inside the document's React tree.
    configExtension(ReactExtension, {
      decorators: [PageSlotEditorsHostDecorator],
    }),
    // Headers and footers get the playground's full feature set.
    configExtension(PagesExtension, {
      buildSlotEditor: buildPlaygroundHeaderFooterEditor,
    }),
  ],
  name: '@lexical/playground/PagesReact',
});
