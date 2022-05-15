import type {ElementFormatType, NodeKey} from 'lexical';
type Props = Readonly<{
  children: JSX.Element | string | (JSX.Element | string)[];
  format: ElementFormatType | null;
  nodeKey: NodeKey;
}>;
declare function BlockWithAlignableContents(arg0: Props): JSX.Element;
