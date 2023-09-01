/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var b=require("@lexical/react/LexicalComposerContext"),c=require("@lexical/react/LexicalHorizontalRuleNode"),e=require("@lexical/utils"),f=require("lexical"),g=require("react");
exports.HorizontalRulePlugin=function(){let [d]=b.useLexicalComposerContext();g.useEffect(()=>d.registerCommand(c.INSERT_HORIZONTAL_RULE_COMMAND,()=>{var a=f.$getSelection();if(!f.$isRangeSelection(a))return!1;null!==a.focus.getNode()&&(a=c.$createHorizontalRuleNode(),e.$insertNodeToNearestRoot(a));return!0},f.COMMAND_PRIORITY_EDITOR),[d]);return null}
