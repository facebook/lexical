/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {isDOMNode} from 'lexical';
import * as React from 'react';
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {createPortal} from 'react-dom';

import {focusNearestDescendant, isKeyboardInput} from '../utils/focusUtils';

type DropDownContextType = {
  registerItem: (ref: React.RefObject<null | HTMLButtonElement>) => void;
};

const DropDownContext = React.createContext<DropDownContextType | null>(null);

const dropDownPadding = 4;

export function DropDownItem({
  children,
  className,
  onClick,
  title,
}: {
  children: React.ReactNode;
  className: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  title?: string;
}) {
  const ref = useRef<null | HTMLButtonElement>(null);

  const dropDownContext = React.useContext(DropDownContext);

  if (dropDownContext === null) {
    throw new Error('DropDownItem must be used within a DropDown');
  }

  const {registerItem} = dropDownContext;

  useEffect(() => {
    if (ref && ref.current) {
      registerItem(ref);
    }
  }, [ref, registerItem]);

  return (
    <button
      className={className}
      onClick={onClick}
      ref={ref}
      title={title}
      type="button">
      {children}
    </button>
  );
}

function DropDownItems({
  children,
  dropDownRef,
  onClose,
  autofocus,
}: {
  children: React.ReactNode;
  dropDownRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  autofocus: boolean;
}) {
  const [items, setItems] =
    useState<React.RefObject<null | HTMLButtonElement>[]>();
  const [highlightedItem, setHighlightedItem] =
    useState<React.RefObject<null | HTMLButtonElement>>();

  const registerItem = useCallback(
    (itemRef: React.RefObject<null | HTMLButtonElement>) => {
      setItems((prev) => (prev ? [...prev, itemRef] : [itemRef]));
    },
    [setItems],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const key = event.key;
    if (key === 'Escape') {
      onClose();
    }
    if (!items) {
      return;
    }

    if (['Escape', 'ArrowUp', 'ArrowDown', 'Tab'].includes(key)) {
      event.preventDefault();
    }

    if (key === 'Escape' || key === 'Tab') {
      onClose();
    } else if (key === 'ArrowUp') {
      setHighlightedItem((prev) => {
        if (!prev) {
          return items[0];
        }
        const index = items.indexOf(prev) - 1;
        return items[index === -1 ? items.length - 1 : index];
      });
    } else if (key === 'ArrowDown') {
      setHighlightedItem((prev) => {
        if (!prev) {
          return items[0];
        }
        return items[items.indexOf(prev) + 1];
      });
    }
  };

  const contextValue = useMemo(
    () => ({
      registerItem,
    }),
    [registerItem],
  );

  useEffect(() => {
    if (items && !highlightedItem) {
      setHighlightedItem(items[0]);
    }

    if (highlightedItem && highlightedItem.current) {
      highlightedItem.current.focus();
    }
  }, [items, highlightedItem]);

  useEffect(() => {
    if (autofocus && dropDownRef.current) {
      focusNearestDescendant(dropDownRef.current);
    }
  }, [autofocus, dropDownRef]);

  return (
    <DropDownContext.Provider value={contextValue}>
      <div className="dropdown" ref={dropDownRef} onKeyDown={handleKeyDown}>
        {children}
      </div>
    </DropDownContext.Provider>
  );
}

export default function DropDown({
  disabled = false,
  buttonLabel,
  buttonAriaLabel,
  buttonClassName,
  buttonIconClassName,
  children,
  stopCloseOnClickSelf,
}: {
  disabled?: boolean;
  buttonAriaLabel?: string;
  buttonClassName: string;
  buttonIconClassName?: string;
  buttonLabel?: string;
  children: ReactNode;
  stopCloseOnClickSelf?: boolean;
}): JSX.Element {
  const dropDownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [showDropDown, setShowDropDown] = useState(false);
  const [shouldAutofocus, setShouldAutofocus] = useState(false);

  const handleClose = () => {
    setShowDropDown(false);
    if (buttonRef && buttonRef.current) {
      buttonRef.current.focus();
    }
  };

  useEffect(() => {
    const button = buttonRef.current;
    const dropDown = dropDownRef.current;

    if (showDropDown && button !== null && dropDown !== null) {
      const {top, left} = button.getBoundingClientRect();
      dropDown.style.top = `${top + button.offsetHeight + dropDownPadding}px`;
      dropDown.style.left = `${Math.min(
        left,
        window.innerWidth - dropDown.offsetWidth - 20,
      )}px`;
    }
  }, [dropDownRef, buttonRef, showDropDown]);

  useEffect(() => {
    const button = buttonRef.current;

    if (button !== null && showDropDown) {
      const handle = (event: PointerEvent) => {
        const target = event.target;
        if (!isDOMNode(target)) {
          return;
        }

        const targetIsDropDownItem =
          dropDownRef.current && dropDownRef.current.contains(target);
        if (stopCloseOnClickSelf && targetIsDropDownItem) {
          return;
        }

        if (!button.contains(target)) {
          setShowDropDown(false);

          if (targetIsDropDownItem && isKeyboardInput(event)) {
            button.focus();
          }
        }
      };
      document.addEventListener('click', handle);

      return () => {
        document.removeEventListener('click', handle);
      };
    }
  }, [dropDownRef, buttonRef, showDropDown, stopCloseOnClickSelf]);

  useEffect(() => {
    const handleButtonPositionUpdate = () => {
      if (showDropDown) {
        const button = buttonRef.current;
        const dropDown = dropDownRef.current;
        if (button !== null && dropDown !== null) {
          const {top} = button.getBoundingClientRect();
          const newPosition = top + button.offsetHeight + dropDownPadding;
          if (newPosition !== dropDown.getBoundingClientRect().top) {
            dropDown.style.top = `${newPosition}px`;
          }
        }
      }
    };

    document.addEventListener('scroll', handleButtonPositionUpdate);

    return () => {
      document.removeEventListener('scroll', handleButtonPositionUpdate);
    };
  }, [buttonRef, dropDownRef, showDropDown]);

  const handleOnClick = (e: React.MouseEvent) => {
    setShowDropDown(!showDropDown);
    setShouldAutofocus(isKeyboardInput(e));
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-label={buttonAriaLabel || buttonLabel}
        className={buttonClassName}
        onClick={handleOnClick}
        ref={buttonRef}>
        {buttonIconClassName && <span className={buttonIconClassName} />}
        {buttonLabel && (
          <span className="text dropdown-button-text">{buttonLabel}</span>
        )}
        <i className="chevron-down" />
      </button>

      {showDropDown &&
        createPortal(
          <DropDownItems
            dropDownRef={dropDownRef}
            onClose={handleClose}
            autofocus={shouldAutofocus}>
            {children}
          </DropDownItems>,
          document.body,
        )}
    </>
  );
}
