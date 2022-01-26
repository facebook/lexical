/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

 import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
 import {useEffect} from 'react';
 import {PollNode} from '../nodes/PollNode';
 
 export default function PollPlugin(): React$Node {
   const [editor] = useLexicalComposerContext();
   useEffect(() => {
     return editor.registerNodes([PollNode]);
   }, [editor]);
   return null;
 }
 