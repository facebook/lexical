/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var b=require("@lexical/link"),c=require("@lexical/react/LexicalComposerContext"),k=require("@lexical/utils"),l=require("lexical"),m=require("react");
exports.LinkPlugin=function({validateUrl:d}){let [e]=c.useLexicalComposerContext();m.useEffect(()=>{if(!e.hasNodes([b.LinkNode]))throw Error("LinkPlugin: LinkNode not registered on editor");return k.mergeRegister(e.registerCommand(b.TOGGLE_LINK_COMMAND,a=>{if(null===a)return b.toggleLink(a),!0;if("string"===typeof a)return void 0===d||d(a)?(b.toggleLink(a),!0):!1;let {url:f,target:g,rel:h,title:n}=a;b.toggleLink(f,{rel:h,target:g,title:n});return!0},l.COMMAND_PRIORITY_LOW),void 0!==d?e.registerCommand(l.PASTE_COMMAND,
a=>{let f=l.$getSelection();if(!l.$isRangeSelection(f)||f.isCollapsed()||!(a instanceof ClipboardEvent)||null==a.clipboardData)return!1;let g=a.clipboardData.getData("text");return d(g)?f.getNodes().some(h=>l.$isElementNode(h))?!1:(e.dispatchCommand(b.TOGGLE_LINK_COMMAND,g),a.preventDefault(),!0):!1},l.COMMAND_PRIORITY_LOW):()=>{})},[e,d]);return null}
