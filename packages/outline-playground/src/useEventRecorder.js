// @flow

import {useEffect} from 'react';

const originalSetBaseAndExtent = Selection.prototype.setBaseAndExtent;

export default function useEventRecorder() {
  useEffect(() => {
    const lastImperativeSelection = {
      anchorNode: null,
      focusNode: null,
      anchorOffset: 0,
      focusOffset: 0,
      count: 0,
    };
    let isComposing = false;

    const onSelectionChange = (event: Event) => {
      const {
        anchorNode,
        focusNode,
        focusOffset,
        anchorOffset,
      } = window.getSelection();
      // If a selection matches the last imperative focus call, then
      // we mark these selection changes as being from that source.
      // Note: this can happen during composition.
      if (
        anchorNode === lastImperativeSelection.anchorNode &&
        anchorOffset === lastImperativeSelection.anchorOffset &&
        focusNode === lastImperativeSelection.focusNode &&
        focusOffset === lastImperativeSelection.focusOffset
      ) {
        if (lastImperativeSelection.count > 1) {
          return;
        }
        lastImperativeSelection.count++;
        // console.log(
        //   'Imperative selection',
        //   {anchorNode, focusNode, focusOffset, anchorOffset},
        //   performance.now(),
        //   {
        //     isComposing,
        //   },
        // );
        return;
      }

      // console.log(
      //   'User selection',
      //   {anchorNode, focusNode, focusOffset, anchorOffset},
      //   performance.now(),
      //   {isComposing},
      // );
    };

    const onCompositionStart = () => {
      isComposing = true;
    };

    const onCompositionEnd = () => {
      isComposing = false;
    };

    // $FlowFixMe: Flow doesn't like this
    Selection.prototype.setBaseAndExtent = function (
      anchorNode,
      anchorOffset,
      focusNode,
      focusOffset,
    ) {
      lastImperativeSelection.anchorNode = anchorNode;
      lastImperativeSelection.anchorOffset = anchorOffset;
      lastImperativeSelection.focusNode = focusNode;
      lastImperativeSelection.focusOffset = focusOffset;
      lastImperativeSelection.count = 0;
      return originalSetBaseAndExtent.call(
        this,
        anchorNode,
        anchorOffset,
        focusNode,
        focusOffset,
      );
    };
    document.addEventListener('selectionchange', onSelectionChange, true);
    document.addEventListener('compositionstart', onCompositionStart, true);
    document.addEventListener('compositionend', onCompositionEnd);

    return () => {
      // $FlowFixMe: Flow doesn't like this
      Selection.prototype.setBaseAndExtent = originalSetBaseAndExtent;
      document.removeEventListener('selectionchange', onSelectionChange, true);
      document.removeEventListener(
        'compositionstart',
        onCompositionStart,
        true,
      );
      document.removeEventListener('compositionend', onCompositionEnd);
    };
  }, []);
}
