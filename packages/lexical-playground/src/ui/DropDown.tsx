/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as React from 'react';
import {createPortal} from 'react-dom';

import TextInput from './TextInput';

type DropDownContextType = {
  closeDropDown: () => void;
  registerItem: ((ref: React.RefObject<HTMLButtonElement>) => void) | null;
};

export const DropDownContext = React.createContext<DropDownContextType>({
  closeDropDown: () => {
    return;
  },
  registerItem: null,
});

type DropDownTextInput = {
  'data-test-id'?: string | undefined;
  label: string;
  onChange: (val: string, closeDropDown: () => void) => void;
  placeholder?: string | undefined;
  value: string;
  type: 'text';
};

type DropDrownButton = {
  children?: React.ReactNode;
  className: string;
  key?: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
  title?: string;
  type?: 'button';
};

export function DropDownItem(props: DropDrownButton | DropDownTextInput) {
  const ref = useRef<HTMLButtonElement>(null);

  const dropDownContext = React.useContext(DropDownContext);

  if (dropDownContext.registerItem === null) {
    throw new Error('DropDownItem must be used within a DropDown');
  }

  const {registerItem, closeDropDown} = dropDownContext;

  useEffect(() => {
    if (ref && ref.current && registerItem !== null) {
      registerItem(ref);
    }
  }, [ref, registerItem]);

  return (
    <>
      {props.type === 'text' ? (
        <TextInput
          label={props.label}
          onChange={(e: string) => props.onChange(e, closeDropDown)}
          value={props.value}
        />
      ) : (
        <button
          className={props.className}
          key={props.key}
          onClick={(event) => {
            props.onClick(event);
            closeDropDown();
          }}
          ref={ref}
          style={props.style ? props.style : undefined}
          title={props.title}
          type="button">
          {props.children}
        </button>
      )}
    </>
  );
}

function DropDownItems({
  children,
  dropDownRef,
  closeDropDown,
}: {
  children: React.ReactNode;
  dropDownRef: React.Ref<HTMLDivElement>;
  closeDropDown: () => void;
}) {
  const [items, setItems] = useState<React.RefObject<HTMLButtonElement>[]>();
  const [highlightedItem, setHighlightedItem] =
    useState<React.RefObject<HTMLButtonElement>>();

  const registerItem = useCallback(
    (itemRef: React.RefObject<HTMLButtonElement>) => {
      setItems((prev) => (prev ? [...prev, itemRef] : [itemRef]));
    },
    [setItems],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!items) return;

    const key = event.key;

    if (['Escape', 'ArrowUp', 'ArrowDown', 'Tab'].includes(key)) {
      event.preventDefault();
    }

    if (key === 'Escape' || key === 'Tab') {
      closeDropDown();
    } else if (key === 'ArrowUp') {
      setHighlightedItem((prev) => {
        if (!prev) return items[0];
        const index = items.indexOf(prev) - 1;
        return items[index === -1 ? items.length - 1 : index];
      });
    } else if (key === 'ArrowDown') {
      setHighlightedItem((prev) => {
        if (!prev) return items[0];
        return items[items.indexOf(prev) + 1];
      });
    }
  };

  const contextValue = useMemo(
    () => ({
      closeDropDown,
      registerItem,
    }),
    [registerItem, closeDropDown],
  );

  useEffect(() => {
    if (items && !highlightedItem) {
      setHighlightedItem(items[0]);
    }

    if (highlightedItem && highlightedItem.current) {
      highlightedItem.current.focus();
    }
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
  disabled = false,
  buttonLabel,
  buttonAriaLabel,
  buttonClassName,
  buttonIconClassName,
  children,
}: {
  disabled?: boolean;
  buttonAriaLabel?: string;
  buttonClassName: string;
  buttonIconClassName?: string;
  buttonLabel?: string;
  children: ReactNode;
}): JSX.Element {
  const dropDownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [showDropDown, setShowDropDown] = useState(false);

  const closeDropDown = () => {
    setShowDropDown(false);
    if (buttonRef.current) {
      buttonRef.current.focus();
    }
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
        const target = event.target;
        if (dropDownRef.current && dropDownRef.current.contains(target as Node))
          return;
        if (!button.contains(target as Node)) {
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
        disabled={disabled}
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
          <DropDownItems
            dropDownRef={dropDownRef}
            closeDropDown={closeDropDown}>
            {children}
          </DropDownItems>,
          document.body,
        )}
    </>
  );
}
