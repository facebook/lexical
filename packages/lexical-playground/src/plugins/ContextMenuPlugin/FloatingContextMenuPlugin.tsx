/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './FloatingContextMenuPlugin.css';

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
  useListNavigation,
  useRole,
  useTypeahead,
} from '@floating-ui/react';
import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useRef,
  useState,
} from 'react';

export const MenuItem = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    label: string;
    disabled?: boolean;
  }
>(({label, disabled, ...props}, ref) => {
  return (
    <button
      {...props}
      className="MenuItem"
      ref={ref}
      role="menuitem"
      disabled={disabled}>
      {label}
    </button>
  );
});

interface Props {
  label?: string;
  nested?: boolean;
}

export const Menu = forwardRef<
  HTMLButtonElement,
  Props & React.HTMLProps<HTMLButtonElement>
>(({children}, forwardedRef) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const listItemsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const listContentRef = useRef(
    Children.map(children, (child) =>
      isValidElement(child) ? child.props.label : null,
    ) as Array<string | null>,
  );
  const allowMouseUpCloseRef = useRef(false);

  const {refs, floatingStyles, context} = useFloating({
    middleware: [
      offset({alignmentAxis: 4, mainAxis: 5}),
      flip({
        fallbackPlacements: ['left-start'],
      }),
      shift({padding: 10}),
    ],
    onOpenChange: setIsOpen,
    open: isOpen,
    placement: 'right-start',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
  });

  const role = useRole(context, {role: 'menu'});
  const dismiss = useDismiss(context);
  const listNavigation = useListNavigation(context, {
    activeIndex,
    listRef: listItemsRef,
    onNavigate: setActiveIndex,
  });
  const typeahead = useTypeahead(context, {
    activeIndex,
    enabled: isOpen,
    listRef: listContentRef,
    onMatch: setActiveIndex,
  });

  const {getFloatingProps, getItemProps} = useInteractions([
    role,
    dismiss,
    listNavigation,
    typeahead,
  ]);

  useEffect(() => {
    let timeout: number;

    function onContextMenu(e: MouseEvent) {
      e.preventDefault();

      refs.setPositionReference({
        getBoundingClientRect() {
          return {
            bottom: e.clientY,
            height: 0,
            left: e.clientX,
            right: e.clientX,
            top: e.clientY,
            width: 0,
            x: e.clientX,
            y: e.clientY,
          };
        },
      });

      setIsOpen(true);
      clearTimeout(timeout);

      allowMouseUpCloseRef.current = false;
      timeout = window.setTimeout(() => {
        allowMouseUpCloseRef.current = true;
      }, 300);
    }

    function onMouseUp() {
      if (allowMouseUpCloseRef.current) {
        setIsOpen(false);
      }
    }

    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('mouseup', onMouseUp);
      clearTimeout(timeout);
    };
  }, [refs]);

  return (
    <FloatingPortal>
      {isOpen && (
        <FloatingOverlay lockScroll={true}>
          <FloatingFocusManager context={context} initialFocus={refs.floating}>
            <div
              className="ContextMenu"
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}>
              {Children.map(
                children,
                (child, index) =>
                  isValidElement(child) &&
                  cloneElement(
                    child,
                    getItemProps({
                      onClick() {
                        child.props.onClick?.();
                        setIsOpen(false);
                      },
                      onMouseUp() {
                        child.props.onClick?.();
                        setIsOpen(false);
                      },
                      ref(node: HTMLButtonElement) {
                        listItemsRef.current[index] = node;
                      },
                      tabIndex: activeIndex === index ? 0 : -1,
                    }),
                  ),
              )}
            </div>
          </FloatingFocusManager>
        </FloatingOverlay>
      )}
    </FloatingPortal>
  );
});
