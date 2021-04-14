// @flow strict-local

import {useEffect} from 'react';

export default function useTypingPerfTracker(measureTypingPerf: boolean): void {
  useEffect(() => {
    if (measureTypingPerf) {
      let start = 0;
      let timerId = null;
      let log = [];
      const report = () => {
        const total = log.reduce((a, b) => a + b, 0);
        console.log('Average Typing Perf:', total / log.length + 'ms');
        log = [];
      };
      const handleBeforeInput = (event) => {
        if (timerId != null) {
          clearTimeout(timerId);
          timerId = null;
        }
        start = performance.now();
      };
      const handleInput = (event) => {
        log.push(performance.now() - start);
        timerId = setTimeout(report, 2000);
      };
      window.addEventListener('beforeinput', handleBeforeInput, true);
      window.addEventListener('input', handleInput);

      return () => {
        window.removeEventListener('beforeinput', handleBeforeInput, true);
        window.removeEventListener('input', handleInput);
      };
    }
  }, [measureTypingPerf]);
}
