/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var b=require("@lexical/react/LexicalComposerContext"),k=require("react"),l="undefined"!==typeof window&&"undefined"!==typeof window.document&&"undefined"!==typeof window.document.createElement?k.useLayoutEffect:k.useEffect;
function m(a){let [c]=b.useLexicalComposerContext(),e=k.useMemo(()=>a(c),[c,a]),d=k.useRef(e.initialValueFn()),[n,g]=k.useState(d.current);l(()=>{let {initialValueFn:p,subscribe:q}=e,f=p();d.current!==f&&(d.current=f,g(f));return q(h=>{d.current=h;g(h)})},[e,a]);return n}function r(a){return{initialValueFn:()=>a.isEditable(),subscribe:c=>a.registerEditableListener(c)}}module.exports=function(){return m(r)}
