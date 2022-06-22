/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import {COMMAND_PRIORITY_EDITOR} from 'lexical';
import {MOUSE_LEAVE_COMMAND, MOUSE_OVER_COMMAND} from 'lexical/src/LexicalCommands';
import {getActiveEditorState} from 'lexical/src/LexicalUpdates';
import * as React from 'react';
import {useEffect, useState} from 'react';


export default function ShowKeyPlugin({

}): JSX.Element {
    const [editor] = useLexicalComposerContext();

    const [currentNodeKey, setCurrentNodeKey] = useState(null);
    useEffect(() => {
        return mergeRegister(
            editor.registerCommand(
                MOUSE_OVER_COMMAND,
                (event: MouseEvent) => {
                    editor.getEditorState().read(() => {
                        const editorState = getActiveEditorState()
                        for (const key of editorState._nodeMap.keys()) {
                            if (key === 'root') {
                                continue
                            }
                            const element = editor.getElementByKey(key)
                            if (element === event.target) {
                                setCurrentNodeKey(key)
                            }
                        }

                    })
                    return true;
                },
                COMMAND_PRIORITY_EDITOR,
            ),
            editor.registerCommand(
                MOUSE_LEAVE_COMMAND,
                (event: MouseEvent) => {
                    setCurrentNodeKey(undefined)
                    return true;
                },
                COMMAND_PRIORITY_EDITOR,
            )
        )
    })



    return (
        <>
            {
                currentNodeKey &&
                <div style={{'padding': '10px'}}>
                    Current hovered node key is { currentNodeKey }
                </div>
            }
        </>
    )
}
