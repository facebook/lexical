/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  CommandListenerEditorPriority,
  LexicalEditor,
  RangeSelection,
} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getSelection, $isRangeSelection} from 'lexical';
import {useEffect, useRef, useState} from 'react';

import useReport from '../hooks/useReport';

const EditorPriority: CommandListenerEditorPriority = 0;

const VOICE_COMMANDS: $ReadOnly<{
  [string]: ({editor: LexicalEditor, selection: RangeSelection}) => void,
}> = {
  '\n': ({selection}) => {
    selection.insertParagraph();
  },
  redo: ({editor}) => {
    editor.execCommand('redo');
  },
  undo: ({editor}) => {
    editor.execCommand('undo');
  },
};

export const SUPPORT_SPEECH_RECOGNITION: boolean =
  'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

function SpeechToTextPlugin(): null {
  const [editor] = useLexicalComposerContext();
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const recognition = useRef<SpeechRecognition | null>(null);
  const report = useReport();

  useEffect(() => {
    if (isEnabled && recognition.current === null) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      recognition.current.addEventListener(
        'result',
        (event: SpeechRecognitionEvent) => {
          const resultItem = event.results.item(event.resultIndex);
          const {transcript} = resultItem.item(0);
          report(transcript);

          if (!resultItem.isFinal) {
            return;
          }

          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const command = VOICE_COMMANDS[transcript.toLowerCase().trim()];
              if (command) {
                command({editor, selection});
              } else if (transcript.match(/\s*\n\s*/)) {
                selection.insertParagraph();
              } else {
                selection.insertText(transcript);
              }
            }
          });
        },
      );
    }

    if (recognition.current) {
      if (isEnabled) {
        recognition.current.start();
      } else {
        recognition.current.stop();
      }
    }

    return () => {
      if (recognition.current !== null) {
        recognition.current.stop();
      }
    };
  }, [editor, isEnabled, report]);

  useEffect(() => {
    return editor.registerCommandListener((type, payload: boolean) => {
      if (type === 'speechToText') {
        setIsEnabled(payload);
        return true;
      }
      return false;
    }, EditorPriority);
  }, [editor]);

  return null;
}

export default ((SUPPORT_SPEECH_RECOGNITION
  ? SpeechToTextPlugin
  : () => null): () => null);
