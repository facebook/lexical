/* eslint-disable */
import type {ConditionalValue} from '../types/index';
import type {DistributiveOmit, Pretty} from '../types/system-types';

interface TreeViewVariant {}

type TreeViewVariantMap = {
  [key in keyof TreeViewVariant]: Array<TreeViewVariant[key]>;
};

export type TreeViewVariantProps = {
  [key in keyof TreeViewVariant]?:
    | ConditionalValue<TreeViewVariant[key]>
    | undefined;
};

export interface TreeViewRecipe {
  __type: TreeViewVariantProps;
  (props?: TreeViewVariantProps): Pretty<
    Record<
      | 'root'
      | 'label'
      | 'tree'
      | 'item'
      | 'itemIndicator'
      | 'itemText'
      | 'branch'
      | 'branchControl'
      | 'branchTrigger'
      | 'branchContent'
      | 'branchText'
      | 'branchIndicator'
      | 'branchIndentGuide',
      string
    >
  >;
  raw: (props?: TreeViewVariantProps) => TreeViewVariantProps;
  variantMap: TreeViewVariantMap;
  variantKeys: Array<keyof TreeViewVariant>;
  splitVariantProps<Props extends TreeViewVariantProps>(
    props: Props,
  ): [
    TreeViewVariantProps,
    Pretty<DistributiveOmit<Props, keyof TreeViewVariantProps>>,
  ];
  getVariantProps: (props?: TreeViewVariantProps) => TreeViewVariantProps;
}

export declare const treeView: TreeViewRecipe;
