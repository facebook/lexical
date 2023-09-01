/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var b=require("@lexical/list"),c=require("@lexical/react/LexicalComposerContext"),d=require("react"),e=require("@lexical/utils"),f=require("lexical");
function g(a){d.useEffect(()=>e.mergeRegister(a.registerCommand(b.INSERT_ORDERED_LIST_COMMAND,()=>{b.insertList(a,"number");return!0},f.COMMAND_PRIORITY_LOW),a.registerCommand(b.INSERT_UNORDERED_LIST_COMMAND,()=>{b.insertList(a,"bullet");return!0},f.COMMAND_PRIORITY_LOW),a.registerCommand(b.REMOVE_LIST_COMMAND,()=>{b.removeList(a);return!0},f.COMMAND_PRIORITY_LOW),a.registerCommand(f.INSERT_PARAGRAPH_COMMAND,()=>b.$handleListInsertParagraph()?!0:!1,f.COMMAND_PRIORITY_LOW)),[a])}
exports.ListPlugin=function(){let [a]=c.useLexicalComposerContext();d.useEffect(()=>{if(!a.hasNodes([b.ListNode,b.ListItemNode]))throw Error("ListPlugin: ListNode and/or ListItemNode not registered on editor");},[a]);g(a);return null}
