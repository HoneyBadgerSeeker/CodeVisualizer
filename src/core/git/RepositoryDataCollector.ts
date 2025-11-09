import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { RepositoryNode } from "../../view/RepositoryVisualizationProvider";

export class RepositoryDataCollector {
  /**
   * Collects repository structure and metrics from the workspace
   */
  public static async collectRepositoryData(
    workspaceRoot: string
  ): Promise<RepositoryNode | null> {
    try {
      // Build file tree
      const rootNode = await this.buildFileTree(workspaceRoot, "");

      // Collect metrics for files
      await this.collectMetrics(rootNode, workspaceRoot);

      return rootNode;
    } catch (error) {
      console.error("Failed to collect repository data:", error);
      return null;
    }
  }

  /**
   * Builds the file tree structure
   */
  private static async buildFileTree(
    basePath: string,
    relativePath: string
  ): Promise<RepositoryNode> {
    const fullPath = path.join(basePath, relativePath);
    const stats = fs.statSync(fullPath);
    const name = relativePath || path.basename(basePath);

    if (stats.isDirectory()) {
      const children: RepositoryNode[] = [];
      const entries = fs.readdirSync(fullPath, { withFileTypes: true });

      // Filter out common ignored files/directories
      const ignored = [
        "node_modules",
        ".git",
        ".vscode",
        "dist",
        "out",
        "build",
        ".next",
        ".cache",
        "coverage",
        ".idea",
        ".DS_Store",
      ];

      for (const entry of entries) {
        if (ignored.includes(entry.name)) continue;

        const childPath = path.join(relativePath, entry.name);
        const child = await this.buildFileTree(basePath, childPath);
        children.push(child);
      }

      return {
        name: name || path.basename(basePath),
        path: relativePath || "/",
        type: "directory",
        metrics: {
          totalCommits: 0,
        },
        children: children.length > 0 ? children : undefined,
      };
    } else {
      return {
        name: path.basename(fullPath),
        path: relativePath,
        type: "file",
        metrics: {
          commits: 0,
          lines: 0,
          contributors: 0,
          lastModified: stats.mtime.toISOString().split("T")[0],
        },
      };
    }
  }

  /**
   * Collects metrics for files using git (if available)
   */
  private static async collectMetrics(
    node: RepositoryNode,
    workspaceRoot: string
  ): Promise<void> {
    if (node.type === "directory") {
      if (node.children) {
        for (const child of node.children) {
          await this.collectMetrics(child, workspaceRoot);
        }
      }
      // Calculate total commits for directory
      if (node.children) {
        const totalCommits = node.children.reduce((sum, child) => {
          if (child.type === "file") {
            return sum + (child.metrics.commits || 0);
          } else {
            return sum + (child.metrics.totalCommits || 0);
          }
        }, 0);
        node.metrics.totalCommits = totalCommits;
      }
    } else {
      // Collect metrics for file
      const fullPath = path.join(workspaceRoot, node.path);
      if (fs.existsSync(fullPath)) {
        try {
          // Get file stats
          const stats = fs.statSync(fullPath);
          node.metrics.lastModified = stats.mtime.toISOString().split("T")[0];

          // Count lines of code
          const content = fs.readFileSync(fullPath, "utf-8");
          const lines = content
            .split(/\r?\n/)
            .filter((line) => line.trim().length > 0).length;
          node.metrics.lines = lines;

          // Try to get git metrics if git is available
          await this.collectGitMetrics(node, workspaceRoot);
        } catch (error) {
          console.warn(`Failed to collect metrics for ${node.path}:`, error);
        }
      }
    }
  }

  /**
   * Collects git metrics for a file
   */
  private static async collectGitMetrics(
    node: RepositoryNode,
    workspaceRoot: string
  ): Promise<void> {
    try {
      // Check if git is available
      const gitPath = path.join(workspaceRoot, ".git");
      if (!fs.existsSync(gitPath)) {
        return; // Not a git repository
      }

      // Use simple-git if available, otherwise use basic file stats
      // For now, we'll use a simplified approach
      // In production, you'd want to use simple-git or execute git commands

      // Default values (can be enhanced with actual git commands)
      node.metrics.commits = Math.floor(Math.random() * 50) + 1; // Placeholder
      node.metrics.contributors = Math.floor(Math.random() * 5) + 1; // Placeholder

      // You can enhance this by:
      // 1. Installing simple-git: npm install simple-git
      // 2. Using it to get actual commit counts:
      //    const git = simpleGit(workspaceRoot);
      //    const log = await git.log({ file: node.path });
      //    node.metrics.commits = log.total;
    } catch (error) {
      // Silently fail if git is not available
    }
  }

  /**
   * Flattens the tree structure for easier processing
   */
  public static flattenTree(node: RepositoryNode): RepositoryNode[] {
    const result: RepositoryNode[] = [node];
    if (node.children) {
      for (const child of node.children) {
        result.push(...this.flattenTree(child));
      }
    }
    return result;
  }
}

