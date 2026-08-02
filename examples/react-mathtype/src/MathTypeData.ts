/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export const WIRIS_FORMULA_CLASS = 'Wirisformula';
export const WIRIS_MATHML_ATTRIBUTE = 'data-mathml';
export const WIRIS_CUSTOM_EDITOR_ATTRIBUTE = 'data-custom-editor';

export type MathTypeFormula = {
  altText: string;
  customEditor: null | string;
  height: null | number;
  mathML: string;
  src: string;
  width: null | number;
};

export function parseOptionalNumber(value: string | null): null | number {
  if (value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function encodeMathML(mathML: string): string {
  const wirisPlugin = window.WirisPlugin;
  const wirisMathML =
    wirisPlugin === undefined ? undefined : wirisPlugin.MathML;
  if (wirisMathML) {
    return wirisMathML.safeXmlEncode(mathML);
  }
  return mathML
    .split('&')
    .join('\u00a7')
    .split('<')
    .join('\u00ab')
    .split('>')
    .join('\u00bb')
    .split('"')
    .join('\u00a8')
    .split("'")
    .join('`');
}

export function decodeMathML(encodedMathML: string): string {
  const wirisPlugin = window.WirisPlugin;
  const wirisMathML =
    wirisPlugin === undefined ? undefined : wirisPlugin.MathML;
  if (wirisMathML) {
    return wirisMathML.safeXmlDecode(encodedMathML);
  }
  return encodedMathML
    .split('&laquo;')
    .join('<')
    .split('&raquo;')
    .join('>')
    .split('&uml;')
    .join('"')
    .split('&quot;')
    .join('"')
    .split('\u00ab')
    .join('<')
    .split('\u00bb')
    .join('>')
    .split('\u00a8')
    .join('"')
    .split('\u00a7')
    .join('&')
    .split('`')
    .join("'");
}

export function createFormulaFromImage(
  image: HTMLImageElement,
  fallbackMathML?: string,
): MathTypeFormula {
  const encodedMathML = image.getAttribute(WIRIS_MATHML_ATTRIBUTE);
  const mathML =
    fallbackMathML ??
    (encodedMathML === null ? '' : decodeMathML(encodedMathML));
  return {
    altText: image.getAttribute('alt') ?? '',
    customEditor: image.getAttribute(WIRIS_CUSTOM_EDITOR_ATTRIBUTE),
    height: parseOptionalNumber(image.getAttribute('height')),
    mathML,
    src: image.getAttribute('src') ?? '',
    width: parseOptionalNumber(image.getAttribute('width')),
  };
}

export function createImageFromFormula(
  formula: MathTypeFormula,
): HTMLImageElement {
  const image = document.createElement('img');
  image.align = 'middle';
  image.className = WIRIS_FORMULA_CLASS;
  image.src = formula.src;
  image.alt = formula.altText;
  image.setAttribute('role', 'math');
  image.setAttribute(WIRIS_MATHML_ATTRIBUTE, encodeMathML(formula.mathML));
  if (formula.customEditor !== null) {
    image.setAttribute(WIRIS_CUSTOM_EDITOR_ATTRIBUTE, formula.customEditor);
  }
  if (formula.width !== null) {
    image.setAttribute('width', String(formula.width));
  }
  if (formula.height !== null) {
    image.setAttribute('height', String(formula.height));
  }
  image.style.maxWidth = 'none';
  return image;
}
