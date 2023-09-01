/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var a=require("@lexical/react/LexicalComposerContext"),f=require("@lexical/react/useLexicalNodeSelection"),g=require("@lexical/utils"),k=require("lexical"),n=require("react");let p=k.createCommand("INSERT_HORIZONTAL_RULE_COMMAND");
function q({nodeKey:b}){let [d]=a.useLexicalComposerContext(),[e,l,m]=f.useLexicalNodeSelection(b),h=n.useCallback(c=>{e&&k.$isNodeSelection(k.$getSelection())&&(c.preventDefault(),c=k.$getNodeByKey(b),r(c)&&c.remove());return!1},[e,b]);n.useEffect(()=>g.mergeRegister(d.registerCommand(k.CLICK_COMMAND,c=>{let v=d.getElementByKey(b);return c.target===v?(c.shiftKey||m(),l(!e),!0):!1},k.COMMAND_PRIORITY_LOW),d.registerCommand(k.KEY_DELETE_COMMAND,h,k.COMMAND_PRIORITY_LOW),d.registerCommand(k.KEY_BACKSPACE_COMMAND,
h,k.COMMAND_PRIORITY_LOW)),[m,d,e,b,h,l]);n.useEffect(()=>{let c=d.getElementByKey(b);null!==c&&(c.className=e?"selected":"")},[d,e,b]);return null}
class t extends k.DecoratorNode{static getType(){return"horizontalrule"}static clone(b){return new t(b.__key)}static importJSON(){return u()}static importDOM(){return{hr:()=>({conversion:w,priority:0})}}exportJSON(){return{type:"horizontalrule",version:1}}exportDOM(){return{element:document.createElement("hr")}}createDOM(){return document.createElement("hr")}getTextContent(){return"\n"}isInline(){return!1}updateDOM(){return!1}decorate(){return n.createElement(q,{nodeKey:this.__key})}}
function w(){return{node:u()}}function u(){return k.$applyNodeReplacement(new t)}function r(b){return b instanceof t}exports.$createHorizontalRuleNode=u;exports.$isHorizontalRuleNode=r;exports.HorizontalRuleNode=t;exports.INSERT_HORIZONTAL_RULE_COMMAND=p
