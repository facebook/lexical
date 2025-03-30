import React from 'react';
import useModal from '../../hooks/useModal';
import {
  getBaseOptions,
  ComponentPickerMenuItem,
  ComponentPickerOption,
} from '../ComponentPickerPlugin';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$createParagraphNode, $getNearestNodeFromDOMNode} from 'lexical';

interface Props {
  draggableElement: HTMLElement | null;
  closeMenu: () => void;
  insertInPreviousBlock: boolean;
}

const FloatingComponentPickerMenu = ({
  draggableElement,
  closeMenu,
  insertInPreviousBlock,
}: Props) => {
  const [modal, showModal] = useModal();
  const [editor] = useLexicalComposerContext();

  const options = React.useMemo(() => getBaseOptions(editor, showModal), []);
  const onOptionClick = (option: ComponentPickerOption) => {
    return () => {
      if (!editor || !draggableElement) return;

      editor.update(() => {
        const node = $getNearestNodeFromDOMNode(draggableElement);
        if (!node) {
          return;
        }

        const nodeToInsert = $createParagraphNode();

        if (insertInPreviousBlock) {
          node.insertBefore(nodeToInsert);
        } else {
          node.insertAfter(nodeToInsert);
        }
        nodeToInsert.select();
      });
      option.onSelect('');
      closeMenu();
    };
  };

  return (
    <ul className="floating-component-picker-menu">
      {options.map((option, i: number) => {
        return (
          <li
            key={option.key}
            tabIndex={-1}
            ref={option.setRefElement}
            role="option"
            onClick={onOptionClick(option)}>
            {option.icon}
            <span className="text">{option.title}</span>
          </li>
        );
      })}
      {modal}
    </ul>
  );
};

export default FloatingComponentPickerMenu;
