/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var l=require("@lexical/react/LexicalComposerContext"),m=require("@lexical/rich-text"),q=require("lexical"),u=require("react");function w(n){return[n.getKey(),n.getTextContent(),n.getTag()]}
module.exports=function({children:n}){let [x,r]=u.useState([]),[h]=l.useLexicalComposerContext();u.useEffect(()=>{let c=[];h.getEditorState().read(()=>{let p=q.$getRoot().getChildren();for(let a of p)m.$isHeadingNode(a)&&c.push([a.getKey(),a.getTextContent(),a.getTag()]);r(c)});let y=h.registerMutationListener(m.HeadingNode,p=>{h.getEditorState().read(()=>{for(const [k,t]of p)if("created"===t){var a=q.$getNodeByKey(k);if(null!==a){for(var b=a.getPreviousSibling();null!==b&&!m.$isHeadingNode(b);)b=
b.getPreviousSibling();var d=c;if(null===a)c=d;else{var g=w(a),e=[];if(null===b)e=[g,...d];else for(let f=0;f<d.length;f++){let v=d[f][0];e.push(d[f]);v===b.getKey()&&v!==a.getKey()&&e.push(g)}c=e}}}else if("destroyed"===t){b=k;a=c;d=[];for(let f of a)f[0]!==b&&d.push(f);c=d}else if("updated"===t&&(a=q.$getNodeByKey(k),null!==a)){for(b=a.getPreviousSibling();null!==b&&!m.$isHeadingNode(b);)b=b.getPreviousSibling();d=c;g=[];e=w(a);b||g.push(e);for(let f of d)f[0]!==a.getKey()&&(g.push(f),b&&f[0]===
b.getKey()&&g.push(e));c=g}r(c)})}),z=h.registerMutationListener(q.TextNode,p=>{h.getEditorState().read(()=>{for(const [d,g]of p)if("updated"===g){var a=q.$getNodeByKey(d);if(null!==a&&(a=a.getParentOrThrow(),m.$isHeadingNode(a))){var b=c;let e=[];for(let k of b)k[0]===a.getKey()?e.push(w(a)):e.push(k);c=e;r(c)}}})});return()=>{y();z()}},[h]);return n(x,h)}
