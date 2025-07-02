/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { PegasusRPCMessage } from '@webext-pegasus/rpc';
export type ITabIDService = typeof getTabIDService;
export declare function getTabIDService(message: PegasusRPCMessage): Promise<number>;
//# sourceMappingURL=getTabIDService.d.ts.map