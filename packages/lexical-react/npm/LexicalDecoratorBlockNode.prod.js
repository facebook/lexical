/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var b=require("lexical");class c extends b.DecoratorNode{constructor(a,d){super(d);this.__format=a||""}exportJSON(){return{format:this.__format||"",type:"decorator-block",version:1}}createDOM(){return document.createElement("div")}updateDOM(){return!1}setFormat(a){this.getWritable().__format=a}isInline(){return!1}}exports.$isDecoratorBlockNode=function(a){return a instanceof c};exports.DecoratorBlockNode=c
