/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var e=require("@lexical/react/LexicalComposerContext"),f=require("react");exports.AutoFocusPlugin=function({defaultSelection:c}){let [a]=e.useLexicalComposerContext();f.useEffect(()=>{a.focus(()=>{let d=document.activeElement,b=a.getRootElement();null===b||null!==d&&b.contains(d)||b.focus({preventScroll:!0})},{defaultSelection:c})},[c,a]);return null}
