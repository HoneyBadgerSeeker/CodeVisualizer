declare module 'web-tree-sitter' {
  export default Parser;
  
  class Parser {
    static init(options?: { locateFile?: (file: string) => string }): Promise<void>;
    static Language: typeof Language;
    
    constructor();
    delete(): void;
    parse(
      input: string | Parser.Input,
      oldTree?: Parser.Tree,
      options?: Parser.Options
    ): Parser.Tree;
    getLanguage(): Parser.Language;
    setLanguage(language: Parser.Language): void;
    getLogger(): Parser.Logger;
    setLogger(logger: Parser.Logger): void;
    printDotGraphs(enabled: boolean): void;
    reset(): void;
  }

  namespace Parser {
    export interface Options {
      includedRanges?: Range[];
    }

    export interface Logger {
      (message: string, params: { [param: string]: string }, type: 'parse' | 'lex'): void;
    }

    export type Input = (index: number, position?: Point) => string | null;

    export interface Point {
      row: number;
      column: number;
    }

    export interface Range {
      startIndex: number;
      endIndex: number;
      startPosition: Point;
      endPosition: Point;
    }

    export interface Edit {
      startIndex: number;
      oldEndIndex: number;
      newEndIndex: number;
      startPosition: Point;
      oldEndPosition: Point;
      newEndPosition: Point;
    }

    export class Language {
      static load(path: string): Promise<Language>;
    }

    export interface SyntaxNode {
      readonly id: number;
      readonly type: string;
      readonly typeId: number;
      readonly isNamed: boolean;
      readonly text: string;
      readonly startPosition: Point;
      readonly endPosition: Point;
      readonly startIndex: number;
      readonly endIndex: number;
      readonly parent: SyntaxNode | null;
      readonly children: SyntaxNode[];
      readonly namedChildren: SyntaxNode[];
      readonly childCount: number;
      readonly namedChildCount: number;
      readonly firstChild: SyntaxNode | null;
      readonly firstNamedChild: SyntaxNode | null;
      readonly lastChild: SyntaxNode | null;
      readonly lastNamedChild: SyntaxNode | null;
      readonly nextSibling: SyntaxNode | null;
      readonly nextNamedSibling: SyntaxNode | null;
      readonly previousSibling: SyntaxNode | null;
      readonly previousNamedSibling: SyntaxNode | null;

      hasChanges(): boolean;
      hasError(): boolean;
      isMissing(): boolean;
      isExtra(): boolean;
      toString(): string;
      child(index: number): SyntaxNode | null;
      namedChild(index: number): SyntaxNode | null;
      childForFieldName(fieldName: string): SyntaxNode | null;
      childForFieldId(fieldId: number): SyntaxNode | null;
      fieldNameForChild(childIndex: number): string | null;
      childrenForFieldName(fieldName: string): SyntaxNode[];
      childrenForFieldId(fieldId: number): SyntaxNode[];
      descendantForIndex(index: number): SyntaxNode;
      descendantForIndex(startIndex: number, endIndex: number): SyntaxNode;
      namedDescendantForIndex(index: number): SyntaxNode;
      namedDescendantForIndex(startIndex: number, endIndex: number): SyntaxNode;
      descendantForPosition(position: Point): SyntaxNode;
      descendantForPosition(startPosition: Point, endPosition: Point): SyntaxNode;
      namedDescendantForPosition(position: Point): SyntaxNode;
      namedDescendantForPosition(startPosition: Point, endPosition: Point): SyntaxNode;
      walk(): TreeCursor;
      equals(other: SyntaxNode): boolean;
      descendantsOfType(type: string | string[], startPosition?: Point, endPosition?: Point): SyntaxNode[];
    }

    export interface TreeCursor {
      readonly nodeType: string;
      readonly nodeTypeId: number;
      readonly nodeText: string;
      readonly nodeIsNamed: boolean;
      readonly startPosition: Point;
      readonly endPosition: Point;
      readonly startIndex: number;
      readonly endIndex: number;
      readonly currentNode: SyntaxNode;
      readonly currentFieldName: string | null;
      readonly currentFieldId: number;

      reset(node: SyntaxNode): void;
      delete(): void;
      gotoParent(): boolean;
      gotoFirstChild(): boolean;
      gotoFirstChildForIndex(goalIndex: number): boolean;
      gotoNextSibling(): boolean;
    }

    export interface Tree {
      readonly rootNode: SyntaxNode;
      copy(): Tree;
      delete(): void;
      edit(delta: Edit): Tree;
      walk(): TreeCursor;
      getChangedRanges(other: Tree): Range[];
      getEditedRange(other: Tree): Range;
    }

    export interface Query {
      delete(): void;
      matches(
        node: SyntaxNode,
        startPosition?: Point,
        endPosition?: Point
      ): QueryMatch[];
      captures(
        node: SyntaxNode,
        startPosition?: Point,
        endPosition?: Point
      ): QueryCapture[];
    }

    export interface QueryMatch {
      pattern: number;
      captures: QueryCapture[];
    }

    export interface QueryCapture {
      name: string;
      node: SyntaxNode;
    }
  }

  class Language {
    static load(path: string): Promise<Language>;
  }
}