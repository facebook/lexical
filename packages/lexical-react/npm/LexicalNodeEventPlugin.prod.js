/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var g=require("@lexical/react/LexicalComposerContext"),m=require("@lexical/utils"),n=require("lexical"),p=require("react");let q=new Set(["mouseenter","mouseleave"]);
exports.NodeEventPlugin=function({nodeType:d,eventType:e,eventListener:h}){let [c]=g.useLexicalComposerContext(),k=p.useRef(h);k.current=h;p.useEffect(()=>{let f=q.has(e),l=b=>{c.update(()=>{var a=n.$getNearestNodeFromDOMNode(b.target);null!==a&&(a=f?a instanceof d?a:null:m.$findMatchingParent(a,r=>r instanceof d),null!==a&&k.current(b,c,a.getKey()))})};return c.registerRootListener((b,a)=>{b&&b.addEventListener(e,l,f);a&&a.removeEventListener(e,l,f)})},[c,d]);return null}
