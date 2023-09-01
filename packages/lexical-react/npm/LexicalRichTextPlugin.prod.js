/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var b=require("@lexical/react/LexicalComposerContext"),g=require("@lexical/react/useLexicalEditable"),l=require("react"),m=require("@lexical/text"),n=require("@lexical/utils"),p=require("react-dom"),t=require("@lexical/dragon"),u=require("@lexical/rich-text"),v="undefined"!==typeof window&&"undefined"!==typeof window.document&&"undefined"!==typeof window.document.createElement?l.useLayoutEffect:l.useEffect;
function w(a){return a.getEditorState().read(m.$canShowPlaceholderCurry(a.isComposing()))}function x(a){let [d,c]=l.useState(()=>w(a));v(()=>{function e(){let f=w(a);c(f)}e();return n.mergeRegister(a.registerUpdateListener(()=>{e()}),a.registerEditableListener(()=>{e()}))},[a]);return d}
function y(a,d){let [c,e]=l.useState(()=>a.getDecorators());v(()=>a.registerDecoratorListener(f=>{p.flushSync(()=>{e(f)})}),[a]);l.useEffect(()=>{e(a.getDecorators())},[a]);return l.useMemo(()=>{let f=[],q=Object.keys(c);for(let h=0;h<q.length;h++){let k=q[h],A=l.createElement(d,{onError:z=>a._onError(z)},l.createElement(l.Suspense,{fallback:null},c[k])),r=a.getElementByKey(k);null!==r&&f.push(p.createPortal(A,r,k))}return f},[d,c,a])}
function B(a){v(()=>n.mergeRegister(u.registerRichText(a),t.registerDragonSupport(a)),[a])}function C({content:a}){var [d]=b.useLexicalComposerContext();d=x(d);let c=g();return d?"function"===typeof a?a(c):a:null}exports.RichTextPlugin=function({contentEditable:a,placeholder:d,ErrorBoundary:c}){let [e]=b.useLexicalComposerContext();c=y(e,c);B(e);return l.createElement(l.Fragment,null,a,l.createElement(C,{content:d}),c)}
