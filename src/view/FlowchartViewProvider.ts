import * as vscode from "vscode";
import * as path from "path";
import { SubtleThemeManager } from "../core/utils/ThemeManager";
import { EnvironmentDetector } from "../core/utils/EnvironmentDetector";
import {
  BaseFlowchartProvider,
  FlowchartViewContext,
  WebviewMessage,
} from "./BaseFlowchartProvider";

export class FlowchartViewProvider
  extends BaseFlowchartProvider
  implements vscode.WebviewViewProvider
{
  public static readonly viewType = "codevisualizer.flowchartView";
  private _view?: vscode.WebviewView;

  public static getAvailableThemes() {
    return SubtleThemeManager.getAvailableThemes();
  }

  constructor(extensionUri: vscode.Uri) {
    super(extensionUri);
  }

  protected getWebview(): vscode.Webview | undefined {
    return this._view?.webview;
  }

  protected setWebviewHtml(html: string): void {
    if (this._view) {
      this._view.webview.html = html;
    }
  }

  protected getViewContext(): FlowchartViewContext {
    return {
      isPanel: false,
      showPanelButton: true,
    };
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    
    const baseOptions = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    webviewView.webview.options = EnvironmentDetector.getWebviewOptions(baseOptions);

    // Add initialization delay for compatibility mode
    const delay = EnvironmentDetector.getInitializationDelay();
    
    const initializeView = () => {
      this.setupEventListeners();

      // Handle messages from the webview
      webviewView.webview.onDidReceiveMessage(
        (message: WebviewMessage) => this.handleWebviewMessage(message),
        null,
        this._disposables
      );

      // Initial update
      this.updateView(vscode.window.activeTextEditor);
    };

    if (delay > 0) {
      setTimeout(initializeView, delay);
    } else {
      initializeView();
    }
  }


  public refresh(): void {
    if (this._view) {
      this.forceUpdateView(vscode.window.activeTextEditor);
    }
  }

  public dispose(): void {
    this._view = undefined;
    super.dispose();
  }
}
