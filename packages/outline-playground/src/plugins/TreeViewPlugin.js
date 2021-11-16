/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import OutlineTreeView from 'outline-react/OutlineTreeView';
import * as React from 'react';
import PlaygroundController from '../controllers/PlaygroundController';
import {useController} from 'outline-react/OutlineController';

export default function TreeViewPlugin(): React$Node {
  const [editor] = useController(PlaygroundController);
  return (
    <OutlineTreeView
      viewClassName="tree-view-output"
      timeTravelPanelClassName="debug-timetravel-panel"
      timeTravelButtonClassName="debug-timetravel-button"
      timeTravelPanelSliderClassName="debug-timetravel-panel-slider"
      timeTravelPanelButtonClassName="debug-timetravel-panel-button"
      editor={editor}
    />
  );
}
