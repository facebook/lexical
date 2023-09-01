/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var d=require("react");function e(a){let c=new URLSearchParams;c.append("code",a);for(let b=1;b<arguments.length;b++)c.append("v",arguments[b]);throw Error(`Minified Lexical error #${a}; visit https://lexical.dev/docs/error?${c} for the full message or `+"use the non-minified dev environment for full errors and additional helpful warnings.");}let f=d.createContext(null);exports.LexicalComposerContext=f;
exports.createLexicalComposerContext=function(a,c){let b=null;null!=a&&(b=a[1]);return{getTheme:function(){return null!=c?c:null!=b?b.getTheme():null}}};exports.useLexicalComposerContext=function(){let a=d.useContext(f);null==a&&e(8);return a}
