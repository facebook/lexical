/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var m=require("@lexical/selection"),q=require("@lexical/utils"),r=require("lexical");
function u(c,d,h,a=null){let e=null!=a?d.isSelected(a):!0,k=r.$isElementNode(d)&&d.excludeFromCopy("html");var f=d;null!==a&&(f=m.$cloneWithProperties(d),f=r.$isTextNode(f)&&null!=a?m.$sliceSelectedTextNodeContent(a,f):f);let g=r.$isElementNode(f)?f.getChildren():[],{element:b,after:l}=f.exportDOM(c);if(!b)return!1;let n=document.createDocumentFragment();for(let p=0;p<g.length;p++){let t=g[p],x=u(c,t,n,a);!e&&r.$isElementNode(d)&&x&&d.extractWithChild(t,a,"html")&&(e=!0)}e&&!k?(q.isHTMLElement(b)&&
b.append(n),h.append(b),l&&(c=l.call(f,b))&&b.replaceWith(c)):h.append(n);return e}let v=new Set(["STYLE","SCRIPT"]);
function w(c,d,h=new Map,a){let e=[];if(v.has(c.nodeName))return e;let k=null;var f,{nodeName:g}=c,b=d._htmlConversions.get(g.toLowerCase());g=null;if(void 0!==b)for(f of b)b=f(c),null!==b&&(null===g||g.priority<b.priority)&&(g=b);g=(f=null!==g?g.conversion:null)?f(c):null;f=null;if(null!==g){f=g.after;b=g.node;k=Array.isArray(b)?b[b.length-1]:b;if(null!==k){for(var [,l]of h)if(k=l(k,a),!k)break;k&&e.push(...(Array.isArray(b)?b:[k]))}null!=g.forChild&&h.set(c.nodeName,g.forChild)}c=c.childNodes;a=
[];for(l=0;l<c.length;l++)a.push(...w(c[l],d,new Map(h),k));null!=f&&(a=f(a));null==k?e=e.concat(a):r.$isElementNode(k)&&k.append(...a);return e}
exports.$generateHtmlFromNodes=function(c,d){if("undefined"===typeof document||"undefined"===typeof window)throw Error("To use $generateHtmlFromNodes in headless mode please initialize a headless browser implementation such as JSDom before calling this function.");let h=document.createElement("div"),a=r.$getRoot().getChildren();for(let e=0;e<a.length;e++)u(c,a[e],h,d);return h.innerHTML};
exports.$generateNodesFromDOM=function(c,d){d=d.body?d.body.childNodes:[];let h=[];for(let e=0;e<d.length;e++){var a=d[e];v.has(a.nodeName)||(a=w(a,c),null!==a&&(h=h.concat(a)))}return h}
