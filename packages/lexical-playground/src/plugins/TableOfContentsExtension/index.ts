/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {ReactExtension} from '@lexical/react/ReactExtension';
import {defineExtension} from 'lexical';

import {ContentsExtension} from '../ContentsExtension';
import {IdStateExtension} from '../IdStateExtension';
import {TableOfContentsComponent} from './TableOfContents';

export {
  INSERT_CONTENTS_COMMAND,
  TableOfContentsComponent,
  type TableOfContentsProps,
} from './TableOfContents';

export const TableOfContentsExtension = defineExtension({
  build: () => ({Component: TableOfContentsComponent}),
  dependencies: [ReactExtension, IdStateExtension, ContentsExtension],
  name: '@lexical/playground/TableOfContents',
});
