/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var b=require("lexical");
class d extends b.ElementNode{static getType(){return"overflow"}static clone(a){return new d(a.__key)}static importJSON(){return e()}static importDOM(){return null}constructor(a){super(a);this.__type="overflow"}exportJSON(){return{...super.exportJSON(),type:"overflow"}}createDOM(a){let c=document.createElement("span");a=a.theme.characterLimit;"string"===typeof a&&(c.className=a);return c}updateDOM(){return!1}insertNewAfter(a,c=!0){return this.getParentOrThrow().insertNewAfter(a,c)}excludeFromCopy(){return!0}}
function e(){return b.$applyNodeReplacement(new d)}exports.$createOverflowNode=e;exports.$isOverflowNode=function(a){return a instanceof d};exports.OverflowNode=d
