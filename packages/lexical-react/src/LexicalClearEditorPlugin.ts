import {$ReadOnly} from 'utility-types';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  CLEAR_EDITOR_COMMAND,
  COMMAND_PRIORITY_EDITOR,
} from 'lexical';
import useLayoutEffect from 'shared/useLayoutEffect';
type Props = $ReadOnly<{
  onClear?: () => void;
}>;

export function ClearEditorPlugin({onClear}: Props): React$Node {
  const [editor] = useLexicalComposerContext();
  useLayoutEffect(() => {
    return editor.registerCommand(
      CLEAR_EDITOR_COMMAND,
      (payload) => {
        editor.update(() => {
          if (onClear == null) {
            const root = $getRoot();
            const selection = $getSelection();
            const paragraph = $createParagraphNode();
            root.clear();
            root.append(paragraph);

            if (selection !== null) {
              paragraph.select();
            }
          } else {
            onClear();
          }
        });
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor, onClear]);
  return null;
}