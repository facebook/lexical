/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var c=require("@lexical/react/LexicalComposerContext"),h=require("react");function n(){n=Object.assign?Object.assign.bind():function(g){for(var d=1;d<arguments.length;d++){var e=arguments[d],b;for(b in e)Object.prototype.hasOwnProperty.call(e,b)&&(g[b]=e[b])}return g};return n.apply(this,arguments)}var p="undefined"!==typeof window&&"undefined"!==typeof window.document&&"undefined"!==typeof window.document.createElement?h.useLayoutEffect:h.useEffect;
exports.ContentEditable=function({ariaActiveDescendant:g,ariaAutoComplete:d,ariaControls:e,ariaDescribedBy:b,ariaExpanded:q,ariaLabel:r,ariaLabelledBy:t,ariaMultiline:u,ariaOwns:v,ariaRequired:w,autoCapitalize:x,className:y,id:z,role:l="textbox",spellCheck:A=!0,style:B,tabIndex:C,"data-testid":D,...E}){let [f]=c.useLexicalComposerContext(),[a,m]=h.useState(!1),F=h.useCallback(k=>{f.setRootElement(k)},[f]);p(()=>{m(f.isEditable());return f.registerEditableListener(k=>{m(k)})},[f]);return h.createElement("div",
n({},E,{"aria-activedescendant":a?g:void 0,"aria-autocomplete":a?d:"none","aria-controls":a?e:void 0,"aria-describedby":b,"aria-expanded":a?"combobox"===l?!!q:void 0:void 0,"aria-label":r,"aria-labelledby":t,"aria-multiline":u,"aria-owns":a?v:void 0,"aria-readonly":a?void 0:!0,"aria-required":w,autoCapitalize:x,className:y,contentEditable:a,"data-testid":D,id:z,ref:F,role:l,spellCheck:A,style:B,tabIndex:C}))}
