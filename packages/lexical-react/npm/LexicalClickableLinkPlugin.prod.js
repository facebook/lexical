/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var e=require("@lexical/link"),m=require("@lexical/react/LexicalComposerContext"),q=require("@lexical/utils"),r=require("lexical"),t=require("react");
module.exports=function({newTab:n=!0}){let [h]=m.useLexicalComposerContext();t.useEffect(()=>{let l=a=>{const c=a.target;if(c instanceof Node){var d=r.getNearestEditorFromDOMNode(c);if(null!==d){var f=null,k=null;d.update(()=>{var b=r.$getNearestNodeFromDOMNode(c);if(null!==b)if(b=q.$findMatchingParent(b,r.$isElementNode),e.$isLinkNode(b))f=b.getURL(),k=b.getTarget();else{a:{b=q.isHTMLAnchorElement;let g=c;for(;null!=g;){if(b(g)){b=g;break a}g=g.parentNode}b=null}null!==b&&(f=b.href,k=b.target)}});
if(null!==f&&""!==f){d=h.getEditorState().read(r.$getSelection);if(!r.$isRangeSelection(d)||d.isCollapsed())d="auxclick"===a.type&&1===a.button,window.open(f,n||d||a.metaKey||a.ctrlKey||"_blank"===k?"_blank":"_self");a.preventDefault()}}}},p=a=>{1===a.button&&h.isEditable()&&l(a)};return h.registerRootListener((a,c)=>{null!==c&&(c.removeEventListener("click",l),c.removeEventListener("mouseup",p));null!==a&&(a.addEventListener("click",l),a.addEventListener("mouseup",p))})},[h,n]);return null}
