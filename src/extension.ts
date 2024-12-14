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

  let saveTimeout: NodeJS.Timeout;
  const debounceTime = 1000; // Thời gian chờ giữa các lần lưu file

  let disposable = vscode.workspace.onDidSaveTextDocument(async () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      optimizationProvider.showLoadingIndicator();
      optimizationProvider.startOptimization().finally(() => {
        optimizationProvider.hideLoadingIndicator();
      });
    }, debounceTime);
  });

  context.subscriptions.push(disposable);
}
