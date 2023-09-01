/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var a=require("@lexical/react/LexicalComposerContext"),d=require("lexical"),g=require("react"),h="undefined"!==typeof window&&"undefined"!==typeof window.document&&"undefined"!==typeof window.document.createElement?g.useLayoutEffect:g.useEffect;
exports.ClearEditorPlugin=function({onClear:b}){let [c]=a.useLexicalComposerContext();h(()=>c.registerCommand(d.CLEAR_EDITOR_COMMAND,()=>{c.update(()=>{if(null==b){let e=d.$getRoot(),k=d.$getSelection(),f=d.$createParagraphNode();e.clear();e.append(f);null!==k&&f.select()}else b()});return!0},d.COMMAND_PRIORITY_EDITOR),[c,b]);return null}
