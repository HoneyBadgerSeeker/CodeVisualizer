import * as path from "path";
import { CodebaseModule } from "./CodebaseAnalyzer";
import { FileTypeClassifier, EdgeType } from "./FileTypeClassifier";


export class CodebaseMermaidGenerator {
  private modules: Map<string, CodebaseModule>;
  private workspaceRoot: string;
  private namesHashMap: Map<string, string> = new Map();
  private minify: boolean = true;
  private nodeIdToModule: Map<string, CodebaseModule> = new Map();

  constructor(
    modules: Map<string, CodebaseModule>,
    workspaceRoot: string,
    minify: boolean = true
  ) {
    this.modules = modules;
    this.workspaceRoot = workspaceRoot;
    this.minify = minify;
  }


  public generate(): string {
    this.hashModuleNames();
    const subgraphs = this.convertSubgraphSources();
    const edges = this.convertEdgeSources();
    const classDefs = this.renderClassDefinitions();
    const nodeStyles = this.renderNodeStyles();
    const edgeStyles = this.renderEdgeStyles(edges);
    return `flowchart LR

${classDefs}
${this.renderSubgraphs(subgraphs)}
${this.renderEdges(edges)}
${nodeStyles}
${edgeStyles}`;
  }

  private hashModuleNames(): void {
    const base = 36;
    let count = 0;
    const allPaths = new Set<string>();

    for (const module of this.modules.values()) {
      const paths = module.relativePath.split(path.sep).filter((p) => p);

      // Add each path segment (for subgraph hierarchy)
      for (let i = 0; i < paths.length; i++) {
        const pathSegment = paths.slice(0, i + 1).join(path.sep);
        allPaths.add(pathSegment);
      }
      allPaths.add(module.relativePath);
    }

    for (const relativePath of allPaths) {
      if (!this.namesHashMap.has(relativePath)) {
        if (this.minify) {
          // Use base36 encoding, prefix with 'N' to ensure it starts with a letter
          const hashedId = "N" + count.toString(base).toUpperCase();
          this.namesHashMap.set(relativePath, hashedId);
          count++;
        } else {
          this.namesHashMap.set(relativePath, this.hashToReadableNodeName(relativePath));
        }
      }
    }

    // Also map absolute paths to their relative path hashes
    for (const [filePath, module] of this.modules.entries()) {
      const relativePath = module.relativePath;
      const hashedId = this.namesHashMap.get(relativePath);
      if (hashedId) {
        this.namesHashMap.set(filePath, hashedId);
        this.nodeIdToModule.set(hashedId, module);
      }
    }
  }

  private hashToReadableNodeName(nodeName: string): string {
    return nodeName
      .replace(/^\.$|^\.\//g, "__currentPath__")
      .replace(/^\.{2}$|^\.{2}\//g, "__prevPath__")
      .replace(/[[\]/.@~-]/g, "_");
  }

  private convertSubgraphSources(): Record<string, any> {
    const tree: Record<string, any> = {};

    for (const module of this.modules.values()) {
      const paths = module.relativePath.split(path.sep).filter((p) => p);

      // Build tree structure
      paths.reduce((children, currentPath, index) => {
        if (!children[currentPath]) {
          const nodePath = paths.slice(0, index + 1).join(path.sep);
          children[currentPath] = {
            node: this.namesHashMap.get(nodePath),
            text: currentPath,
            children: {},
          };
        }
        return children[currentPath].children;
      }, tree);
    }

    return tree;
  }

  private convertEdgeSources(): Array<{ from: { node: string; text: string }; to: { node: string; text: string } }> {
    const edges: Array<{ from: { node: string; text: string }; to: { node: string; text: string } }> = [];

    for (const [filePath, module] of this.modules.entries()) {
      const fromNode = this.namesHashMap.get(filePath);
      if (!fromNode) {
        continue;
      }

      const from = {
        node: fromNode,
        text: path.basename(module.relativePath),
      };

      for (const dep of module.dependencies) {
        if (dep.resolved && dep.valid) {
          const toNode = this.namesHashMap.get(dep.resolved);
          if (toNode) {
            const edgeExists = edges.some(
              (e) => e.from.node === fromNode && e.to.node === toNode
            );

            if (!edgeExists) {
              edges.push({
                from,
                to: {
                  node: toNode,
                  text: path.basename(dep.resolved),
                },
              });
            }
          }
        }
      }
    }

    return edges;
  }

  private renderSubgraphs(source: Record<string, any>, depth: number = 0): string {
    const indent = this.minify ? "" : "  ".repeat(depth);

    return Object.keys(source)
      .map((name) => {
        const item = source[name];
        const children = this.renderSubgraphs(item.children, depth + 1);

        if (children === "") {
          // Leaf node (file)
          return `${indent}${this.renderNode(item.node, item.text)}`;
        }

        // Subgraph (folder)
        return `${indent}subgraph ${this.renderNode(item.node, item.text)}
${children}
${indent}end`;
      })
      .join("\n");
  }

  private renderNode(nodeId: string, text: string): string {
    const escapedText = text.length > 0 ? this.escapeMermaidText(text) : " ";
    return `${nodeId}["${escapedText}"]`;
  }

  private renderEdges(edges: Array<{ from: { node: string; text: string }; to: { node: string; text: string } }>): string {
    return edges.map((edge) => `${edge.from.node}-->${edge.to.node}`).join("\n");
  }

  private escapeMermaidText(text: string): string {
    return text
      .replace(/"/g, '#quot;')
      .replace(/</g, '#60;')
      .replace(/>/g, '#62;')
      .replace(/\n/g, ' ');
  }

  private renderClassDefinitions(): string {
    // Base colors - will be overridden by CSS with VSCode theme colors
    // Stroke colors are high contrast for better visibility
    return `classDef coreStyle fill:#90EE90,stroke:#00AA00,stroke-width:2px,color:#000
classDef reportStyle fill:#FFB6C1,stroke:#CC00CC,stroke-width:2px,color:#000
classDef configStyle fill:#87CEEB,stroke:#0066FF,stroke-width:2px,color:#000
classDef toolStyle fill:#FFD700,stroke:#FF6600,stroke-width:2px,color:#000
classDef entryStyle fill:#F5F5F5,stroke:#666666,stroke-width:2px,color:#000`;
  }

  private renderNodeStyles(): string {
    let styles = "";

    for (const [nodeId, module] of this.nodeIdToModule.entries()) {
      const styleClass = this.getNodeStyleClass(module.fileCategory);
      styles += `\nclass ${nodeId} ${styleClass}`;
    }

    return styles;
  }

  private getNodeStyleClass(category: string): string {
    const styleMap: Record<string, string> = {
      core: "coreStyle",
      report: "reportStyle",
      config: "configStyle",
      tool: "toolStyle",
      entry: "entryStyle",
    };
    return styleMap[category] || "entryStyle";
  }

  private renderEdgeStyles(edges: Array<{ from: { node: string; text: string }; to: { node: string; text: string } }>): string {
    let styles = "";
    let edgeIndex = 0;

    for (const edge of edges) {
      const fromModule = this.nodeIdToModule.get(edge.from.node);
      const toModule = this.nodeIdToModule.get(edge.to.node);

      if (fromModule && toModule) {
        // Classify edge type
        const edgeType = FileTypeClassifier.classifyEdge(
          fromModule.fileCategory,
          toModule.fileCategory,
          fromModule.relativePath,
          toModule.relativePath
        );

        const edgeColor = FileTypeClassifier.getEdgeColor(edgeType);
        const edgeStyle = FileTypeClassifier.getEdgeStyle(edgeType);

        if (edgeStyle === "dashed") {
          styles += `\nlinkStyle ${edgeIndex} stroke:${edgeColor},stroke-width:2px,stroke-dasharray: 5 5`;
        } else {
          styles += `\nlinkStyle ${edgeIndex} stroke:${edgeColor},stroke-width:2px`;
        }
      } else {
        // Default style (high contrast blue)
        styles += `\nlinkStyle ${edgeIndex} stroke:#0066CC,stroke-width:2px`;
      }

      edgeIndex++;
    }

    return styles;
  }
}

