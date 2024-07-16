/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorSetOptions, EditorState} from 'lexical';

import * as React from 'react';
import {forwardRef, useCallback, useEffect, useRef, useState} from 'react';

const LARGE_EDITOR_STATE_SIZE = 1000;

export const TreeView = forwardRef<
  HTMLPreElement,
  {
    editorState: EditorState;
    treeTypeButtonClassName: string;
    timeTravelButtonClassName: string;
    timeTravelPanelButtonClassName: string;
    timeTravelPanelClassName: string;
    timeTravelPanelSliderClassName: string;
    viewClassName: string;
    generateContent: (exportDOM: boolean) => Promise<string>;
    setEditorState: (state: EditorState, options?: EditorSetOptions) => void;
    setEditorReadOnly: (isReadonly: boolean) => void;
  }
>(function TreeViewWrapped(
  {
    treeTypeButtonClassName,
    timeTravelButtonClassName,
    timeTravelPanelSliderClassName,
    timeTravelPanelButtonClassName,
    viewClassName,
    timeTravelPanelClassName,
    editorState,
    setEditorState,
    setEditorReadOnly,
    generateContent,
  },
  ref,
): JSX.Element {
  const [timeStampedEditorStates, setTimeStampedEditorStates] = useState<
    Array<[number, EditorState]>
  >([]);
  const [content, setContent] = useState<string>('');
  const [timeTravelEnabled, setTimeTravelEnabled] = useState(false);
  const [showExportDOM, setShowExportDOM] = useState(false);
  const playingIndexRef = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLimited, setIsLimited] = useState(false);
  const [showLimited, setShowLimited] = useState(false);
  const lastEditorStateRef = useRef<null | EditorState>();
  const lastGenerationID = useRef(0);

  const generateTree = useCallback(
    (exportDOM: boolean) => {
      const myID = ++lastGenerationID.current;
      generateContent(exportDOM)
        .then((treeText) => {
          if (myID === lastGenerationID.current) {
            setContent(treeText);
          }
        })
        .catch((err) => {
          if (myID === lastGenerationID.current) {
            setContent(
              `Error rendering tree: ${err.message}\n\nStack:\n${err.stack}`,
            );
          }
        });
    },
    [generateContent],
  );

  useEffect(() => {
    if (!showLimited && editorState._nodeMap.size > LARGE_EDITOR_STATE_SIZE) {
      setIsLimited(true);
      if (!showLimited) {
        return;
      }
    }

    // Prevent re-rendering if the editor state hasn't changed
    if (lastEditorStateRef.current !== editorState) {
      lastEditorStateRef.current = editorState;
      generateTree(showExportDOM);

      if (!timeTravelEnabled) {
        setTimeStampedEditorStates((currentEditorStates) => [
          ...currentEditorStates,
          [Date.now(), editorState],
        ]);
      }
    }
  }, [
    editorState,
    generateTree,
    showExportDOM,
    showLimited,
    timeTravelEnabled,
  ]);

  const totalEditorStates = timeStampedEditorStates.length;

  useEffect(() => {
    if (isPlaying) {
      let timeoutId: ReturnType<typeof setTimeout>;

      const play = () => {
        const currentIndex = playingIndexRef.current;

        if (currentIndex === totalEditorStates - 1) {
          setIsPlaying(false);
          return;
        }

        const currentTime = timeStampedEditorStates[currentIndex][0];
        const nextTime = timeStampedEditorStates[currentIndex + 1][0];
        const timeDiff = nextTime - currentTime;
        timeoutId = setTimeout(() => {
          playingIndexRef.current++;
          const index = playingIndexRef.current;
          const input = inputRef.current;

          if (input !== null) {
            input.value = String(index);
          }

          setEditorState(timeStampedEditorStates[index][1]);
          play();
        }, timeDiff);
      };

      play();

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [timeStampedEditorStates, isPlaying, totalEditorStates, setEditorState]);

  const handleExportModeToggleClick = () => {
    generateTree(!showExportDOM);
    setShowExportDOM(!showExportDOM);
  };

  return (
    <div className={viewClassName}>
      {!showLimited && isLimited ? (
        <div style={{padding: 20}}>
          <span style={{marginRight: 20}}>
            Detected large EditorState, this can impact debugging performance.
          </span>
          <button
            onClick={() => {
              setShowLimited(true);
            }}
            style={{
              background: 'transparent',
              border: '1px solid white',
              color: 'white',
              cursor: 'pointer',
              padding: 5,
            }}>
            Show full tree
          </button>
        </div>
      ) : null}
      {!showLimited ? (
        <button
          onClick={() => handleExportModeToggleClick()}
          className={treeTypeButtonClassName}
          type="button">
          {showExportDOM ? 'Tree' : 'Export DOM'}
        </button>
      ) : null}
      {!timeTravelEnabled &&
        (showLimited || !isLimited) &&
        totalEditorStates > 2 && (
          <button
            onClick={() => {
              setEditorReadOnly(true);
              playingIndexRef.current = totalEditorStates - 1;
              setTimeTravelEnabled(true);
            }}
            className={timeTravelButtonClassName}
            type="button">
            Time Travel
          </button>
        )}
      {(showLimited || !isLimited) && <pre ref={ref}>{content}</pre>}
      {timeTravelEnabled && (showLimited || !isLimited) && (
        <div className={timeTravelPanelClassName}>
          <button
            className={timeTravelPanelButtonClassName}
            onClick={() => {
              if (playingIndexRef.current === totalEditorStates - 1) {
                playingIndexRef.current = 1;
              }
              setIsPlaying(!isPlaying);
            }}
            type="button">
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <input
            className={timeTravelPanelSliderClassName}
            ref={inputRef}
            onChange={(event) => {
              const editorStateIndex = Number(event.target.value);
              const timeStampedEditorState =
                timeStampedEditorStates[editorStateIndex];

              if (timeStampedEditorState) {
                playingIndexRef.current = editorStateIndex;
                setEditorState(timeStampedEditorState[1]);
              }
            }}
            type="range"
            min="1"
            max={totalEditorStates - 1}
          />
          <button
            className={timeTravelPanelButtonClassName}
            onClick={() => {
              setEditorReadOnly(false);
              const index = timeStampedEditorStates.length - 1;
              const timeStampedEditorState = timeStampedEditorStates[index];
              setEditorState(timeStampedEditorState[1]);
              const input = inputRef.current;

              if (input !== null) {
                input.value = String(index);
              }

              setTimeTravelEnabled(false);
              setIsPlaying(false);
            }}
            type="button">
            Exit
          </button>
        </div>
      )}
    </div>
  );
});
