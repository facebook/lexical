/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var c=require("@lexical/react/LexicalComposerContext"),k=require("@lexical/table"),r=require("@lexical/utils"),v=require("lexical"),w=require("react");function x(m){let n=new URLSearchParams;n.append("code",m);for(let p=1;p<arguments.length;p++)n.append("v",arguments[p]);throw Error(`Minified Lexical error #${m}; visit https://lexical.dev/docs/error?${n} for the full message or `+"use the non-minified dev environment for full errors and additional helpful warnings.");}
exports.TablePlugin=function({hasCellMerge:m=!0,hasCellBackgroundColor:n=!0,hasTabHandler:p=!0}){let [d]=c.useLexicalComposerContext();w.useEffect(()=>{d.hasNodes([k.TableNode,k.TableCellNode,k.TableRowNode])||x(10);return d.registerCommand(k.INSERT_TABLE_COMMAND,({columns:a,rows:e,includeHeaders:h})=>{a=k.$createTableNodeWithDimensions(Number(e),Number(a),h);r.$insertNodeToNearestRoot(a);a=a.getFirstDescendant();v.$isTextNode(a)&&a.select();return!0},v.COMMAND_PRIORITY_EDITOR)},[d]);w.useEffect(()=>
{let a=new Map,e=b=>{const f=b.getKey(),l=d.getElementByKey(f);l&&!a.has(f)&&(b=k.applyTableHandlers(b,l,d,p),a.set(f,b))};d.getEditorState().read(()=>{let b=v.$nodesOfType(k.TableNode);for(let f of b)k.$isTableNode(f)&&e(f)});let h=d.registerMutationListener(k.TableNode,b=>{for(const [f,l]of b)"created"===l?d.getEditorState().read(()=>{const g=v.$getNodeByKey(f);k.$isTableNode(g)&&e(g)}):"destroyed"===l&&(b=a.get(f),void 0!==b&&(b.removeListeners(),a.delete(f)))});return()=>{h();for(let [,b]of a)b.removeListeners()}},
[d,p]);w.useEffect(()=>{if(!m)return d.registerNodeTransform(k.TableCellNode,a=>{if(1<a.getColSpan()||1<a.getRowSpan()){var [,,e]=v.DEPRECATED_$getNodeTriplet(a);[a]=v.DEPRECATED_$computeGridMap(e,a,a);let b=a.length,f=a[0].length;e=e.getFirstChild();if(!v.DEPRECATED_$isGridRowNode(e))throw Error("Expected TableNode first child to be a RowNode");let l=[];for(let g=0;g<b;g++){if(0!==g&&(e=e.getNextSibling(),!v.DEPRECATED_$isGridRowNode(e)))throw Error("Expected TableNode first child to be a RowNode");
let u=null;for(let t=0;t<f;t++){var h=a[g][t];let q=h.cell;if(h.startRow===g&&h.startColumn===t)u=q,l.push(q);else if(1<q.getColSpan()||1<q.getRowSpan())h=k.$createTableCellNode(q.__headerState),null!==u?u.insertAfter(h):r.$insertFirst(e,h)}}for(let g of l)g.setColSpan(1),g.setRowSpan(1)}})},[d,m]);w.useEffect(()=>{if(!n)return d.registerNodeTransform(k.TableCellNode,a=>{null!==a.getBackgroundColor()&&a.setBackgroundColor(null)})},[d,n,m]);return null}
