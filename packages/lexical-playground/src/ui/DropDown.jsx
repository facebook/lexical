/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import * as React from 'react';
// $FlowFixMe[cannot-resolve-module]
import {createPortal} from 'react-dom';

type DropDownContextType = {
  registerItem: (ref: React$ElementRef<React$ElementType>) => void,
};

const DropDownContext = React.createContext<DropDownContextType | null>(null);

export function DropDownItem({
  children,
  className,
  onClick,
}: {
  children: React$Node,
  className: string,
  onClick: (event: MouseEvent) => void,
}): React$Node {
  const ref = useRef<HTMLElement | null>(null);

  const dropDownContext = React.useContext(DropDownContext);

  if (dropDownContext === null) {
    throw new Error('DropDownItem must be used within a DropDown');
  }

  const {registerItem} = dropDownContext;

  useEffect(() => {
    if (ref) {
      registerItem(ref);
    }
  }, [ref, registerItem]);

  return (
    <button className={className} onClick={onClick} ref={ref}>
      {children}
    </button>
  );
}

function DropDownItems({
  children,
  dropDownRef,
  onClose,
}: {
  children: React$Node,
  dropDownRef: {current: HTMLElement | null},
  onClose: () => void,
}): React$Node {
  const [items, setItems] = useState<
    React$ElementRef<React$ElementType>[] | null,
  >(null);
  const [highlightedItem, setHighlightedItem] =
    useState<React$ElementRef<React$ElementType> | null>(null);

  const registerItem = useCallback(
    (itemRef: React$ElementRef<React$ElementType>) => {
      setItems((prev) => (prev ? [...prev, itemRef] : [itemRef]));
    },
    [setItems],
  );

  const handleKeyDown = (event) => {
    if (!items) return;

    const key = event.key;

    if (['Escape', 'ArrowUp', 'ArrowDown', 'Tab'].includes(key)) {
      event.preventDefault();
    }

    if (key === 'Escape') {
      onClose();
    } else if (key === 'ArrowUp') {
      setHighlightedItem(
        (
          prev: React$ElementRef<React$ElementType>,
        ): React$ElementRef<React$ElementType> => {
          const index = items.indexOf(prev) - 1;
          return items[index === -1 ? items.length - 1 : index];
        },
      );
    } else if (key === 'ArrowDown' || key === 'Tab') {
      setHighlightedItem(
        (
          prev: React$ElementRef<React$ElementType>,
        ): React$ElementRef<React$ElementType> =>
          items[items.indexOf(prev) + 1],
      );
    }
  };

  const contextValue = {
    registerItem,
  };

  useEffect(() => {
    if (items && !highlightedItem) {
      setHighlightedItem(items[0]);
    }

    // $FlowFixMe: I am not sure why this is wrong
    highlightedItem?.current?.focus();
  }, [items, highlightedItem]);

  return (
    <DropDownContext.Provider value={contextValue}>
      <div className="dropdown" ref={dropDownRef} onKeyDown={handleKeyDown}>
        {children}
      </div>
    </DropDownContext.Provider>
  );
}

export default function DropDown({
  buttonLabel,
  buttonAriaLabel,
  buttonClassName,
  buttonIconClassName,
  children,
}: {
  buttonAriaLabel?: string,
  buttonClassName: string,
  buttonIconClassName?: string,
  buttonLabel?: string,
  children: React.Node,
}): React$Node {
  const dropDownRef = useRef<HTMLElement | null>(null);
  const buttonRef = useRef<HTMLElement | null>(null);
  const [showDropDown, setShowDropDown] = useState(false);

  const handleClose = () => {
    setShowDropDown(false);
    buttonRef?.current?.focus();
  };

  useEffect(() => {
    const button = buttonRef.current;
    const dropDown = dropDownRef.current;

    if (showDropDown && button !== null && dropDown !== null) {
      const {top, left} = button.getBoundingClientRect();
      dropDown.style.top = `${top + 40}px`;
      dropDown.style.left = `${Math.min(
        left,
        window.innerWidth - dropDown.offsetWidth - 20,
      )}px`;
    }
  }, [dropDownRef, buttonRef, showDropDown]);

  useEffect(() => {
    const button = buttonRef.current;

    if (button !== null && showDropDown) {
      const handle = (event: MouseEvent) => {
        // $FlowFixMe: no idea why flow is complaining
        const target: HTMLElement = event.target;
        if (!button.contains(target)) {
          setShowDropDown(false);
        }
      };
      document.addEventListener('click', handle);

      return () => {
        document.removeEventListener('click', handle);
      };
    }
  }, [dropDownRef, buttonRef, showDropDown]);

  return (
    <>
      <button
        aria-label={buttonAriaLabel || buttonLabel}
        className={buttonClassName}
        onClick={() => setShowDropDown(!showDropDown)}
        ref={buttonRef}>
        {buttonIconClassName && <span className={buttonIconClassName} />}
        {buttonLabel && (
          <span className="text dropdown-button-text">{buttonLabel}</span>
        )}
        <i className="chevron-down" />
      </button>

      {showDropDown &&
        createPortal(
          <DropDownItems dropDownRef={dropDownRef} onClose={handleClose}>
            {children}
          </DropDownItems>,
          document.body,
        )}
    </>
  );
}
