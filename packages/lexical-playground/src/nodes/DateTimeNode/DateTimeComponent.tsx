/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$isDateTimeNode, type DateTimeNode, type Option, type Options, type PollNode} from './DateTimeNode';
import type {JSX} from 'react';

import {setHours, setMinutes} from 'date-fns';
import {DayPicker} from 'react-day-picker';
import 'react-day-picker/style.css';
import './DateTimeNode.css';

import {useCollaborationContext} from '@lexical/react/LexicalCollaborationContext';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalNodeSelection} from '@lexical/react/useLexicalNodeSelection';
import {mergeRegister} from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  BaseSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  NodeKey,
} from 'lexical';
import * as React from 'react';
import {useEffect, useMemo, useRef, useState} from 'react';

import joinClasses from '../../utils/joinClasses';
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingOverlay,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';

export default function DateTimeComponent({
  dateTime,
  nodeKey,
}: {
  dateTime: Date | undefined;
  nodeKey: NodeKey;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  // const totalVotes = useMemo(() => getTotalVotes(options), [options]);
  const [isNodeSelected, setNodeSelected, clearNodeSelection] =
    useLexicalNodeSelection(nodeKey);
  // const [selection, setSelection] = useState<BaseSelection | null>(null);
  const ref = useRef(null);

  // useEffect(() => {
  //   return mergeRegister(
  //     editor.registerUpdateListener(({editorState}) => {
  //       setSelection(editorState.read(() => $getSelection()));
  //     }),
  //     editor.registerCommand<MouseEvent>(
  //       CLICK_COMMAND,
  //       (payload) => {
  //         const event = payload;

  //         if (event.target === ref.current) {
  //           if (!event.shiftKey) {
  //             clearSelection();
  //           }
  //           setSelected(!isSelected);
  //           return true;
  //         }

  //         return false;
  //       },
  //       COMMAND_PRIORITY_LOW,
  //     ),
  //   );
  // }, [clearSelection, editor, isSelected, nodeKey, setSelected]);

  const withDateTimeNode = (
    cb: (node: DateTimeNode) => void,
    onUpdate?: () => void,
  ): void => {
    editor.update(
      () => {
        const node = $getNodeByKey(nodeKey);
        if ($isDateTimeNode(node)) {
          cb(node);
        }
      },
      {onUpdate},
    );
  };

  // const addOption = () => {
  //   withDateTimeNode((node) => {
  //     node.addOption(createPollOption());
  //   });
  // };

  // const isFocused = $isNodeSelection(selection) && isSelected;
  ///
  const [isOpen, setIsOpen] = useState(false);

  const {refs, floatingStyles, context} = useFloating({
    elements: {
      reference: ref.current,
    },
    middleware: [
      offset(5),
      flip({
        fallbackPlacements: ['top-start'],
      }),
      shift({padding: 10}),
    ],
    onOpenChange: setIsOpen,
    open: isOpen,
    placement: 'bottom-start',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
  });

  const role = useRole(context, {role: 'dialog'});
  const dismiss = useDismiss(context);

  const {getFloatingProps} = useInteractions([role, dismiss]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      e.preventDefault();
      setIsOpen(true);
    }

    if (!ref.current) {
      return;
    }
    ref.current.addEventListener('click', onClick);
    return () => {
      ref.current.removeEventListener('click', onClick);
    };
  }, [refs, editor]);

  ///
  const [selected, setSelected] = useState(dateTime);
  const [includeTime, setIncludeTime] = useState(false);
  const [timeValue, setTimeValue] = useState('00:00');

  const handleCheckboxChange = (event) => {
    if (event.target.checked) {
      setIncludeTime(true);
    } else {
      setIncludeTime(false);
      setTimeValue('00:00');
    }
  };

  const handleTimeChange = (e) => {
    const time = e.target.value;
    if (!selected) {
      setTimeValue(time);
      return;
    }
    const [hours, minutes] = time
      .split(':')
      .map((str: string) => parseInt(str, 10));
    const newSelectedDate = setHours(setMinutes(selected, minutes), hours);
    setSelected(newSelectedDate);
    setTimeValue(time);
  };

  const handleDaySelect = (date) => {
    withDateTimeNode((node) => {
      node.setDateTime(date);

      if (!timeValue || !date) {
        setSelected(date);
        return;
      }
      const [hours, minutes] = timeValue
        .split(':')
        .map((str) => parseInt(str, 10));
      const newDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        hours,
        minutes,
      );
      setSelected(newDate);
    });
  };

  return (
    <div style={{border: isNodeSelected ? '1px solid blue' : 'none'}}>
      <div
        className={`PlaygroundEditorTheme__dateTimePill`}
        ref={ref}
        style={{cursor: 'pointer', width: 'fit-content'}}
        >
        {dateTime?.toDateString() || 'Invalid Date'}
        </div>
        <FloatingPortal>
          {isOpen && (
            <FloatingOverlay lockScroll={true}>
              <FloatingFocusManager
                context={context}
                initialFocus={refs.floating}>
                <div
                  className={'PlaygroundEditorTheme__dateTimePicker'}
                  ref={refs.setFloating}
                  style={floatingStyles}
                  {...getFloatingProps()}
                >
                  <DayPicker
                    captionLayout="dropdown"
                    navLayout="after"
                    fixedWeeks={false}
                    showOutsideDays={false}
                    mode="single"
                    selected={selected}
                    required={true} // Ensure the date is required
                    // timeZone="BST"
                    // timeZone="UTC"
                    onSelect={handleDaySelect}
                    footer={`Selected date: ${
                      selected ? selected.toLocaleString() : 'none'
                    }`}
                  />
                  <form style={{marginBlockEnd: '1em'}}>
                    <input
                      type="checkbox"
                      id="option1"
                      name="option1"
                      value="value1"
                      checked={includeTime}
                      onChange={handleCheckboxChange}
                    />
                    <label for="option1">Add time</label>{' '}
                    <label>
                      <input
                        type="time"
                        value={timeValue}
                        onChange={handleTimeChange}
                        disabled={!includeTime}
                      />
                    </label>
                  </form>
                </div>
              </FloatingFocusManager>
            </FloatingOverlay>
          )}{' '}
        </FloatingPortal>
    </div>
  );
}
