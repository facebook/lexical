/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var c=require("@lexical/react/LexicalCollaborationContext"),h=require("@lexical/react/LexicalComposerContext"),p=require("react");function q(a){let f=new URLSearchParams;f.append("code",a);for(let d=1;d<arguments.length;d++)f.append("v",arguments[d]);throw Error(`Minified Lexical error #${a}; visit https://lexical.dev/docs/error?${f} for the full message or `+"use the non-minified dev environment for full errors and additional helpful warnings.");}
exports.LexicalNestedComposer=function({initialEditor:a,children:f,initialNodes:d,initialTheme:r,skipCollabChecks:t}){let n=p.useRef(!1),k=p.useContext(h.LexicalComposerContext);null==k&&q(9);let [e,{getTheme:u}]=k,x=p.useMemo(()=>{var b=r||u()||void 0;const v=h.createLexicalComposerContext(k,b);void 0!==b&&(a._config.theme=b);a._parentEditor=e;if(d)for(var g of d)b=g.getType(),a._nodes.set(b,{klass:g,replace:null,replaceWithKlass:null,transforms:new Set});else{g=a._nodes=new Map(e._nodes);for(const [w,
l]of g)a._nodes.set(w,{klass:l.klass,replace:l.replace,replaceWithKlass:l.replaceWithKlass,transforms:new Set})}a._config.namespace=e._config.namespace;a._editable=e._editable;return[a,v]},[]),{isCollabActive:y,yjsDocMap:z}=c.useCollaborationContext(),m=t||n.current||z.has(a.getKey());p.useEffect(()=>{m&&(n.current=!0)},[m]);p.useEffect(()=>e.registerEditableListener(b=>{a.setEditable(b)}),[a,e]);return p.createElement(h.LexicalComposerContext.Provider,{value:x},!y||m?f:null)}
