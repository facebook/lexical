/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var f=require("lexical");function g(a){let c=document.createElement("input");c.type="file";c.accept=".lexical";c.addEventListener("change",b=>{b=b.target;if(b.files){b=b.files[0];let d=new FileReader;d.readAsText(b,"UTF-8");d.onload=e=>{e.target&&a(e.target.result)}}});c.click()}
exports.exportFile=function(a,c=Object.freeze({})){var b=new Date;a={editorState:a.getEditorState(),lastSaved:b.getTime(),source:c.source||"Lexical",version:"0.12.0"};{c=`${c.fileName||b.toISOString()}.lexical`;b=document.createElement("a");let d=document.body;null!==d&&(d.appendChild(b),b.style.display="none",a=JSON.stringify(a),a=new Blob([a],{type:"octet/stream"}),a=window.URL.createObjectURL(a),b.href=a,b.download=c,b.click(),window.URL.revokeObjectURL(a),b.remove())}};
exports.importFile=function(a){g(c=>{c=JSON.parse(c);c=a.parseEditorState(JSON.stringify(c.editorState));a.setEditorState(c);a.dispatchCommand(f.CLEAR_HISTORY_COMMAND,void 0)})}
