/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var d=require("@lexical/react/LexicalComposerContext"),e=require("@lexical/utils"),f=require("lexical"),g=require("react");
function h(b){var a=b.getNodes();if(0<e.$filter(a,c=>f.$isBlockElementNode(c)&&c.canIndent()?c:null).length)return!0;a=b.anchor;b=b.focus;b=b.isBefore(a)?b:a;a=b.getNode();a=e.$getNearestBlockElementAncestorOrThrow(a);if(a.canIndent()){a=a.getKey();let c=f.$createRangeSelection();c.anchor.set(a,0,"element");c.focus.set(a,0,"element");c=f.$normalizeSelection__EXPERIMENTAL(c);if(c.anchor.is(b))return!0}return!1}
function k(b){return b.registerCommand(f.KEY_TAB_COMMAND,a=>{let c=f.$getSelection();if(!f.$isRangeSelection(c))return!1;a.preventDefault();a=h(c)?a.shiftKey?f.OUTDENT_CONTENT_COMMAND:f.INDENT_CONTENT_COMMAND:f.INSERT_TAB_COMMAND;return b.dispatchCommand(a,void 0)},f.COMMAND_PRIORITY_EDITOR)}exports.TabIndentationPlugin=function(){let [b]=d.useLexicalComposerContext();g.useEffect(()=>k(b));return null};exports.registerTabIndentation=k
