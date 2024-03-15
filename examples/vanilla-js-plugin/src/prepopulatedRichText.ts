/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';

export default function prepopulatedRichText() {
  const root = $getRoot();
  if (root.getFirstChild() !== null) {
    return;
  }

  const paragraph = $createParagraphNode();
  paragraph.append(
    $createTextNode(' Try typing in '),
    $createTextNode('some smiles. ').toggleFormat('bold'),
    $createTextNode('For example: '),
    $createTextNode(':)').toggleFormat('code'),
    $createTextNode(', '),
    $createTextNode(':smiley:').toggleFormat('code'),
    $createTextNode('.'),
  );
  root.append(paragraph);
}
