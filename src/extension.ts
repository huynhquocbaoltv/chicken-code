import * as vscode from "vscode";
import { OptimizationResultsProvider } from "./optimizationResultsProvider";
import { checkApiKey, clearApiKey } from "./checkApiKey";
import { ON_SAVE_KEY } from "./constants";

export async function activate(context: vscode.ExtensionContext) {
  const apiKey = await checkApiKey(context);
  const optimizationProvider = new OptimizationResultsProvider(context, apiKey);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "chickenCodeOptimizationResultsView",
      optimizationProvider
    )
  );

  if (!apiKey) {
    return;
  }

  let saveTimeout: NodeJS.Timeout;
  const debounceTime = 1500;

  let disposable = vscode.workspace.onDidSaveTextDocument(async () => {
    const onSave = context.globalState.get<boolean>(ON_SAVE_KEY);
    if (!onSave) {
      return;
    }
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      optimizationProvider.startOptimization();
    }, debounceTime);
  });

  context.subscriptions.push(disposable);
}
