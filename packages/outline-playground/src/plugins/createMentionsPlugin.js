/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineComposerPlugin} from 'outline-react/OutlineComposer.react';

import useMentions from './../useMentions';

function MentionsPluginComponent({outlineProps: {editor}}): React$Node {
  const TypeaheadComponent = useMentions(editor);
  return TypeaheadComponent;
}

function createMentionsPlugin(): OutlineComposerPlugin<null> {
  return {
    name: 'mentions',
    component: MentionsPluginComponent,
    props: null,
  };
}

export default createMentionsPlugin;
