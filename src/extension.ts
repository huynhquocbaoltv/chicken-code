import * as vscode from "vscode";
import { OptimizationResultsProvider } from "./optimizationResultsProvider";

export async function activate(context: vscode.ExtensionContext) {
  const optimizationProvider = new OptimizationResultsProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "chickenCodeOptimizationResultsView",
      optimizationProvider
    )
  );

  let disposable = vscode.workspace.onDidSaveTextDocument(async () => {
    optimizationProvider.startOptimization();
  });

  context.subscriptions.push(disposable);
}
