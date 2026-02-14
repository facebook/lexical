/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';
import type {JSX} from 'react';

import {
  $applyNodeReplacement,
  COMMAND_PRIORITY_HIGH,
  DecoratorNode,
} from 'lexical';
import * as React from 'react';

const AttachmentComponent = React.lazy(
  () => import('../nodes/AttachmentComponent'),
);

// convert base64 to Blob and create object URL
function convertBase64ToObjectURL(
  base64Data: string,
  mimeType: string,
): string {
  try {
    // Remove data URL prefix if present (e.g., "data:image/png;base64,")
    const base64String = base64Data.includes(',')
      ? base64Data.split(',')[1]
      : base64Data;

    // Convert base64 to binary
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create blob and object URL
    const blob = new Blob([bytes], {type: mimeType});
    return URL.createObjectURL(blob);
  } catch (error) {
    console.warn('Failed to convert base64 to object URL:', error);
    return base64Data; // Return original data if conversion fails
  }
}

// convert object URL to base64
async function convertObjectURLToBase64(
  objectUrl: string,
  mimeType: string,
): Promise<string> {
  try {
    // If it's already a data URL, return as is
    if (objectUrl.startsWith('data:')) {
      return objectUrl;
    }

    // If it's not a blob URL, return as is
    if (!objectUrl.startsWith('blob:')) {
      return objectUrl;
    }

    // Fetch the blob data
    const response = await fetch(objectUrl);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Ensure the data URL has the correct MIME type
        if (result.startsWith('data:') && mimeType) {
          const base64Data = result.split(',')[1];
          resolve(`data:${mimeType};base64,${base64Data}`);
        } else {
          resolve(result);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Failed to convert object URL to base64:', error);
    return objectUrl; // Return original URL if conversion fails
  }
}

export interface AttachmentPayload {
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  key?: NodeKey;
  base64Data?: string;
  attachmentId?: string;
}

export type SerializedAttachmentNode = Spread<
  {
    fileName: string;
    fileSize: number;
    fileType: string;
    fileUrl: string;
    attachmentId?: string;
  },
  SerializedLexicalNode
>;

function $convertAttachmentElement(domNode: Node): DOMConversionOutput | null {
  const element = domNode as HTMLDivElement;

  // Check AttachmentNode's unique identifier
  if (
    !element.hasAttribute('data-file-name') ||
    !element.classList.contains('AttachmentNode__container')
  ) {
    return null;
  }

  const fileName = element.getAttribute('data-file-name') || '';
  const fileSize = parseInt(element.getAttribute('data-file-size') || '0', 10);
  const fileType = element.getAttribute('data-file-type') || '';
  let fileUrl = element.getAttribute('data-file-url') || '';

  // check if all required properties are present
  if (!fileName || !fileUrl) {
    console.warn(
      'AttachmentNode conversion failed - required properties missing:',
      {
        fileName,
        fileSize,
        fileType,
        fileUrl,
      },
    );
    return null;
  }

  // Convert base64 data to object URL if it's not already a blob URL
  if (fileUrl.startsWith('data:') && !fileUrl.startsWith('blob:')) {
    fileUrl = convertBase64ToObjectURL(fileUrl, fileType);
  }

  const attachmentNode = $createAttachmentNode({
    fileName,
    fileSize,
    fileType,
    fileUrl,
  });

  return {node: attachmentNode};
}

export class AttachmentNode extends DecoratorNode<JSX.Element> {
  __fileName: string;
  __fileSize: number;
  __fileType: string;
  __fileUrl: string;
  __base64Data?: string; // Store base64 data for serialization
  __attachmentId?: string; // ID from AttachmentStore

  static getType(): string {
    return 'attachment';
  }

  static clone(node: AttachmentNode): AttachmentNode {
    const cloned = new AttachmentNode(
      node.__fileName,
      node.__fileSize,
      node.__fileType,
      node.__fileUrl,
      node.__key,
    );
    cloned.__base64Data = node.__base64Data;
    cloned.__attachmentId = node.__attachmentId;
    return cloned;
  }

  static importJSON(serializedNode: SerializedAttachmentNode): AttachmentNode {
    const {fileName, fileSize, fileType, fileUrl, attachmentId} =
      serializedNode;

    // Convert base64 data to object URL for editor use
    const convertedFileUrl = fileUrl.startsWith('data:')
      ? convertBase64ToObjectURL(fileUrl, fileType)
      : fileUrl;

    const node = $createAttachmentNode({
      attachmentId,
      fileName,
      fileSize,
      fileType,
      fileUrl: convertedFileUrl,
    });

    // Store original base64 data for serialization
    if (fileUrl.startsWith('data:')) {
      node.__base64Data = fileUrl;
    }

    return node;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('div');
    element.className = 'AttachmentNode__container';
    element.setAttribute('data-file-name', this.__fileName);
    element.setAttribute('data-file-size', this.__fileSize.toString());
    element.setAttribute('data-file-type', this.__fileType);

    // Use base64 data for DOM export if available, otherwise use current fileUrl
    const exportFileUrl = this.__base64Data || this.__fileUrl;
    element.setAttribute('data-file-url', exportFileUrl);

    return {element};
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (node: Node) => {
        const element = node as HTMLDivElement;
        // Check AttachmentNode's unique identifier and set high priority
        if (
          element.hasAttribute('data-file-name') &&
          element.classList.contains('AttachmentNode__container')
        ) {
          return {
            conversion: $convertAttachmentElement,
            // Higher priority than LayoutContainerNode(2), LayoutItemNode(2)
            priority: COMMAND_PRIORITY_HIGH,
          };
        }
        return null;
      },
    };
  }

  constructor(
    fileName: string,
    fileSize: number,
    fileType: string,
    fileUrl: string,
    key?: NodeKey,
  ) {
    super(key);
    this.__fileName = fileName;
    this.__fileSize = fileSize;
    this.__fileType = fileType;
    this.__fileUrl = fileUrl;
    this.__base64Data = undefined;
  }

  exportJSON(): SerializedAttachmentNode {
    // Use base64 data for serialization if available, otherwise use current fileUrl
    const exportFileUrl = this.__base64Data || this.getFileUrl();

    return {
      ...super.exportJSON(),
      attachmentId: this.__attachmentId,
      fileName: this.getFileName(),
      fileSize: this.getFileSize(),
      fileType: this.getFileType(),
      fileUrl: exportFileUrl,
    };
  }

  // View

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    const theme = config.theme;
    const className = theme.attachment;
    if (className !== undefined) {
      span.className = className;
    }
    return span;
  }

  updateDOM(): false {
    return false;
  }

  getFileName(): string {
    return this.__fileName;
  }

  getFileSize(): number {
    return this.__fileSize;
  }

  getFileType(): string {
    return this.__fileType;
  }

  getFileUrl(): string {
    return this.__fileUrl;
  }

  setFileName(fileName: string): void {
    const writable = this.getWritable();
    writable.__fileName = fileName;
  }

  setFileSize(fileSize: number): void {
    const writable = this.getWritable();
    writable.__fileSize = fileSize;
  }

  setFileType(fileType: string): void {
    const writable = this.getWritable();
    writable.__fileType = fileType;
  }

  setFileUrl(fileUrl: string): void {
    const writable = this.getWritable();
    writable.__fileUrl = fileUrl;
  }

  getBase64Data(): string | undefined {
    return this.__base64Data;
  }

  setBase64Data(base64Data: string | undefined): void {
    const writable = this.getWritable();
    writable.__base64Data = base64Data;
  }

  getAttachmentId(): string | undefined {
    return this.__attachmentId;
  }

  setAttachmentId(attachmentId: string | undefined): void {
    const writable = this.getWritable();
    writable.__attachmentId = attachmentId;
  }

  // Convert current object URL to base64 and store it
  async convertToBase64(): Promise<void> {
    if (this.__fileUrl.startsWith('blob:')) {
      try {
        const base64Data = await convertObjectURLToBase64(
          this.__fileUrl,
          this.__fileType,
        );
        const writable = this.getWritable();
        writable.__base64Data = base64Data;
      } catch (error) {
        console.warn('Failed to convert attachment to base64:', error);
      }
    }
  }

  decorate(): JSX.Element {
    return (
      <AttachmentComponent
        fileName={this.__fileName}
        fileSize={this.__fileSize}
        fileType={this.__fileType}
        fileUrl={this.__fileUrl}
        nodeKey={this.getKey()}
      />
    );
  }
}

export function $createAttachmentNode({
  fileName,
  fileSize,
  fileType,
  fileUrl,
  base64Data,
  attachmentId,
  key,
}: AttachmentPayload): AttachmentNode {
  const node = $applyNodeReplacement(
    new AttachmentNode(fileName, fileSize, fileType, fileUrl, key),
  );

  // Set base64 data if provided
  if (base64Data) {
    node.__base64Data = base64Data;
  }

  // Set attachment ID if provided
  if (attachmentId) {
    node.__attachmentId = attachmentId;
  }

  return node;
}

export function $isAttachmentNode(
  node: LexicalNode | null | undefined,
): node is AttachmentNode {
  return node instanceof AttachmentNode;
}
