/* eslint-disable */
import type {ConditionalValue} from '../types/index';
import type {DistributiveOmit, Pretty} from '../types/system-types';

interface QrCodeVariant {}

type QrCodeVariantMap = {
  [key in keyof QrCodeVariant]: Array<QrCodeVariant[key]>;
};

export type QrCodeVariantProps = {
  [key in keyof QrCodeVariant]?:
    | ConditionalValue<QrCodeVariant[key]>
    | undefined;
};

export interface QrCodeRecipe {
  __type: QrCodeVariantProps;
  (props?: QrCodeVariantProps): Pretty<
    Record<'root' | 'frame' | 'pattern' | 'overlay', string>
  >;
  raw: (props?: QrCodeVariantProps) => QrCodeVariantProps;
  variantMap: QrCodeVariantMap;
  variantKeys: Array<keyof QrCodeVariant>;
  splitVariantProps<Props extends QrCodeVariantProps>(
    props: Props,
  ): [
    QrCodeVariantProps,
    Pretty<DistributiveOmit<Props, keyof QrCodeVariantProps>>,
  ];
  getVariantProps: (props?: QrCodeVariantProps) => QrCodeVariantProps;
}

export declare const qrCode: QrCodeRecipe;
