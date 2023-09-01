/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var a=require("@lexical/react/LexicalComposerContext"),k=require("react"),l="undefined"!==typeof window&&"undefined"!==typeof window.document&&"undefined"!==typeof window.document.createElement?k.useLayoutEffect:k.useEffect;
module.exports=function(c){let [f]=a.useLexicalComposerContext(),d=k.useMemo(()=>c(f),[f,c]),b=k.useRef(d.initialValueFn()),[m,g]=k.useState(b.current);l(()=>{let {initialValueFn:n,subscribe:p}=d,e=n();b.current!==e&&(b.current=e,g(e));return p(h=>{b.current=h;g(h)})},[d,c]);return m}
