/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var e=require("@lexical/react/LexicalComposerContext"),f=require("@lexical/text"),g=require("@lexical/utils"),h=require("react");exports.useLexicalTextEntity=function(a,b,c){let [d]=e.useLexicalComposerContext();h.useEffect(()=>g.mergeRegister(...f.registerLexicalTextEntity(d,a,b,c)),[c,d,a,b])}
