/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var b=require("@lexical/text"),e=require("react"),f="undefined"!==typeof window&&"undefined"!==typeof window.document&&"undefined"!==typeof window.document.createElement?e.useLayoutEffect:e.useEffect;exports.useLexicalIsTextContentEmpty=function(a,c){let [g,h]=e.useState(a.getEditorState().read(b.$isRootTextContentEmptyCurry(a.isComposing(),c)));f(()=>a.registerUpdateListener(({editorState:d})=>{let k=a.isComposing();d=d.read(b.$isRootTextContentEmptyCurry(k,c));h(d)}),[a,c]);return g}
