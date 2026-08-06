import * as vscode from "vscode";
import * as path from "path";

import { runCommand } from "./tools/command";
import { IncomingMessage } from "./tools/types";
import { getWebviewContent } from "./tools/webview";

/**
 * Provides the AtCoder helper webview view.
 */
export class AtCoderViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = "atcoderHelper.webviewView";

    private webviewView: vscode.WebviewView | undefined;

    constructor(private readonly context: vscode.ExtensionContext) {}

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ): void {
        this.webviewView = webviewView;
        this.initializeWebview();
    }

    private initializeWebview(): void {
        if (!this.webviewView) {
            return;
        }

        const webview = this.webviewView.webview;

        webview.options = {
            enableScripts: true,
            // retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(this.context.extensionPath, "dist")),
            ],
        };

        const webviewJsSrc = webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, "dist", "webview.js")),
        );

        webview.html = getWebviewContent(webviewJsSrc, "sidebar");

        this.bindMessageHandlers();

        this.webviewView.onDidDispose(() => {
            this.webviewView = undefined;
        });
    }

    private bindMessageHandlers(): void {
        if (!this.webviewView) {
            return;
        }

        const webview = this.webviewView.webview;

        const onMessage = (message: IncomingMessage) => {
            runCommand(message, this.context, (payload) => {
                if (this.webviewView) {
                    this.webviewView.webview.postMessage(payload);
                }
            });
        };

        webview.onDidReceiveMessage(onMessage, undefined, this.context.subscriptions);
    }
}