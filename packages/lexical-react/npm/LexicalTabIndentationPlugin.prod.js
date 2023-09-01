/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var d=require("@lexical/react/LexicalComposerContext"),g=require("@lexical/utils"),h=require("lexical"),k=require("react");function l(b,a){let c=[];for(let e=0;e<b.length;e++){let f=a(b[e]);null!==f&&c.push(f)}return c}
function m(b){var a=b.getNodes();if(0<l(a,c=>h.$isBlockElementNode(c)&&c.canIndent()?c:null).length)return!0;a=b.anchor;b=b.focus;b=b.isBefore(a)?b:a;a=b.getNode();a=g.$getNearestBlockElementAncestorOrThrow(a);if(a.canIndent()){a=a.getKey();let c=h.$createRangeSelection();c.anchor.set(a,0,"element");c.focus.set(a,0,"element");c=h.$normalizeSelection__EXPERIMENTAL(c);if(c.anchor.is(b))return!0}return!1}
function n(b){return b.registerCommand(h.KEY_TAB_COMMAND,a=>{let c=h.$getSelection();if(!h.$isRangeSelection(c))return!1;a.preventDefault();a=m(c)?a.shiftKey?h.OUTDENT_CONTENT_COMMAND:h.INDENT_CONTENT_COMMAND:h.INSERT_TAB_COMMAND;return b.dispatchCommand(a,void 0)},h.COMMAND_PRIORITY_EDITOR)}exports.TabIndentationPlugin=function(){let [b]=d.useLexicalComposerContext();k.useEffect(()=>n(b));return null};exports.registerTabIndentation=n
