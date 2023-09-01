/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var c=require("@lexical/utils"),d=require("lexical");
class e extends d.TextNode{static getType(){return"hashtag"}static clone(a){return new e(a.__text,a.__key)}constructor(a,b){super(a,b)}createDOM(a){let b=super.createDOM(a);c.addClassNamesToElement(b,a.theme.hashtag);return b}static importJSON(a){let b=f(a.text);b.setFormat(a.format);b.setDetail(a.detail);b.setMode(a.mode);b.setStyle(a.style);return b}exportJSON(){return{...super.exportJSON(),type:"hashtag"}}canInsertTextBefore(){return!1}isTextEntity(){return!0}}
function f(a=""){return d.$applyNodeReplacement(new e(a))}exports.$createHashtagNode=f;exports.$isHashtagNode=function(a){return a instanceof e};exports.HashtagNode=e
