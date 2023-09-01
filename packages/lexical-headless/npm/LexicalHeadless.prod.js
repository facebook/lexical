/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var c=require("lexical");exports.createHeadlessEditor=function(d){let a=c.createEditor(d);a._headless=!0;"registerDecoratorListener registerRootListener registerMutationListener getRootElement setRootElement getElementByKey focus blur".split(" ").forEach(b=>{a[b]=()=>{throw Error(`${b} is not supported in headless mode`);}});return a}
