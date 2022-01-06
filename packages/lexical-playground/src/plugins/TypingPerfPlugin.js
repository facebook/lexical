/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import useReport from '../hooks/useReport';

import {useEffect} from 'react';

const validInputTypes = new Set([
  'insertText',
  'insertCompositionText',
  'insertFromComposition',
  'insertLineBreak',
  'insertParagraph',
  'deleteCompositionText',
  'deleteContentBackward',
  'deleteByComposition',
  'deleteContent',
  'deleteContentForward',
  'deleteWordBackward',
  'deleteWordForward',
  'deleteHardLineBackward',
  'deleteSoftLineBackward',
  'deleteHardLineForward',
  'deleteSoftLineForward',
]);

export default function TypingPerfPlugin(): React$Node {
  const report = useReport();
  useEffect(() => {
    let start = 0;
    let timerId = null;
    let log = [];
    let invalidatingEvent = false;

    const measureEvent = function measureEvent() {
      if (timerId != null) {
        clearTimeout(timerId);
        timerId = null;
      }
      start = performance.now();
      // We use a setTimeout(0) instead of requestAnimationFrame, due to
      // inconsistencies between the sequencing of rAF in different browsers.
      window.setTimeout(() => {
        if (invalidatingEvent) {
          invalidatingEvent = false;
          return;
        }
        log.push(performance.now() - start);
      }, 0);
      timerId = setTimeout(() => {
        const total = log.reduce((a, b) => a + b, 0);
        const reportedText =
          'Typing Perf: ' + Math.round((total / log.length) * 100) / 100 + 'ms';
        report(reportedText);
        log = [];
      }, 2000);
    };
    const beforeInputHandler = function beforeInputHandler(event) {
      if (!validInputTypes.has(event.inputType) || invalidatingEvent) {
        invalidatingEvent = false;
        return;
      }
      measureEvent();
    };
    const keyDownHandler = function keyDownHandler(event) {
      const keyCode = event.keyCode;
      if (keyCode === 8 || keyCode === 13) {
        measureEvent();
      }
    };
    const pasteHandler = function pasteHandler() {
      invalidatingEvent = true;
    };
    const cutHandler = function cutHandler() {
      invalidatingEvent = true;
    };

    window.addEventListener('keydown', keyDownHandler, true);
    window.addEventListener('beforeinput', beforeInputHandler, true);
    window.addEventListener('paste', pasteHandler, true);
    window.addEventListener('cut', cutHandler, true);

    return () => {
      window.removeEventListener('keydown', keyDownHandler, true);
      window.removeEventListener('beforeinput', beforeInputHandler, true);
      window.removeEventListener('paste', pasteHandler, true);
      window.removeEventListener('cut', cutHandler, true);
    };
  }, [report]);
  return null;
}
