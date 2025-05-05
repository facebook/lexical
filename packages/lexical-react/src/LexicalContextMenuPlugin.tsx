/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

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
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getNearestNodeFromDOMNode, LexicalNode} from 'lexical';
import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  MutableRefObject,
  useEffect,
  useRef,
  useState,
} from 'react';

class MenuOption {
  key: string;
  ref?: MutableRefObject<HTMLElement | null>;

  constructor(key: string) {
    this.key = key;
    this.ref = {current: null};
    this.setRefElement = this.setRefElement.bind(this);
  }

  setRefElement(element: HTMLElement | null) {
    this.ref = {current: element};
  }
}

class ContextMenuOption extends MenuOption {
  title: string;
  disabled: boolean;
  onSelect: () => void;
  showOn?: (node: LexicalNode) => boolean;

  constructor(
    title: string,
    options: {
      disabled?: boolean;
      onSelect: () => void;
      showOn?: (node: LexicalNode) => boolean;
    },
  ) {
    super(title);
    this.title = title;
    this.disabled = options.disabled ?? false;
    this.onSelect = options.onSelect.bind(this);
    if (options.showOn) {
      this.showOn = options.showOn.bind(this);
    }
  }
}

interface Props {
  label?: string;
  nested?: boolean;
  ContextMenuItem: React.ComponentType<{
    label: string;
    disabled: boolean;
    onClick: () => void;
  }>;
  defaultOptions: ContextMenuOption[];
  conditionalOptions?: ContextMenuOption[];
}

const ContextMenu = forwardRef<
  HTMLButtonElement,
  Props & React.HTMLProps<HTMLButtonElement>
>(
  (
    {defaultOptions, conditionalOptions, className, ContextMenuItem},
    forwardedRef,
  ) => {
    const [editor] = useLexicalComposerContext();
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const listItemsRef = useRef<Array<HTMLButtonElement | null>>([]);
    const listContentRef = useRef<Array<string | null>>([]);
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

    const [renderItems, setRenderItems] = useState<JSX.Element[]>([]);

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

        let visibleConditionalItems: ContextMenuOption[] = [];
        if (conditionalOptions) {
          editor.read(() => {
            const node = $getNearestNodeFromDOMNode(e.target as Element);
            if (node) {
              visibleConditionalItems = conditionalOptions!.filter(
                (option) => option.showOn && option.showOn(node),
              );
            }
          });
        }

        const items = [...visibleConditionalItems, ...defaultOptions].map(
          (option) => {
            return (
              <ContextMenuItem
                key={option.title}
                label={option.title}
                disabled={option.disabled}
                onClick={() => option.onSelect()}
              />
            );
          },
        );

        listContentRef.current = [
          ...(Children.map([items], (child) =>
            isValidElement(child) ? child.props.label : null,
          ) as Array<string | null>),
        ];

        setRenderItems(items);

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
    }, [conditionalOptions, defaultOptions, ContextMenuItem, refs, editor]);

    return (
      <FloatingPortal>
        {isOpen && (
          <FloatingOverlay lockScroll={true}>
            <FloatingFocusManager
              context={context}
              initialFocus={refs.floating}>
              <div
                className={className}
                ref={refs.setFloating}
                style={floatingStyles}
                {...getFloatingProps()}>
                {Children.map(
                  [renderItems],
                  (child, index) =>
                    isValidElement(child) &&
                    cloneElement(
                      child,
                      getItemProps({
                        onClick() {
                          editor.update(() => {
                            child.props.onClick();
                            setIsOpen(false);
                          });
                        },
                        onMouseUp() {
                          editor.update(() => {
                            child.props.onClick();
                            setIsOpen(false);
                          });
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
  },
);

export {ContextMenu, ContextMenuOption};
