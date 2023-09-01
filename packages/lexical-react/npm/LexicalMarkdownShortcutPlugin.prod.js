/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var c=require("@lexical/markdown"),d=require("@lexical/react/LexicalComposerContext"),e=require("@lexical/react/LexicalHorizontalRuleNode"),f=require("react");let g=[{dependencies:[e.HorizontalRuleNode],export:a=>e.$isHorizontalRuleNode(a)?"***":null,regExp:/^(---|\*\*\*|___)\s?$/,replace:(a,b,k,h)=>{b=e.$createHorizontalRuleNode();h||null!=a.getNextSibling()?a.replace(b):a.insertBefore(b);b.selectNext()},type:"element"},...c.TRANSFORMERS];exports.DEFAULT_TRANSFORMERS=g;
exports.MarkdownShortcutPlugin=function({transformers:a=g}){let [b]=d.useLexicalComposerContext();f.useEffect(()=>c.registerMarkdownShortcuts(b,a),[b,a]);return null}
