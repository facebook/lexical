/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var e=require("@lexical/react/LexicalComposerContext"),f=require("lexical"),g=require("react");let m="undefined"!==typeof window&&"undefined"!==typeof window.document&&"undefined"!==typeof window.document.createElement;var n=m?g.useLayoutEffect:g.useEffect;let p={tag:"history-merge"};
function q(a,c){if(null!==c)if(void 0===c)a.update(()=>{var b=f.$getRoot();if(b.isEmpty()){let d=f.$createParagraphNode();b.append(d);b=m?document.activeElement:null;(null!==f.$getSelection()||null!==b&&b===a.getRootElement())&&d.select()}},p);else if(null!==c)switch(typeof c){case "string":let b=a.parseEditorState(c);a.setEditorState(b,p);break;case "object":a.setEditorState(c,p);break;case "function":a.update(()=>{f.$getRoot().isEmpty()&&c(a)},p)}}
exports.LexicalComposer=function({initialConfig:a,children:c}){let b=g.useMemo(()=>{const {theme:d,namespace:h,editor__DEPRECATED:r,nodes:t,onError:u,editorState:v}=a,w=e.createLexicalComposerContext(null,d);let k=r||null;if(null===k){const l=f.createEditor({editable:a.editable,namespace:h,nodes:t,onError:x=>u(x,l),theme:d});q(l,v);k=l}return[k,w]},[]);n(()=>{let d=a.editable,[h]=b;h.setEditable(void 0!==d?d:!0)},[]);return g.createElement(e.LexicalComposerContext.Provider,{value:b},c)}
