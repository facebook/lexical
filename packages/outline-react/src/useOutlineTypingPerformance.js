/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {useEffect} from 'react';

export default function useOutlineTypingPerfTracker(
  measureTypingPerf: boolean,
): void {
  useEffect(() => {
    if (measureTypingPerf) {
      let start = 0;
      let timerId = null;
      let log = [];
      const report = () => {
        const total = log.reduce((a, b) => a + b, 0);
        const reportedText =
          'Typing Perf: ' + Math.round((total / log.length) * 100) / 100 + 'ms';
        // eslint-disable-next-line no-console
        console.log(reportedText);
        // Show an element on the screen too :)
        const element = document.createElement('div');
        element.style.position = 'fixed';
        element.style.top = '50%';
        element.style.left = '50%';
        element.style.fontSize = '32px';
        element.style.transform = 'translate(-50%, -50px)';
        element.style.padding = '20px';
        element.style.background = 'rgba(255, 255, 255, 0.4)';
        element.style.borderRadius = '20px';
        element.textContent = reportedText;
        const body = document.body;
        if (body !== null) {
          body.appendChild(element);
          setTimeout(() => {
            body.removeChild(element);
          }, 1000);
        }
        log = [];
      };
      const handleBeforeInput = (event) => {
        if (timerId != null) {
          clearTimeout(timerId);
          timerId = null;
        }
        start = performance.now();
        setTimeout(() => {
          log.push(performance.now() - start);
        }, 0);
        timerId = setTimeout(report, 2000);
      };
      window.addEventListener('beforeinput', handleBeforeInput, true);

      return () => {
        window.removeEventListener('beforeinput', handleBeforeInput, true);
      };
    }
  }, [measureTypingPerf]);
}
