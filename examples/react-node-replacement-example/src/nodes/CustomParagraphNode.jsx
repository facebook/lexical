import { ParagraphNode } from "lexical";

export class CustomParagraphNode extends ParagraphNode {
  static getType() {
    return "custom-paragraph";
  }

  static clone(node) {
    return new CustomParagraphNode(node.__key);
  }

  createDOM(config) {
    const dom = super.createDOM(config);
    dom.style = "background: green";
    return dom;
  }
}
