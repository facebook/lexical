/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var m=require("lexical"),t=require("@lexical/list"),z=require("@lexical/rich-text"),aa=require("@lexical/utils"),A=require("@lexical/code"),G=require("@lexical/link");function H(a,c){let b={};for(let d of a)a=c(d),b[a]?b[a].push(d):b[a]=[d];return b}function I(a){a=H(a,c=>c.type);return{element:a.element||[],textFormat:a["text-format"]||[],textMatch:a["text-match"]||[]}}let J=/[!-/:-@[-`{-~\s]/;
function ba(a){let c=I(a),b=c.textFormat.filter(d=>1===d.format.length);return d=>{let e=[];d=(d||m.$getRoot()).getChildren();for(let f of d)d=ca(f,c.element,b,c.textMatch),null!=d&&e.push(d);return e.join("\n\n")}}function ca(a,c,b,d){for(let e of c){let f=e.export(a,g=>K(g,c,b,d));if(null!=f)return f}return m.$isElementNode(a)?K(a,c,b,d):m.$isDecoratorNode(a)?a.getTextContent():null}
function K(a,c,b,d){let e=[];a=a.getChildren();a:for(let g of a){if(m.$isElementNode(g))for(let h of c){var f=h.export(g,k=>K(k,c,b,d));if(null!=f){e.push(f);a.indexOf(g)!==a.length-1&&e.push("\n");continue a}}for(let h of d)if(f=h.export(g,k=>K(k,c,b,d),(k,p)=>L(k,p,b)),null!=f){e.push(f);continue a}m.$isLineBreakNode(g)?e.push("\n"):m.$isTextNode(g)?e.push(L(g,g.getTextContent(),b)):m.$isElementNode(g)?(e.push(K(g,c,b,d)),a.indexOf(g)!==a.length-1&&e.push("\n")):m.$isDecoratorNode(g)&&e.push(g.getTextContent())}return e.join("")}
function L(a,c,b){let d=c.trim(),e=d,f=new Set;for(let h of b){b=h.format[0];let k=h.tag;if(M(a,b)&&!f.has(b)){f.add(b);var g=N(a,!0);M(g,b)||(e=k+e);g=N(a,!1);M(g,b)||(e+=k)}}return c.replace(d,e)}
function N(a,c){let b=c?a.getPreviousSibling():a.getNextSibling();b||(a=a.getParentOrThrow(),a.isInline()&&(b=c?a.getPreviousSibling():a.getNextSibling()));for(;b;){if(m.$isElementNode(b)){if(!b.isInline())break;a=c?b.getLastDescendant():b.getFirstDescendant();if(m.$isTextNode(a))return a;b=c?b.getPreviousSibling():b.getNextSibling()}if(m.$isTextNode(b))return b;if(!m.$isElementNode(b))break}return null}function M(a,c){return m.$isTextNode(a)&&a.hasFormat(c)}
let O="undefined"!==typeof window&&"undefined"!==typeof window.document&&"undefined"!==typeof window.document.createElement,da=O&&"documentMode"in document?document.documentMode:null;O&&/Mac|iPod|iPhone|iPad/.test(navigator.platform);O&&/^(?!.*Seamonkey)(?=.*Firefox).*/i.test(navigator.userAgent);O&&"InputEvent"in window&&!da?"getTargetRanges"in new window.InputEvent("input"):!1;
let P=O&&/Version\/[\d.]+.*Safari/.test(navigator.userAgent),Q=O&&/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream,ea=O&&/^(?=.*Chrome).*/i.test(navigator.userAgent),R=O&&/AppleWebKit\/[\d.]+/.test(navigator.userAgent)&&!ea,fa=/^\s{0,3}$/;
function S(a,c,b){let d=c.length;var e=b.textFormat;var f={};var g={},h=[];for(var k of e){({tag:e}=k);f[e]=k;var p=e.replace(/(\*|\^|\+)/g,"\\$1");h.push(p);g[e]=P||Q||R?new RegExp(`(${p})(?![${p}\\s])(.*?[^${p}\\s])${p}(?!${p})`):new RegExp(`(?<![\\\\${p}])(${p})((\\\\${p})?.*?[^${p}\\s](\\\\${p})?)((?<!\\\\)|(?<=\\\\\\\\))(${p})(?![\\\\${p}])`)}f={fullMatchRegExpByTag:g,openTagsRegExp:new RegExp((P||Q||R?"":"(?<![\\\\])")+"("+h.join("|")+")","g"),transformersByTag:f};for(g=0;g<d;){h=c[g];p=!1;
for(let l of b.element)if(k=h.match(l.regExp),l.getNumberOfLines&&(e=l.getNumberOfLines(c,g),!(g+e>c.length)&&k)){p=m.$createParagraphNode();a.append(p);S(p,c.slice(g+1,g+e),b);l.replace(a.getLastChild(),a.getLastChild().getChildren(),k,!0);g+=e;g<d&&(l.closeRegExp&&c[g].match(l.closeRegExp)||c[g].match(l.regExp))&&g++;p=!0;break}if(p)continue;var B=h,u=a,q=b.element;k=f;e=b.textMatch;p=B.trim();let r=m.$createTextNode(p);h=m.$createParagraphNode();h.append(r);u.append(h);for(let {regExp:l,replace:n}of q)if(u=
B.match(l)){B=B.slice(u[0].length);r.setTextContent(B);n(h,[r],u,!0);break}T(r,k,e);h.isAttached()&&0<p.length&&(k=h.getPreviousSibling(),m.$isParagraphNode(k)||z.$isQuoteNode(k)||t.$isListNode(k))&&(e=k,t.$isListNode(k)&&(k=k.getLastDescendant(),e=null==k?null:aa.$findMatchingParent(k,t.$isListItemNode)),null!=e&&0<e.getTextContentSize()&&(e.splice(e.getChildrenSize(),0,[m.$createLineBreakNode(),...h.getChildren()]),h.remove()));g++}}
function ha(a){let c=I(a);return(b,d)=>{b=b.split("\n");d=d||m.$getRoot();d.clear();S(d,b,c);b=d.getChildren();for(let e of b){a:{b=e;if(!m.$isParagraphNode(b)){b=!1;break a}let f=b.getFirstChild();b=null==f||1===b.getChildrenSize()&&m.$isTextNode(f)&&fa.test(f.getTextContent())}b&&e.remove()}null!==m.$getSelection()&&d.selectEnd()}}
function T(a,c,b){var d=a.getTextContent();let e=ia(d,c);if(e){var f,g;if(e[0]===d)var h=a;else{d=e.index||0;let k=d+e[0].length;0===d?[h,f]=a.splitText(k):[g,h,f]=a.splitText(d,k)}h.setTextContent(e[2]);if(a=c.transformersByTag[e[1]])for(let k of a.format)h.hasFormat(k)||h.toggleFormat(k);h.hasFormat("code")||T(h,c,b);g&&T(g,c,b);f&&T(f,c,b)}else U(a,b)}
function U(a,c){a:for(;a;){for(let b of c){let d=a.getTextContent().match(b.importRegExp);if(!d)continue;let e=d.index||0,f=e+d[0].length,g,h,k;0===e?[g,a]=a.splitText(f):[h,g,k]=a.splitText(e,f);h&&U(h,c);k&&(a=k);b.replace(g,d);continue a}break}}
function ia(a,c){var b=a.match(c.openTagsRegExp);if(null==b)return null;for(let f of b){var d=f.replace(/^\s/,"");b=c.fullMatchRegExpByTag[d];if(null!=b&&(b=a.match(b),d=c.transformersByTag[d],null!=b&&null!=d)){if(!1!==d.intraword)return b;var {index:e=0}=b;d=a[e-1];e=a[e+b[0].length];if(!(d&&!J.test(d)||e&&!J.test(e)))return b}}return null}function V(a,c,b){let d=b.length;for(;c>=d;c--){let e=c-d;if(ja(a,e,b,0,d)&&" "!==a[e+d])return e}return-1}
function ja(a,c,b,d,e){for(let f=0;f<e;f++)if(a[c+f]!==b[d+f])return!1;return!0}
let W=a=>(c,b,d)=>{d=a(d);d.append(...b);c.replace(d);d.select(0,0)},X=a=>(c,b,d)=>{var e=c.getPreviousSibling(),f=c.getNextSibling();const g=t.$createListItemNode("check"===a?"x"===d[3]:void 0);t.$isListNode(f)&&f.getListType()===a?(e=f.getFirstChild(),null!==e?e.insertBefore(g):f.append(g),c.remove()):t.$isListNode(e)&&e.getListType()===a?(e.append(g),c.remove()):(f=t.$createListNode(a,"number"===a?Number(d[2]):void 0),f.append(g),c.replace(f));g.append(...b);g.select(0,0);(c=Math.floor(d[1].length/
4))&&g.setIndent(c)},Y=(a,c,b)=>{const d=[];var e=a.getChildren();let f=0;for(const h of e)if(t.$isListItemNode(h)){if(1===h.getChildrenSize()&&(e=h.getFirstChild(),t.$isListNode(e))){d.push(Y(e,c,b+1));continue}e=" ".repeat(4*b);var g=a.getListType();g="number"===g?`${a.getStart()+f}. `:"check"===g?`- [${h.getChecked()?"x":" "}] `:"- ";d.push(e+g+c(h));f++}return d.join("\n")},ka={dependencies:[z.HeadingNode],export:(a,c)=>{if(!z.$isHeadingNode(a))return null;const b=Number(a.getTag().slice(1));
return"#".repeat(b)+" "+c(a)},regExp:/^(#{1,6})\s/,replace:W(a=>z.$createHeadingNode("h"+a[1].length)),type:"element"},la={dependencies:[z.QuoteNode],export:(a,c)=>{if(!z.$isQuoteNode(a))return null;a=c(a).split("\n");c=[];for(const b of a)c.push("> "+b);return c.join("\n")},regExp:/^>\s/,replace:(a,c,b,d)=>{if(d&&(b=a.getPreviousSibling(),z.$isQuoteNode(b))){b.splice(b.getChildrenSize(),0,[m.$createLineBreakNode(),...c]);b.select(0,0);a.remove();return}b=z.$createQuoteNode();b.append(...c);a.replace(b);
b.select(0,0)},type:"element"},ma={dependencies:[A.CodeNode],export:a=>{if(!A.$isCodeNode(a))return null;const c=a.getTextContent();return"```"+(a.getLanguage()||"")+(c?"\n"+c:"")+"\n```"},getNumberOfLines:(a,c)=>{const b=/^```(\w{1,10})?\s?$/;let d=c;const e=a.length;for(;++d<e&&!a[d].match(b););return d-c},regExp:/^```(\w{1,10})?\s?$/,replace:W(a=>A.$createCodeNode(a?a[1]:void 0)),type:"element"},na={dependencies:[t.ListNode,t.ListItemNode],export:(a,c)=>t.$isListNode(a)?Y(a,c,0):null,regExp:/^(\s*)[-*+]\s/,
replace:X("bullet"),type:"element"},oa={dependencies:[t.ListNode,t.ListItemNode],export:(a,c)=>t.$isListNode(a)?Y(a,c,0):null,regExp:/^(\s*)(?:-\s)?\s?(\[(\s|x)?\])\s/i,replace:X("check"),type:"element"},pa={dependencies:[t.ListNode,t.ListItemNode],export:(a,c)=>t.$isListNode(a)?Y(a,c,0):null,regExp:/^(\s*)(\d{1,})\.\s/,replace:X("number"),type:"element"},qa={format:["code"],tag:"`",type:"text-format"},ra={format:["highlight"],tag:"==",type:"text-format"},sa={format:["bold","italic"],tag:"***",type:"text-format"},
ta={format:["bold","italic"],intraword:!1,tag:"___",type:"text-format"},va={format:["bold"],tag:"**",type:"text-format"},wa={format:["bold"],intraword:!1,tag:"__",type:"text-format"},xa={format:["strikethrough"],tag:"~~",type:"text-format"},ya={format:["italic"],tag:"*",type:"text-format"},za={format:["italic"],intraword:!1,tag:"_",type:"text-format"},Aa={dependencies:[G.LinkNode],export:(a,c,b)=>{if(!G.$isLinkNode(a))return null;c=(c=a.getTitle())?`[${a.getTextContent()}](${a.getURL()} "${c}")`:
`[${a.getTextContent()}](${a.getURL()})`;const d=a.getFirstChild();return 1===a.getChildrenSize()&&m.$isTextNode(d)?b(d,c):c},importRegExp:/(?:\[([^[]+)\])(?:\((?:([^()\s]+)(?:\s"((?:[^"]*\\")*[^"]*)"\s*)?)\))/,regExp:/(?:\[([^[]+)\])(?:\((?:([^()\s]+)(?:\s"((?:[^"]*\\")*[^"]*)"\s*)?)\))$/,replace:(a,c)=>{const [,b,d,e]=c;c=G.$createLinkNode(d,{title:e});const f=m.$createTextNode(b);f.setFormat(a.getFormat());c.append(f);a.replace(c)},trigger:")",type:"text-match"},Ba=[ka,la,ma,na,pa],Ca=[qa,sa,ta,
va,wa,ra,ya,za,xa],Da=[Aa],Z=[...Ba,...Ca,...Da];exports.$convertFromMarkdownString=function(a,c=Z,b){return ha(c)(a,b)};exports.$convertToMarkdownString=function(a=Z,c){return ba(a)(c)};exports.BOLD_ITALIC_STAR=sa;exports.BOLD_ITALIC_UNDERSCORE=ta;exports.BOLD_STAR=va;exports.BOLD_UNDERSCORE=wa;exports.CHECK_LIST=oa;exports.CODE=ma;exports.ELEMENT_TRANSFORMERS=Ba;exports.HEADING=ka;exports.HIGHLIGHT=ra;exports.INLINE_CODE=qa;exports.ITALIC_STAR=ya;exports.ITALIC_UNDERSCORE=za;exports.LINK=Aa;
exports.ORDERED_LIST=pa;exports.QUOTE=la;exports.STRIKETHROUGH=xa;exports.TEXT_FORMAT_TRANSFORMERS=Ca;exports.TEXT_MATCH_TRANSFORMERS=Da;exports.TRANSFORMERS=Z;exports.UNORDERED_LIST=na;exports.createBlockNode=W;
exports.registerMarkdownShortcuts=function(a,c=Z){let b=I(c),d=H(b.textFormat,({tag:f})=>f[f.length-1]),e=H(b.textMatch,({trigger:f})=>f);for(let f of c)if(c=f.type,"element"===c||"text-match"===c){c=f.dependencies;for(let g of c)if(!a.hasNode(g))throw Error(`MarkdownShortcuts: missing dependency ${g.getType()} for transformer. Ensure node dependency is included in editor initial config.`);}return a.registerUpdateListener(({tags:f,dirtyLeaves:g,editorState:h,prevEditorState:k})=>{if(!f.has("historic")&&
!a.isComposing()){var p=h.read(m.$getSelection);f=k.read(m.$getSelection);if(m.$isRangeSelection(f)&&m.$isRangeSelection(p)&&p.isCollapsed()){k=p.anchor.key;var B=p.anchor.offset,u=h._nodeMap.get(k);!m.$isTextNode(u)||!g.has(k)||1!==B&&B>f.anchor.offset+1||a.update(()=>{if(!u.hasFormat("code")){var q=u.getParent();if(null!==q&&!A.$isCodeNode(q)){var r=p.anchor.offset;b:{var l=b.element,n=q.getParent();if(m.$isRootOrShadowRoot(n)&&q.getFirstChild()===u&&(n=u.getTextContent()," "===n[r-1]))for(let {regExp:D,
replace:E}of l)if((l=n.match(D))&&l[0].length===r){n=u.getNextSiblings();let [F,ua]=u.splitText(r);F.remove();n=ua?[ua,...n]:n;E(q,n,l,!1);q=!0;break b}q=!1}if(!q){b:{l=u.getTextContent();q=e[l[r-1]];if(null!=q){r<l.length&&(l=l.slice(0,r));for(w of q)if(q=l.match(w.regExp),null!==q){l=q.index||0;n=l+q[0].length;var x=void 0;0===l?[x]=u.splitText(n):[,x]=u.splitText(l,n);x.selectNext(0,0);w.replace(x,q);var w=!0;break b}}w=!1}if(!w)b:{n=u.getTextContent();--r;var v=n[r];if(w=d[v])for(let D of w){var {tag:C}=
D;w=C.length;let E=r-w+1;if(!(1<w&&!ja(n,E,C,0,w)||" "===n[E-1])&&(x=n[r+1],!1!==D.intraword||!x||J.test(x))){q=x=u;l=V(n,E,C);for(var y=q;0>l&&(y=y.getPreviousSibling())&&!m.$isLineBreakNode(y);)m.$isTextNode(y)&&(l=y.getTextContent(),q=y,l=V(l,l.length,C));if(!(0>l||q===x&&l+w===E||(C=q.getTextContent(),0<l&&C[l-1]===v||(y=C[l-1],!1===D.intraword&&y&&!J.test(y))))){n=x.getTextContent();n=n.slice(0,E)+n.slice(r+1);x.setTextContent(n);n=q===x?n:C;q.setTextContent(n.slice(0,l)+n.slice(l+w));n=m.$getSelection();
v=m.$createRangeSelection();m.$setSelection(v);r=r-w*(q===x?2:1)+1;v.anchor.set(q.__key,l,"text");v.focus.set(x.__key,r,"text");for(let F of D.format)v.hasFormat(F)||v.formatText(F);v.anchor.set(v.focus.key,v.focus.offset,v.focus.type);for(let F of D.format)v.hasFormat(F)&&v.toggleFormat(F);m.$isRangeSelection(n)&&(v.format=n.format);break b}}}}}}}})}}})}
