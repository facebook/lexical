/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var a=require("@lexical/react/LexicalComposerContext"),h=require("@lexical/react/LexicalDecoratorBlockNode"),l=require("@lexical/react/useLexicalNodeSelection"),m=require("@lexical/utils"),u=require("lexical"),v=require("react");
exports.BlockWithAlignableContents=function({children:w,format:n,nodeKey:e,className:p}){let [f]=a.useLexicalComposerContext(),[c,q,r]=l.useLexicalNodeSelection(e),t=v.useRef(null),k=v.useCallback(b=>{c&&u.$isNodeSelection(u.$getSelection())&&(b.preventDefault(),b=u.$getNodeByKey(e),u.$isDecoratorNode(b)&&b.remove());return!1},[c,e]);v.useEffect(()=>m.mergeRegister(f.registerCommand(u.FORMAT_ELEMENT_COMMAND,b=>{if(c){var g=u.$getSelection();if(u.$isNodeSelection(g)){var d=u.$getNodeByKey(e);h.$isDecoratorBlockNode(d)&&
d.setFormat(b)}else if(u.$isRangeSelection(g)){g=g.getNodes();for(d of g)h.$isDecoratorBlockNode(d)?d.setFormat(b):m.$getNearestBlockElementAncestorOrThrow(d).setFormat(b)}return!0}return!1},u.COMMAND_PRIORITY_LOW),f.registerCommand(u.CLICK_COMMAND,b=>b.target===t.current?(b.preventDefault(),b.shiftKey||r(),q(!c),!0):!1,u.COMMAND_PRIORITY_LOW),f.registerCommand(u.KEY_DELETE_COMMAND,k,u.COMMAND_PRIORITY_LOW),f.registerCommand(u.KEY_BACKSPACE_COMMAND,k,u.COMMAND_PRIORITY_LOW)),[r,f,c,e,k,q]);return v.createElement("div",
{className:[p.base,c?p.focus:null].filter(Boolean).join(" "),ref:t,style:{textAlign:n?n:void 0}},w)}
