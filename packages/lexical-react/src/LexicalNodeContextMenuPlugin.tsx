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
import {forwardRef, JSX, RefObject, useEffect, useRef, useState} from 'react';

class MenuOption {
  key: string;
  ref?: RefObject<HTMLElement | null>;

  constructor(key: string) {
    this.key = key;
    this.ref = {current: null};
    this.setRefElement = this.setRefElement.bind(this);
  }

  setRefElement(element: HTMLElement | null) {
    this.ref = {current: element};
  }
}

class NodeContextMenuOption extends MenuOption {
  type: string;
  title: string;
  icon: JSX.Element | null;
  disabled: boolean;
  $onSelect: () => void;
  $showOn?: (node: LexicalNode) => boolean;

  constructor(
    title: string,
    options: {
      disabled?: boolean;
      icon?: JSX.Element;
      $onSelect: () => void;
      $showOn?: (node: LexicalNode) => boolean;
    },
  ) {
    super(title);
    this.type = 'item';
    this.title = title;
    this.disabled = options.disabled ?? false;
    this.icon = options.icon ?? null;
    this.$onSelect = options.$onSelect;
    if (options.$showOn) {
      this.$showOn = options.$showOn;
    }
  }
}

class NodeContextMenuSeparator extends MenuOption {
  type: string;
  $showOn?: (node: LexicalNode) => boolean;

  constructor(options?: {$showOn?: (node: LexicalNode) => boolean}) {
    super('_separator');
    this.type = 'separator';
    if (options && options.$showOn) {
      this.$showOn = options.$showOn;
    }
  }
}

const ContextMenuSeparatorItem = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    disabled?: boolean;
  }
>(({className, disabled, ...props}, ref) => {
  return <hr className={className} />;
});

const ContextMenuItem = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    label?: string;
    disabled?: boolean;
    icon?: JSX.Element | null;
  }
>(({className, label, disabled, icon, ...props}, ref) => {
  return (
    <button
      {...props}
      className={className}
      ref={ref}
      role="menuitem"
      disabled={disabled}>
      {icon}
      {label}
    </button>
  );
});

type ContextMenuType = NodeContextMenuOption | NodeContextMenuSeparator;

interface MenuSeparatorType {
  className: string;
  key: string;
  type: string;
}

interface MenuItemType extends MenuSeparatorType {
  disabled: boolean;
  label: string;
  onClick: () => void;
  title: string;
}

type MenuType = MenuItemType | MenuSeparatorType;

interface Props {
  label?: string;
  nested?: boolean;
  itemClassName?: string;
  separatorClassName?: string;
  items: ContextMenuType[];
}

const NodeContextMenuPlugin = forwardRef<
  HTMLButtonElement,
  Props & React.HTMLProps<HTMLButtonElement>
>(({items, className, itemClassName, separatorClassName}, forwardedRef) => {
  const [editor] = useLexicalComposerContext();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const listItemsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const listContentRef = useRef<Array<string | null>>([]);

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

  const [renderItems, setRenderItems] = useState<MenuType[]>([]);

  useEffect(() => {
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

      let visibleItems: ContextMenuType[] = [];
      if (items) {
        editor.read(() => {
          const node = $getNearestNodeFromDOMNode(e.target as Element);
          if (node) {
            visibleItems = items!.filter((option) =>
              option.$showOn ? option.$showOn(node) : true,
            );
          }
        });
      }

      const renderableItems = visibleItems.map((option, index) => {
        if (option.type === 'separator') {
          return {
            className: separatorClassName,
            key: option.key + '-' + index,
            type: option.type,
          };
        } else {
          return {
            className: itemClassName,
            disabled: (option as NodeContextMenuOption).disabled,
            icon: (option as NodeContextMenuOption).icon,
            key: option.key,
            label: (option as NodeContextMenuOption).title,
            onClick: () =>
              editor.update(() =>
                (option as NodeContextMenuOption).$onSelect(),
              ),
            title: (option as NodeContextMenuOption).title,
            type: option.type,
          };
        }
      }) as MenuType[];

      listContentRef.current = renderableItems.map((item) => item.key);

      setRenderItems(renderableItems);

      setIsOpen(true);
    }

    return editor.registerRootListener((rootElement, prevRootElement) => {
      if (prevRootElement !== null) {
        prevRootElement.removeEventListener('contextmenu', onContextMenu);
      }
      if (rootElement !== null) {
        rootElement.addEventListener('contextmenu', onContextMenu);
      }
    });
  }, [items, itemClassName, separatorClassName, refs, editor]);

  return (
    <FloatingPortal>
      {isOpen && (
        <FloatingOverlay lockScroll={true}>
          <FloatingFocusManager context={context} initialFocus={refs.floating}>
            <div
              className={className}
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}>
              {renderItems.map((item, index) => {
                if (item.type === 'item') {
                  return (
                    <ContextMenuItem
                      {...getItemProps({
                        ...item,
                        onClick() {
                          (item as MenuItemType).onClick();
                          setIsOpen(false);
                        },
                        onMouseUp() {
                          (item as MenuItemType).onClick();
                          setIsOpen(false);
                        },
                        ref(node: HTMLButtonElement) {
                          listItemsRef.current[index] = node;
                        },
                        tabIndex: activeIndex === index ? 0 : -1,
                      })}
                      key={item.key}
                    />
                  );
                } else if (item.type === 'separator') {
                  return (
                    <ContextMenuSeparatorItem
                      {...getItemProps({
                        ...item,
                        ref(node: HTMLButtonElement) {
                          listItemsRef.current[index] = node;
                        },
                        tabIndex: activeIndex === index ? 0 : -1,
                      })}
                      key={item.key}
                    />
                  );
                }
              })}
            </div>
          </FloatingFocusManager>
        </FloatingOverlay>
      )}
    </FloatingPortal>
  );
});

export {NodeContextMenuOption, NodeContextMenuPlugin, NodeContextMenuSeparator};
