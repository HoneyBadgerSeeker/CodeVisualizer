import * as path from "path";

export type FileCategory = 
  | "core"           // Core logic, extract, schema, enrich, summarize
  | "report"         // Report, transform, graph operations
  | "config"         // Validate, config, CLI, utilities, indexers
  | "tool"           // Tools, cache, special interfaces
  | "entry";         // Entry points, common utilities, core components

export type EdgeType = 
  | "normal"         // Normal dependencies
  | "processing"     // Processing/extraction logic
  | "special"        // Special flows, constraints
  | "internal"       // Internal dependencies in report areas
  | "utility"        // Utility connections
  | "indirect";      // Indirect dependencies, config-related


export class FileTypeClassifier {
  public static classifyFile(
    relativePath: string,
    fileName: string
  ): FileCategory {
    const lowerPath = relativePath.toLowerCase();
    const lowerFileName = fileName.toLowerCase();

    // Entry points and common utilities (White/Grey)
    if (
      lowerFileName === "index.ts" ||
      lowerFileName === "index.js" ||
      lowerFileName === "index.tsx" ||
      lowerFileName === "index.jsx" ||
      lowerFileName === "index.mjs" ||
      lowerFileName === "__init__.py" ||
      lowerFileName.includes("files-and-dirs") ||
      lowerFileName.includes("options") ||
      lowerPath.includes("/main/") ||
      lowerPath.includes("/entry/")
    ) {
      return "entry";
    }

    // Report and transform (Light Pink/Purple)
    if (
      lowerPath.includes("/report/") ||
      lowerPath.includes("/reports/") ||
      lowerPath.includes("/transform/") ||
      lowerPath.includes("/transforms/") ||
      lowerPath.includes("/graph-") ||
      lowerFileName.includes("report") ||
      lowerFileName.includes("transform") ||
      lowerFileName.includes("consolidate") ||
      lowerFileName.includes("match-facade") ||
      lowerFileName.includes("gosubsum")
    ) {
      return "report";
    }

    // Tools and cache (Light Yellow/Orange)
    if (
      lowerPath.includes("/bin/") ||
      lowerPath.includes("/cache/") ||
      lowerPath.includes("/tools/") ||
      lowerPath.includes("/tool/") ||
      lowerFileName.includes("hotspots") ||
      lowerFileName.includes("wrap-stream") ||
      lowerFileName.includes("options-compatible")
    ) {
      return "tool";
    }

    // Config, validate, CLI, utilities (Light Blue)
    if (
      lowerPath.includes("/validate/") ||
      lowerPath.includes("/validators/") ||
      lowerPath.includes("/config/") ||
      lowerPath.includes("/configs/") ||
      lowerPath.includes("/config-") ||
      lowerPath.includes("/cli/") ||
      lowerPath.includes("/indexers/") ||
      lowerPath.includes("/performance/") ||
      lowerPath.includes("/utils/") ||
      lowerPath.includes("/util/") ||
      lowerPath.includes("/helpers/") ||
      lowerFileName.includes("validator") ||
      lowerFileName.includes("config") ||
      lowerFileName.includes("format-helpers") ||
      lowerFileName.includes("merge-configs") ||
      lowerFileName.includes("match-dependency-rule")
    ) {
      return "config";
    }

    // Core logic, extract, schema, enrich (Light Green)
    if (
      lowerPath.includes("/enrich/") ||
      lowerPath.includes("/extract/") ||
      lowerPath.includes("/schema/") ||
      lowerPath.includes("/schemas/") ||
      lowerPath.includes("/summarize/") ||
      lowerPath.includes("/acorn/") ||
      lowerPath.includes("/tsc/") ||
      lowerPath.includes("/resolve/") ||
      lowerPath.includes("/transpile/") ||
      lowerFileName.includes("extract") ||
      lowerFileName.includes("schema") ||
      lowerFileName.includes("enrich") ||
      lowerFileName.includes("summarize") ||
      lowerFileName.includes("reachable") ||
      lowerFileName.includes("derive") ||
      lowerFileName.includes("main-result-schema")
    ) {
      return "core";
    }

    return "entry";
  }

  public static getNodeStrokeColor(category: FileCategory): string {
    const strokeMap: Record<FileCategory, string> = {
      core: "#00AA00",        // Bright Green - high contrast
      report: "#CC00CC",      // Bright Magenta - high contrast
      config: "#0066FF",      // Bright Blue - high contrast
      tool: "#FF6600",       // Bright Orange - high contrast
      entry: "#666666",       // Grey - high contrast
    };
    return strokeMap[category] || strokeMap.entry;
  }

  public static classifyEdge(
    sourceCategory: FileCategory,
    targetCategory: FileCategory,
    sourcePath: string,
    targetPath: string
  ): EdgeType {
    const lowerSourcePath = sourcePath.toLowerCase();
    const lowerTargetPath = targetPath.toLowerCase();

    // Config-related edges (Light Blue/Cyan - dashed)
    if (
      sourceCategory === "config" ||
      targetCategory === "config" ||
      lowerSourcePath.includes("/config/") ||
      lowerTargetPath.includes("/config/") ||
      lowerSourcePath.includes("/cli/") ||
      lowerTargetPath.includes("/cli/")
    ) {
      return "indirect";
    }

    // Internal report dependencies (Purple - solid)
    if (sourceCategory === "report" && targetCategory === "report") {
      return "internal";
    }

    // Processing/extraction logic (Green - solid)
    if (
      (sourceCategory === "core" && targetCategory === "core") ||
      lowerSourcePath.includes("/extract/") ||
      lowerTargetPath.includes("/extract/") ||
      lowerSourcePath.includes("/enrich/") ||
      lowerTargetPath.includes("/enrich/")
    ) {
      return "processing";
    }

    // Utility connections (Brown/Orange - solid)
    if (
      sourceCategory === "tool" ||
      targetCategory === "tool" ||
      lowerSourcePath.includes("/utils/") ||
      lowerTargetPath.includes("/utils/")
    ) {
      return "utility";
    }

    // Special flows (Red - solid) - for specific constraints
    if (
      lowerSourcePath.includes("/options/") ||
      lowerTargetPath.includes("/resolve/")
    ) {
      return "special";
    }

    return "normal";
  }


  public static getEdgeColor(edgeType: EdgeType): string {
    const colorMap: Record<EdgeType, string> = {
      normal: "#0066CC",      // Bright Blue - high contrast
      processing: "#00AA00", // Bright Green - high contrast
      special: "#CC0000",      // Bright Red - high contrast
      internal: "#8B00FF",     // Bright Purple - high contrast
      utility: "#FF6600",      // Bright Orange - high contrast
      indirect: "#0099CC",    // Bright Cyan - high contrast
    };
    return colorMap[edgeType] || colorMap.normal;
  }

  public static getEdgeStyle(edgeType: EdgeType): "solid" | "dashed" {
    return edgeType === "indirect" ? "dashed" : "solid";
  }
}

