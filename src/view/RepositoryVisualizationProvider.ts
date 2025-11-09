import * as vscode from "vscode";
import { EnvironmentDetector } from "../core/utils/EnvironmentDetector";

export interface RepositoryNode {
  name: string;
  path: string;
  type: "file" | "directory";
  metrics: {
    commits?: number;
    lines?: number;
    contributors?: number;
    lastModified?: string;
    totalCommits?: number;
  };
  children?: RepositoryNode[];
}

export class RepositoryVisualizationProvider {
  private _panel?: vscode.WebviewPanel;
  private static _instance?: RepositoryVisualizationProvider;
  private _disposables: vscode.Disposable[] = [];

  public static getInstance(
    extensionUri: vscode.Uri
  ): RepositoryVisualizationProvider {
    if (!RepositoryVisualizationProvider._instance) {
      RepositoryVisualizationProvider._instance =
        new RepositoryVisualizationProvider(extensionUri);
    }
    return RepositoryVisualizationProvider._instance;
  }

  public static reset(): void {
    if (RepositoryVisualizationProvider._instance) {
      RepositoryVisualizationProvider._instance.dispose();
      RepositoryVisualizationProvider._instance = undefined;
    }
  }

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public createOrShow(
    viewColumn?: vscode.ViewColumn,
    repositoryData?: RepositoryNode
  ): void {
    if (this._panel) {
      this._panel.reveal(viewColumn);
      if (repositoryData) {
        this.updateRepositoryData(repositoryData);
      }
      return;
    }

    const baseOptions = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
      retainContextWhenHidden: true,
      enableFindWidget: false,
      enableCommandUris: true,
    };

    this._panel = vscode.window.createWebviewPanel(
      "codevisualizer.repositoryView",
      "📁 Repository Visualization",
      viewColumn || vscode.ViewColumn.Two,
      EnvironmentDetector.getWebviewPanelOptions(baseOptions)
    );

    this._panel.iconPath = {
      light: vscode.Uri.joinPath(this._extensionUri, "media", "icon.png"),
      dark: vscode.Uri.joinPath(this._extensionUri, "media", "icon.png"),
    };

    this._panel.onDidDispose(
      () => {
        this._panel = undefined;
        RepositoryVisualizationProvider._instance = undefined;
      },
      null,
      this._disposables
    );

    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "fileClicked":
            if (message.path) {
              const uri = vscode.Uri.file(message.path);
              try {
                const doc = await vscode.workspace.openTextDocument(uri);
                await vscode.window.showTextDocument(doc);
              } catch (error) {
                vscode.window.showErrorMessage(
                  `Could not open file: ${message.path}`
                );
              }
            }
            break;
          case "refresh":
            this.refresh();
            break;
        }
      },
      null,
      this._disposables
    );

    // Initial content
    this.setWebviewContent(repositoryData);
  }

  public updateRepositoryData(data: RepositoryNode): void {
    if (this._panel) {
      this._panel.webview.postMessage({
        command: "updateRepository",
        data: data,
      });
    }
  }

  public refresh(): void {
    // Trigger refresh in extension
    vscode.commands.executeCommand("codevisualizer.refreshRepository");
  }

  private setWebviewContent(repositoryData?: RepositoryNode): void {
    if (!this._panel) return;

    const nonce = this.getNonce();
    const theme =
      vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark
        ? "dark"
        : "light";

    this._panel.webview.html = this.getWebviewHtml(
      nonce,
      theme,
      repositoryData
    );
  }

  private getWebviewHtml(
    nonce: string,
    theme: string,
    repositoryData?: RepositoryNode
  ): string {
    const csp = EnvironmentDetector.getContentSecurityPolicy(nonce);
    const initialData = repositoryData
      ? JSON.stringify(repositoryData)
      : "null";

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="${csp}">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Repository Visualization</title>
    <script nonce="${nonce}" src="https://cdn.jsdelivr.net/npm/d3@7.8.5/dist/d3.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body, html {
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: radial-gradient(ellipse at center, #0a0e1a 0%, #000000 100%);
            color: #f1f5f9;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        }
        
        svg {
            background: transparent;
        }

        #container {
            width: 100%;
            height: 100%;
            position: relative;
        }

        #controls {
            position: absolute;
            top: 20px;
            left: 20px;
            z-index: 1000;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .control-btn.paused {
            background-color: #f59e0b;
        }

        .control-btn {
            background-color: #1e293b;
            color: #f1f5f9;
            border: 1px solid #334155;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
        }

        .control-btn:hover {
            background-color: #334155;
            border-color: #475569;
        }

        .control-btn:active {
            transform: scale(0.95);
        }

        #tooltip {
            position: absolute;
            top: 20px;
            right: 20px;
            background-color: #1e293b;
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 16px;
            min-width: 250px;
            display: none;
            z-index: 1001;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        #tooltip.visible {
            display: block;
        }

        .tooltip-title {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 12px;
            color: #3b82f6;
            border-bottom: 1px solid #334155;
            padding-bottom: 8px;
        }

        .tooltip-metric {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            font-size: 12px;
        }

        .tooltip-label {
            color: #94a3b8;
        }

        .tooltip-value {
            color: #f1f5f9;
            font-weight: 600;
        }

        .tooltip-value.commits {
            color: #3b82f6;
        }

        .tooltip-value.lines {
            color: #10b981;
        }

        .tooltip-value.contributors {
            color: #8b5cf6;
        }

        svg {
            width: 100%;
            height: 100%;
        }

        .link {
            fill: none;
            stroke-linecap: round;
        }

        .node {
            cursor: pointer;
        }

        .node.directory {
            cursor: grab;
        }

        .node.directory:active {
            cursor: grabbing;
        }

        .node-label {
            font-size: 10px;
            fill: #94a3b8;
            text-anchor: middle;
            pointer-events: none;
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
        }

        .node-label.directory {
            font-size: 11px;
            font-weight: 600;
            fill: #cbd5e1;
        }

        .node-label.hidden {
            display: none;
        }
    </style>
</head>
<body>
        <div id="container">
        <div id="controls">
            <button class="control-btn" id="pause-resume">⏸️ Pause</button>
            <button class="control-btn" id="restart">🔄 Restart</button>
            <button class="control-btn" id="reset-view">🎯 Reset View</button>
            <button class="control-btn" id="toggle-labels">📝 Toggle Labels</button>
        </div>
        <div id="tooltip"></div>
        <svg id="visualization"></svg>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        let repositoryData = ${initialData};
        let showLabels = true;

        // Initialize visualization
        const width = window.innerWidth;
        const height = window.innerHeight;
        const centerX = width / 2;
        const centerY = height / 2;

        const svg = d3.select("#visualization")
            .attr("width", width)
            .attr("height", height);

        const g = svg.append("g");

        // Zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });

        svg.call(zoom);

            // Auto-fit after load - fit to radial tree (center-based)
        setTimeout(() => {
            const bounds = g.node().getBBox();
            if (bounds.width > 0 && bounds.height > 0) {
                const scale = 0.85 / Math.max(
                    bounds.width / width,
                    bounds.height / height
                );
                // Center the tree
                const translate = [
                    width / 2 - scale * (bounds.x + bounds.width / 2),
                    height / 2 - scale * (bounds.y + bounds.height / 2)
                ];
                
                svg.transition()
                    .duration(750)
                    .call(zoom.transform,
                        d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
                    );
            }
        }, 1500);

        // Handle window resize
        window.addEventListener("resize", () => {
            const newWidth = window.innerWidth;
            const newHeight = window.innerHeight;
            svg.attr("width", newWidth).attr("height", newHeight);
        });

        // Build hierarchy and calculate RADIAL TREE layout (True Gource-style)
        function buildRadialTreeLayout(data) {
            if (!data) return null;

            // Build hierarchy
            const root = d3.hierarchy(data, d => d.children);
            
            // Calculate EXPANSIVE spacing - larger to prevent clustering and overlap
            const totalNodes = root.descendants().length;
            const baseRadius = Math.max(250, Math.min(400, 200 + totalNodes * 3)); // 250-400px base (much larger)
            const depthRadius = Math.max(300, Math.min(450, 250 + totalNodes * 2)); // 300-450px per level (much larger)
            
            // Calculate radial tree positions
            function calculateRadialPosition(node, parentAngle, angleSpan, baseRadius, depthRadius) {
                const depth = node.depth;
                
                if (depth === 0) {
                    // Root at center
                    node.x = centerX;
                    node.y = centerY;
                    node.angle = 0;
                    node.radius = 0;
                } else {
                    // Calculate angle for this node
                    const siblings = node.parent ? node.parent.children : [node];
                    const indexInSiblings = siblings.indexOf(node);
                    const siblingCount = siblings.length;
                    
                    // Distribute siblings within angle span
                    const angleStep = siblingCount > 1 ? angleSpan / (siblingCount - 1) : 0;
                    const angle = parentAngle - angleSpan / 2 + (angleStep * indexInSiblings);
                    
                    // Distance from center based on depth - with variation
                    const baseDistance = baseRadius + depth * depthRadius;
                    
                    // For files, position them around parent directory instead of radial from center
                    if (node.data.type === 'file' && node.parent) {
                        // Files will be positioned by fileCluster force around parent
                        // Initialize near parent with some offset
                        const parentAngle = node.parent.angle || angle;
                        const fileIndex = node.parent.children ? 
                            node.parent.children.filter(c => c.data.type === 'file').indexOf(node) : 0;
                        const totalFiles = node.parent.children ? 
                            node.parent.children.filter(c => c.data.type === 'file').length : 1;
                        
                        // Distribute files evenly around parent
                        const fileAngle = parentAngle + (fileIndex / totalFiles) * Math.PI * 2;
                        const fileDist = 100;  // Initial distance from parent - closer to parent
                        
                        // Calculate parent position first
                        const parentDepth = node.parent.depth;
                        const parentBaseDist = baseRadius + parentDepth * depthRadius;
                        const parentX = centerX + parentBaseDist * Math.cos(parentAngle);
                        const parentY = centerY + parentBaseDist * Math.sin(parentAngle);
                        
                        // Position file around parent
                        node.x = parentX + fileDist * Math.cos(fileAngle);
                        node.y = parentY + fileDist * Math.sin(fileAngle);
                        node.angle = fileAngle;
                        node.radius = Math.sqrt(Math.pow(node.x - centerX, 2) + Math.pow(node.y - centerY, 2));
                    } else {
                        // Directories: radial from center
                        const variation = (Math.random() - 0.5) * 80;
                        const radius = Math.min(
                            baseDistance + variation,
                            1500  // Max 1500px from center
                        );
                        
                        // Calculate position
                        node.x = centerX + radius * Math.cos(angle);
                        node.y = centerY + radius * Math.sin(angle);
                        node.angle = angle;
                        node.radius = radius;
                    }
                }
                
                // Recursively position children
                if (node.children && node.children.length > 0) {
                    const childAngleSpan = Math.min(angleSpan * 1.5, Math.PI * 2 / 3); // Max 120° per branch
                    const childAngleStep = childAngleSpan / node.children.length;
                    
                    node.children.forEach((child, i) => {
                        const childAngle = node.angle - childAngleSpan / 2 + (childAngleStep * i) + childAngleStep / 2;
                        calculateRadialPosition(child, childAngle, childAngleStep, baseRadius, depthRadius);
                    });
                }
            }
            
            // Start with full 360° span for root's children
            if (root.children && root.children.length > 0) {
                const totalAngleSpan = Math.PI * 2;
                const anglePerChild = totalAngleSpan / root.children.length;
                
                root.children.forEach((child, i) => {
                    const childAngle = (i * anglePerChild) - Math.PI / 2; // Start from top
                    calculateRadialPosition(child, childAngle, anglePerChild, baseRadius, depthRadius);
                });
            }
            
            // Store tree positions for force simulation
            root.each(d => {
                d.treeX = d.x;
                d.treeY = d.y;
                d.treeAngle = d.angle || Math.atan2(d.y - centerY, d.x - centerX);
                d.treeRadius = d.radius || Math.sqrt(Math.pow(d.x - centerX, 2) + Math.pow(d.y - centerY, 2));
            });

            return root;
        }

        // Calculate node importance and radius
        function calculateNodeProperties(node) {
            if (node.data.type === 'directory') {
                // Directory radius - fixed moderate size (not based on size)
                // All directories have a consistent, moderate size
                const radius = node.depth === 0 ? 20 : 15;  // Root: 20px, others: 15px
                
                return {
                    radius: radius,
                    importance: 0,
                    color: '#3b82f6'
                };
            }

            // For files: radius based directly on lines of code (size)
            const metrics = node.data.metrics || {};
            const lines = metrics.lines || 0;
            const size = node.data.size || lines || 0;  // Use size if available, fallback to lines
            
            // Calculate radius based on lines of code
            // Using CodeFlower formula: Math.pow(size, 2/5) with scaling
            // Scale factor to make nodes more visible
            let radius;
            if (size === 0) {
                radius = 4;  // Minimum size for files with no lines
            } else {
                // Use power function similar to CodeFlower: size^(2/5) with scaling
                // Scale by 0.8 to make it more visible, then add minimum
                radius = Math.max(4, Math.min(30, Math.pow(size, 2/5) * 0.8 + 2));
            }

            // File type color
            const filename = node.data.name.toLowerCase();
            let color = '#8b5cf6'; // Default purple
            
            if (filename.endsWith('.ts') || filename.endsWith('.tsx')) color = '#3178c6';
            else if (filename.endsWith('.js') || filename.endsWith('.jsx')) color = '#f7df1e';
            else if (filename.endsWith('.md')) color = '#00d8ff';
            else if (filename.endsWith('.json')) color = '#5cdb95';
            else if (filename.endsWith('.css') || filename.endsWith('.scss')) color = '#ff6b9d';
            else if (filename.endsWith('.html')) color = '#e44d26';
            else if (filename.endsWith('.py')) color = '#3776ab';
            else if (filename.endsWith('.java')) color = '#ea2d2e';

            // Calculate importance for reference (not used for radius anymore)
            const commits = metrics.commits || 0;
            const contributors = metrics.contributors || 0;
            const importance = Math.min(100,
                (commits * 1.5) +
                (lines / 100) +
                (contributors * 8)
            );

            return { radius, importance, color };
        }

        // Force simulation setup - RADIAL TREE with bloom effects
        let simulation = null;

        function setupForceSimulation(root, nodes, links) {
            // Stop existing simulation if any
            if (simulation) {
                simulation.stop();
            }

            // Fix root at center
            const rootNode = nodes.find(d => d.depth === 0);
            if (rootNode) {
                rootNode.fx = centerX;
                rootNode.fy = centerY;
            }
            
            // Create force simulation - WEAK center pull, STRONG outward push
            simulation = d3.forceSimulation(nodes)
                // WEAK link force - don't pull too much
                .force("link", d3.forceLink(links)
                    .id(d => d.data.path)
                    .distance(d => {
                        // For file nodes, maintain fixed distance from parent - closer
                        if (d.target.data.type === 'file') {
                            return 100;  // Fixed 100px from parent directory (closer)
                        }
                        // Longer distances for directory connections
                        if (d.source.depth === 0) return 300;  // Root to dirs: 300px (increased)
                        if (d.target.data.type === 'directory') return 250;  // Dir to dir: 250px (increased)
                        return 200;  // Increased
                    })
                    .strength(d => {
                        // Stronger link for files to keep them around parent
                        if (d.target.data.type === 'file') {
                            return 0.4;  // Moderate strength to maintain distance
                        }
                        // VERY weak link strength for directories
                        if (d.source.depth === 0) return 0.2;  // Root links slightly stronger
                        return 0.05;  // Everything else VERY weak
                    })
                )
                // STRONG repulsion - push nodes apart, especially between different clusters
                .force("charge", d3.forceManyBody()
                    .strength(d => {
                        // Much stronger repulsion
                        if (d.depth === 0) return -3000;  // Root pushes HARD
                        if (d.data.type === 'directory') return -2000;  // Dirs push harder
                        return -1200;  // Files push stronger to avoid overlap
                    })
                    .distanceMin(60)   // Start repelling at 60px
                    .distanceMax(1000)  // Keep repelling up to 1000px (longer range)
                )
                .force("collision", d3.forceCollide()
                    .radius(d => {
                        // Much larger collision buffer to prevent overlap (adjusted for larger nodes)
                        if (d.data.type === 'directory') {
                            return (d.radius + 60) * 2.5;  // Dirs need 2.5x space (increased buffer)
                        } else {
                            // Files need more space to avoid clustering
                            return d.radius + 60;  // +60px buffer for files (increased from 50)
                        }
                    })
                    .strength(1.0)  // Maximum strength
                    .iterations(5)  // More iterations for better separation
                )
                // VERY WEAK radial force - just a hint, not a pull
                .force("radial", d3.forceRadial(
                    d => {
                        // Use stored target radius
                        if (d.depth === 0) return 0;
                        return d.treeRadius || (200 + d.depth * 250);
                    },
                    centerX,
                    centerY
                ).strength(0.1))  // VERY weak - just guidance
                // CUSTOM: Outward force - push nodes away from root
                .force("outward", () => {
                    nodes.forEach(d => {
                        if (d.depth === 0) return;
                        
                        // Calculate vector from root to node
                        const dx = d.x - centerX;
                        const dy = d.y - centerY;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        
                        if (dist < 50) return;  // Don't affect nodes very close to root
                        
                        // Target distance based on depth
                        const targetDist = 200 + d.depth * 250;
                        
                        if (dist < targetDist) {
                            // Push outward if too close
                            const force = (targetDist - dist) / targetDist * 2;  // Moderate push
                            d.vx += (dx / dist) * force;
                            d.vy += (dy / dist) * force;
                        }
                    });
                })
                // CUSTOM: File clustering - keep files around parent directory
                .force("fileCluster", () => {
                    nodes.forEach(d => {
                        // Only apply to file nodes
                        if (d.data.type !== 'file' || !d.parent) return;
                        
                        const parent = d.parent;
                        if (!parent || parent.data.type !== 'directory') return;
                        
                        // Calculate vector from parent to file
                        const dx = d.x - parent.x;
                        const dy = d.y - parent.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        
                        // Target distance: closer to parent
                        const targetDist = 100;
                        const tolerance = 20;  // Allow 20px variation
                        
                        if (Math.abs(dist - targetDist) > tolerance) {
                            // Pull/push to maintain target distance
                            const force = (targetDist - dist) / targetDist * 1.8;
                            d.vx += (dx / dist) * force;
                            d.vy += (dy / dist) * force;
                        }
                        
                        // Also maintain angular distribution around parent
                        // Get all sibling files
                        const siblingFiles = parent.children.filter(c => c.data.type === 'file');
                        if (siblingFiles.length <= 1) return;
                        
                        const fileIndex = siblingFiles.indexOf(d);
                        const totalFiles = siblingFiles.length;
                        
                        // Target angle: evenly distributed around parent
                        const targetAngle = (fileIndex / totalFiles) * Math.PI * 2;
                        const currentAngle = Math.atan2(dy, dx);
                        
                        // Normalize angle difference
                        let angleDiff = targetAngle - currentAngle;
                        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                        
                        // Gentle angular correction
                        const angularForce = angleDiff * 0.4;
                        d.vx += -Math.sin(currentAngle) * angularForce * dist * 0.01;
                        d.vy += Math.cos(currentAngle) * angularForce * dist * 0.01;
                    });
                })
                // CUSTOM: Separate clusters - push files of different parents apart
                .force("clusterSeparation", () => {
                    nodes.forEach(d => {
                        if (d.data.type !== 'file' || !d.parent) return;
                        
                        const parentId = d.parent.data.path;
                        
                        // Check distance to files from other parents
                        nodes.forEach(other => {
                            if (other === d || other.data.type !== 'file' || !other.parent) return;
                            
                            const otherParentId = other.parent.data.path;
                            if (parentId === otherParentId) return;  // Same parent, skip
                            
                            // Calculate distance between files from different parents
                            const dx = d.x - other.x;
                            const dy = d.y - other.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            
                            // Minimum distance between clusters (reduced since files are closer to parents)
                            const minClusterDist = 150;  // 150px minimum between clusters (reduced from 200)
                            
                            if (dist < minClusterDist) {
                                // Push apart if too close
                                const force = (minClusterDist - dist) / minClusterDist * 2.5;
                                const fx = (dx / dist) * force;
                                const fy = (dy / dist) * force;
                                
                                d.vx += fx;
                                d.vy += fy;
                                other.vx -= fx;
                                other.vy -= fy;
                            }
                        });
                    });
                })
                // Angular positioning to spread nodes around center
                .force("angular", () => {
                    nodes.forEach(d => {
                        if (d.depth === 0) return;
                        
                        // Calculate target angle based on tree position
                        const targetAngle = d.treeAngle || Math.atan2(d.treeY - centerY, d.treeX - centerX);
                        const currentAngle = Math.atan2(d.y - centerY, d.x - centerX);
                        const currentRadius = Math.sqrt(Math.pow(d.x - centerX, 2) + Math.pow(d.y - centerY, 2));
                        
                        // Gently push toward target angle
                        const angleDiff = targetAngle - currentAngle;
                        // Normalize angle difference to [-PI, PI]
                        const normalizedDiff = ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;
                        const force = normalizedDiff * 0.1;
                        
                        d.vx += -Math.sin(currentAngle) * force * currentRadius * 0.01;
                        d.vy += Math.cos(currentAngle) * force * currentRadius * 0.01;
                    });
                })
                .alphaDecay(0.02)   // Faster decay to settle quickly
                .velocityDecay(0.4)  // More damping for stability
                .alphaTarget(0.001)  // Target very low alpha to stop quickly
                .on("tick", () => {
                    // Update visual positions
                    updatePositions();
                })
                .on("end", () => {
                    // When simulation ends, fix all node positions to prevent further movement
                    nodes.forEach(d => {
                        if (d.depth === 0) {
                            // Root stays fixed at center
                            d.fx = centerX;
                            d.fy = centerY;
                        } else {
                            // Fix all other nodes at their current positions
                            d.fx = d.x;
                            d.fy = d.y;
                        }
                    });
                });
            
            // Auto-stop simulation after initial layout settles (2 seconds)
            setTimeout(() => {
                if (simulation && simulation.alpha() > 0) {
                    // Fix all positions
                    nodes.forEach(d => {
                        if (d.depth === 0) {
                            d.fx = centerX;
                            d.fy = centerY;
                        } else {
                            d.fx = d.x;
                            d.fy = d.y;
                        }
                    });
                    // Stop simulation
                    simulation.stop();
                    
                    // Update pause button state
                    const pauseResumeBtn = document.getElementById("pause-resume");
                    if (pauseResumeBtn) {
                        pauseResumeBtn.textContent = "▶️ Resume";
                        pauseResumeBtn.classList.remove("paused");
                    }
                }
            }, 2000);
        }

        function updatePositions() {
            // Update link positions
            g.selectAll(".link")
                .attr("d", d => {
                    const sourceX = d.source.x;
                    const sourceY = d.source.y;
                    const targetX = d.target.x;
                    const targetY = d.target.y;
                    return "M" + sourceX + "," + sourceY + "L" + targetX + "," + targetY;
                });

            // Update node positions
            g.selectAll(".node")
                .attr("transform", d => "translate(" + d.x + "," + d.y + ")");
        }

        // Render visualization
        function render(data) {
            if (!data) {
                if (simulation) {
                    simulation.stop();
                    simulation = null;
                }
                g.selectAll("*").remove();
                return;
            }

            const root = buildRadialTreeLayout(data);
            if (!root) return;

            // Calculate properties for all nodes
            root.each(d => {
                const props = calculateNodeProperties(d);
                d.radius = props.radius;
                d.importance = props.importance;
                d.color = props.color;
            });

            const nodes = root.descendants();
            const links = root.links();

            // Create links
            const link = g.selectAll(".link")
                .data(links, d => d.source.data.path + "-" + d.target.data.path);

            link.exit().remove();

            const linkEnter = link.enter()
                .append("path")
                .attr("class", "link");

            linkEnter.merge(link)
                .attr("d", d => {
                    const sourceX = d.source.x;
                    const sourceY = d.source.y;
                    const targetX = d.target.x;
                    const targetY = d.target.y;
                    
                    // Use curved paths (bezier) to avoid overlap
                    const dx = targetX - sourceX;
                    const dy = targetY - sourceY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    // For file links, use gentle curve
                    if (d.target.data.type === 'file') {
                        // Curved path for file links to avoid overlap
                        const controlX = sourceX + dx * 0.5;
                        const controlY = sourceY + dy * 0.5;
                        // Add perpendicular offset to avoid overlap
                        const offset = 15;  // 15px offset
                        const perpX = -dy / dist * offset;
                        const perpY = dx / dist * offset;
                        
                        return "M" + sourceX + "," + sourceY + 
                               " Q" + (controlX + perpX) + "," + (controlY + perpY) + 
                               " " + targetX + "," + targetY;
                    } else {
                        // Straight line for directory links
                        return "M" + sourceX + "," + sourceY + "L" + targetX + "," + targetY;
                    }
                })
                .attr("stroke", d => {
                    // Color based on file type or depth
                    if (d.target.data.type === 'directory') return "#4a9eff";
                    
                    // File type colors
                    const name = (d.target.data.name || '').toLowerCase();
                    if (name.endsWith('.ts') || name.endsWith('.tsx')) return "#3178c6";
                    if (name.endsWith('.js') || name.endsWith('.jsx')) return "#f7df1e";
                    if (name.endsWith('.md')) return "#00d8ff";
                    if (name.endsWith('.json')) return "#5cdb95";
                    if (name.endsWith('.css') || name.endsWith('.scss')) return "#ff6b9d";
                    if (name.endsWith('.html')) return "#e44d26";
                    if (name.endsWith('.py')) return "#3776ab";
                    if (name.endsWith('.java')) return "#ea2d2e";
                    return "#8b5cf6";
                })
                .attr("stroke-width", d => {
                    if (d.source.depth === 0) return 3;
                    if (d.target.data.type === 'directory') return 2;
                    return 1.5;
                })
                .attr("stroke-opacity", 0.6)
                .attr("stroke-linecap", "round");

            // Create nodes
            const node = g.selectAll(".node")
                .data(nodes, d => d.data.path);

            node.exit().remove();

            const nodeEnter = node.enter()
                .append("g")
                .attr("class", d => "node " + d.data.type)
                .attr("transform", d => "translate(" + d.x + "," + d.y + ")");

            // Simple defs for gradients (no bloom/glow filters)
            const defs = svg.select("defs").size() > 0 ? svg.select("defs") : svg.append("defs");

            // Draw simple nodes (no bloom/glow effects)
            nodeEnter.append("circle")
                .attr("r", d => d.radius)
                .attr("fill", d => {
                    if (d.data.type === 'directory') {
                        if (d.depth === 0) return "#60a5fa";
                        return "#3b82f6";
                    }
                    return d.color;
                })
                .attr("stroke", d => {
                    if (d.data.type === 'directory') {
                        return "#93c5fd";
                    }
                    return "#ffffff";
                })
                .attr("stroke-width", d => d.data.type === 'directory' ? 2 : 1)
                .style("cursor", "pointer");

            // Add labels
            nodeEnter.append("text")
                .attr("class", d => "node-label " + d.data.type)
                .attr("dy", d => d.radius + 15)  // Increased from 12 to 15 for larger nodes
                .text(d => d.data.name)
                .style("display", showLabels ? "block" : "none");

            // Setup force simulation AFTER creating DOM elements
            setupForceSimulation(root, nodes, links);

            // Add interactions
            nodeEnter.merge(node)
                .on("mouseenter", function(event, d) {
                    // Highlight node - enlarge
                    d3.select(this).select("circle")
                        .transition()
                        .duration(200)
                        .attr("r", d.radius * 1.3)
                        .attr("stroke-width", d.data.type === 'directory' ? 3 : 2);

                    // Highlight path to root
                    highlightPathToRoot(d);

                    // Show tooltip
                    showTooltip(event, d);
                })
                .on("mouseleave", function(event, d) {
                    // Reset node
                    d3.select(this).select("circle")
                        .transition()
                        .duration(200)
                        .attr("r", d.radius)
                        .attr("stroke-width", d.data.type === 'directory' ? 2 : 1);

                    // Reset links
                    g.selectAll(".link")
                        .attr("stroke-width", d => {
                            if (d.source.depth === 0) return 3;
                            if (d.target.data.type === 'directory') return 2;
                            return 1.5;
                        })
                        .attr("stroke-opacity", 0.6);

                    // Hide tooltip
                    hideTooltip();
                })
                .on("click", function(event, d) {
                    if (d.data.type === 'file') {
                        vscode.postMessage({
                            command: 'fileClicked',
                            path: d.data.path
                        });
                    }
                })
                .call(d3.drag()
                    .on("start", function(event, d) {
                        if (d.depth === 0) return; // Don't drag root
                        d3.select(this).attr("opacity", 0.8);
                        if (!event.active && simulation) {
                            simulation.alphaTarget(0.3).restart();
                        }
                        d.fx = d.x;
                        d.fy = d.y;
                    })
                    .on("drag", function(event, d) {
                        if (d.depth === 0) return;
                        d.fx = event.x;
                        d.fy = event.y;
                    })
                    .on("end", function(event, d) {
                        if (d.depth === 0) return;
                        d3.select(this).attr("opacity", 1);
                        if (!event.active && simulation) {
                            simulation.alphaTarget(0);
                        }
                        d.fx = null;
                        d.fy = null;
                    })
                );
        }

        function highlightPathToRoot(node) {
            const path = [];
            let current = node;
            while (current && current.parent) {
                path.push({ source: current.parent, target: current });
                current = current.parent;
            }

            g.selectAll(".link")
                .attr("stroke-width", d => {
                    const isOnPath = path.some(p => 
                        p.source === d.source && p.target === d.target
                    );
                    return isOnPath ? 4 : (d.source.depth === 0 ? 3 : (d.target.data.type === 'directory' ? 2 : 1.5));
                })
                .attr("stroke-opacity", d => {
                    const isOnPath = path.some(p => 
                        p.source === d.source && p.target === d.target
                    );
                    return isOnPath ? 1 : 0.6;
                });
        }

        function updateLinksForNode(node) {
            g.selectAll(".link")
                .filter(d => d.source === node || d.target === node)
                .attr("d", d => {
                    const sourceX = d.source.x;
                    const sourceY = d.source.y;
                    const targetX = d.target.x;
                    const targetY = d.target.y;
                    return "M" + sourceX + "," + sourceY + "L" + targetX + "," + targetY;
                });
        }

        function showTooltip(event, node) {
            const tooltip = d3.select("#tooltip");
            const metrics = node.data.metrics || {};
            
            tooltip.html(
                '<div class="tooltip-title">' + node.data.name + '</div>' +
                '<div class="tooltip-metric">' +
                    '<span class="tooltip-label">Commits:</span>' +
                    '<span class="tooltip-value commits">' + (metrics.commits || 0) + '</span>' +
                '</div>' +
                '<div class="tooltip-metric">' +
                    '<span class="tooltip-label">Lines:</span>' +
                    '<span class="tooltip-value lines">' + (metrics.lines || 0) + '</span>' +
                '</div>' +
                '<div class="tooltip-metric">' +
                    '<span class="tooltip-label">Contributors:</span>' +
                    '<span class="tooltip-value contributors">' + (metrics.contributors || 0) + '</span>' +
                '</div>' +
                '<div class="tooltip-metric">' +
                    '<span class="tooltip-label">Last Modified:</span>' +
                    '<span class="tooltip-value">' + (metrics.lastModified || 'N/A') + '</span>' +
                '</div>'
            )
            .classed("visible", true);
        }

        function hideTooltip() {
            d3.select("#tooltip").classed("visible", false);
        }

        // Control buttons
        document.getElementById("reset-view").addEventListener("click", () => {
            // Reset zoom/pan
            svg.transition()
                .duration(750)
                .call(zoom.transform, d3.zoomIdentity);
            
            // Restart simulation if needed
            if (simulation) {
                simulation.alpha(1).restart();
            }
        });

        document.getElementById("toggle-labels").addEventListener("click", () => {
            showLabels = !showLabels;
            g.selectAll(".node-label")
                .style("display", showLabels ? "block" : "none");
        });

        // Pause/Resume button
        let isPaused = false;
        const pauseResumeBtn = document.getElementById("pause-resume");
        pauseResumeBtn.addEventListener("click", () => {
            if (!simulation) return;
            
            isPaused = !isPaused;
            if (isPaused) {
                // Stop and fix all positions
                nodes.forEach(d => {
                    if (d.depth === 0) {
                        d.fx = centerX;
                        d.fy = centerY;
                    } else {
                        d.fx = d.x;
                        d.fy = d.y;
                    }
                });
                simulation.stop();
                pauseResumeBtn.textContent = "▶️ Resume";
                pauseResumeBtn.classList.remove("paused");
            } else {
                // Unfix all nodes except root
                nodes.forEach(d => {
                    if (d.depth !== 0) {
                        d.fx = null;
                        d.fy = null;
                    }
                });
                simulation.alpha(0.3).restart();
                pauseResumeBtn.textContent = "⏸️ Pause";
                pauseResumeBtn.classList.add("paused");
            }
        });

        // Restart button
        document.getElementById("restart").addEventListener("click", () => {
            if (simulation) {
                // Unfix all nodes except root
                nodes.forEach(d => {
                    if (d.depth === 0) {
                        d.fx = centerX;
                        d.fy = centerY;
                    } else {
                        d.fx = null;
                        d.fy = null;
                    }
                });
                // Restart simulation
                simulation.alpha(1).restart();
                
                // Auto-stop after 2 seconds to freeze positions
                setTimeout(() => {
                    if (simulation) {
                        nodes.forEach(d => {
                            if (d.depth === 0) {
                                d.fx = centerX;
                                d.fy = centerY;
                            } else {
                                d.fx = d.x;
                                d.fy = d.y;
                            }
                        });
                        simulation.stop();
                        pauseResumeBtn.textContent = "▶️ Resume";
                        pauseResumeBtn.classList.remove("paused");
                        isPaused = true;
                    }
                }, 2000);
            }
        });

        // Listen for messages from extension
        window.addEventListener("message", event => {
            const message = event.data;
            switch (message.command) {
                case "updateRepository":
                    repositoryData = message.data;
                    render(repositoryData);
                    break;
            }
        });

        // Initial render
        if (repositoryData) {
            render(repositoryData);
        }
    </script>
</body>
</html>`;
  }

  private getNonce(): string {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  public dispose(): void {
    if (this._panel) {
      this._panel.dispose();
      this._panel = undefined;
    }
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}

