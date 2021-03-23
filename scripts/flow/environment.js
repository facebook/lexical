// @flow
'use strict';

declare var __DEV__: boolean;

declare var queueMicrotask: (fn: () => void) => void;

declare class CompositionEvent extends UIEvent {
  +data: string | null;
}

declare class StaticRange {
  +collapsed: boolean;
  +startContainer: Node;
  +endContainer: Node;
  +startOffset: number;
  +endOffset: number;
}

declare class InputEvent extends UIEvent {
  +data: string | null;
  +inputType: string;
  +isComposing: boolean;
  +getTargetRanges?: () => Array<StaticRange>;
  +dataTransfer?: DataTransfer;
}
