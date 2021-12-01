/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import * as React from 'react';
import {useEffect} from 'react';
import PlaygroundEditorContext from '../context/PlaygroundEditorContext';
import {useEditorContext} from 'outline-react/OutlineEditorContext';
import {TableNode} from 'outline/TableNode';
import {TableCellNode} from 'outline/TableCellNode';
import {TableRowNode} from 'outline/TableRowNode';
import type {OutlineEditor} from 'outline/src/core/OutlineEditor';

function useBonsaiTables(editor: OutlineEditor): void {
  useEffect(() => {
    return editor.registerNodes([TableNode, TableCellNode, TableRowNode]);
  }, [editor]);
}

export default function TablesPlugin(): React.MixedElement | null {
  const [editor] = useEditorContext(PlaygroundEditorContext);

  useBonsaiTables(editor);

  return null;
}
