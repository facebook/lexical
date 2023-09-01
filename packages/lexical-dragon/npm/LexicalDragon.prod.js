/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var g=require("lexical");
exports.registerDragonSupport=function(m){let t=window.location.origin,r=l=>{if(l.origin===t){var h=m.getRootElement();if(document.activeElement===h&&(h=l.data,"string"===typeof h)){try{var a=JSON.parse(h)}catch(k){return}if(a&&"nuanria_messaging"===a.protocol&&"request"===a.type&&(a=a.payload)&&"makeChanges"===a.functionId&&(a=a.args)){const [k,n,p,q,u]=a;m.update(()=>{const f=g.$getSelection();if(g.$isRangeSelection(f)){var e=f.anchor;let b=e.getNode(),c=0,d=0;g.$isTextNode(b)&&0<=k&&0<=n&&(c=k,
d=k+n,f.setTextNodeRange(b,c,b,d));if(c!==d||""!==p)f.insertRawText(p),b=e.getNode();g.$isTextNode(b)&&(c=q,d=q+u,e=b.getTextContentSize(),c=c>e?e:c,d=d>e?e:d,f.setTextNodeRange(b,c,b,d));l.stopImmediatePropagation()}})}}}};window.addEventListener("message",r,!0);return()=>{window.removeEventListener("message",r,!0)}}
