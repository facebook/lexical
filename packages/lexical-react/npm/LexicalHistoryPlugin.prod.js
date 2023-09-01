/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var c=require("@lexical/react/LexicalComposerContext"),history=require("@lexical/history"),f=require("react");function g(a,b,d=1E3){let e=f.useMemo(()=>b||history.createEmptyHistoryState(),[b]);f.useEffect(()=>history.registerHistory(a,e,d),[d,a,e])}exports.createEmptyHistoryState=history.createEmptyHistoryState;exports.HistoryPlugin=function({externalHistoryState:a}){let [b]=c.useLexicalComposerContext();g(b,a);return null}
