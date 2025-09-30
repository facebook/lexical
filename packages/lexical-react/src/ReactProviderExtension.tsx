/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {defineExtension} from 'lexical';

/**
 * An extension used to declare that there is a LexicalExtensionComposer or
 * ReactPluginHostExtension available so that we can issue runtime warnings
 * when plugins that depend on React are hosted in an environment
 * where it is not ever going to be rendered.
 *
 * It is a separate extension so it can be used as a peer dependency.
 */
export const ReactProviderExtension = defineExtension({
  name: '@lexical/react/ReactProvider',
});
