import type {LexicalEditor} from 'lexical';
import useDecorators from './shared/useDecorators';
export default function useLexicalDecorators(
  editor: LexicalEditor,
): Array<React.ReactNode> {
  return useDecorators(editor);
}