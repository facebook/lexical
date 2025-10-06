/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  $isTextNode,
  DOMConversionMap,
  DOMExportOutputMap,
  HTMLConfig,
  isBlockDomNode,
  isHTMLElement,
  ParagraphNode,
  TextNode,
} from 'lexical';

import {parseAllowedFontSize} from './plugins/ToolbarPlugin/fontSize';
import {parseAllowedColor} from './ui/ColorPicker';

function getExtraStyles(element: HTMLElement): string {
  // Parse styles from pasted input, but only if they match exactly the
  // sort of styles that would be produced by exportDOM
  let extraStyles = '';
  const fontSize = parseAllowedFontSize(element.style.fontSize);
  const backgroundColor = parseAllowedColor(element.style.backgroundColor);
  const color = parseAllowedColor(element.style.color);
  if (fontSize !== '' && fontSize !== '15px') {
    extraStyles += `font-size: ${fontSize};`;
  }
  if (backgroundColor !== '' && backgroundColor !== 'rgb(255, 255, 255)') {
    extraStyles += `background-color: ${backgroundColor};`;
  }
  if (color !== '' && color !== 'rgb(0, 0, 0)') {
    extraStyles += `color: ${color};`;
  }
  return extraStyles;
}

function buildImportMap(): DOMConversionMap {
  const importMap: DOMConversionMap = {};

  // Wrap all TextNode importers with a function that also imports
  // the custom styles implemented by the playground
  for (const [tag, fn] of Object.entries(TextNode.importDOM() || {})) {
    importMap[tag] = (importNode) => {
      const importer = fn(importNode);
      if (!importer) {
        return null;
      }
      return {
        ...importer,
        conversion: (element) => {
          const output = importer.conversion(element);
          if (
            output === null ||
            output.forChild === undefined ||
            output.after !== undefined ||
            output.node !== null
          ) {
            return output;
          }
          const extraStyles = getExtraStyles(element);
          if (extraStyles) {
            const {forChild} = output;
            return {
              ...output,
              forChild: (child, parent) => {
                const textNode = forChild(child, parent);
                if ($isTextNode(textNode)) {
                  textNode.setStyle(textNode.getStyle() + extraStyles);
                }
                return textNode;
              },
            };
          }
          return output;
        },
      };
    };
  }

  return importMap;
}
function buildExportMap(): DOMExportOutputMap {
  return new Map([
    [
      ParagraphNode,
      (editor, target) => {
        const output = target.exportDOM(editor);
        if (isHTMLElement(output.element) && output.element.tagName === 'P') {
          const after = output.after;
          return {
            ...output,
            after: (generatedElement) => {
              if (after) {
                generatedElement = after(generatedElement);
              }
              if (
                isHTMLElement(generatedElement) &&
                generatedElement.tagName === 'P'
              ) {
                for (const childNode of generatedElement.childNodes) {
                  if (isBlockDomNode(childNode)) {
                    const div = document.createElement('div');
                    div.setAttribute('role', 'paragraph');
                    for (const attr of generatedElement.attributes) {
                      div.setAttribute(attr.name, attr.value);
                    }
                    while (generatedElement.firstChild) {
                      div.appendChild(generatedElement.firstChild);
                    }
                    return div;
                  }
                }
              }
            },
          };
        }
        return output;
      },
    ],
  ]);
}

export function buildHTMLConfig(): HTMLConfig {
  return {export: buildExportMap(), import: buildImportMap()};
}
