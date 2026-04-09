/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {ReactExtension} from '@lexical/react/ReactExtension';
import {configExtension, defineExtension} from 'lexical';

import {PageContentNode, PageNode, PageSetupNode} from '../../nodes/PageNode';
import {PageSetupDropdownComponent} from './PageSetupDropdown';
import {PagesPlugin} from './PagesPlugin';

export const PagesExtension = defineExtension({
  build: () => ({Component: PageSetupDropdownComponent}),
  dependencies: [
    configExtension(ReactExtension, {
      decorators: [PagesPlugin],
    }),
  ],
  name: '@lexical/playground/Pages',
  nodes: [PageSetupNode, PageNode, PageContentNode],
});
