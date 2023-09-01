/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var c=require("@lexical/react/LexicalComposerContext"),f=require("lexical"),h=require("react");function k(b,a){return b.getEditorState().read(()=>{let g=f.$getNodeByKey(a);return null===g?!1:g.isSelected()})}
exports.useLexicalNodeSelection=function(b){let [a]=c.useLexicalComposerContext(),[g,l]=h.useState(()=>k(a,b));h.useEffect(()=>{let d=!0,e=a.registerUpdateListener(()=>{d&&l(k(a,b))});return()=>{d=!1;e()}},[a,b]);let m=h.useCallback(d=>{a.update(()=>{let e=f.$getSelection();f.$isNodeSelection(e)||(e=f.$createNodeSelection(),f.$setSelection(e));d?e.add(b):e.delete(b)})},[a,b]),n=h.useCallback(()=>{a.update(()=>{const d=f.$getSelection();f.$isNodeSelection(d)&&d.clear()})},[a]);return[g,m,n]}
