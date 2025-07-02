/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
declare global {
    interface Document {
        documentMode?: unknown;
    }
    interface Window {
        MSStream?: unknown;
    }
}
export declare const IS_APPLE: boolean;
export declare const IS_FIREFOX: boolean;
export declare const CAN_USE_BEFORE_INPUT: boolean;
export declare const IS_SAFARI: boolean;
export declare const IS_IOS: boolean;
export declare const IS_ANDROID: boolean;
export declare const IS_CHROME: boolean;
export declare const IS_ANDROID_CHROME: boolean;
export declare const IS_APPLE_WEBKIT: boolean;
//# sourceMappingURL=environment.d.ts.map