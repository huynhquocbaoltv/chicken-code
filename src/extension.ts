import * as vscode from "vscode";
import fetch from "node-fetch";
import { OptimizationResultsProvider } from "./optimizationResultsProvider";
import { checkAppliedConfigFiles } from "./fileConfig";

export async function activate(context: vscode.ExtensionContext) {
  const optimizationProvider = new OptimizationResultsProvider(context);

  const additionalContext = await checkAppliedConfigFiles();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "optimizationResultsView",
      optimizationProvider
    )
  );

  let disposable = vscode.workspace.onDidSaveTextDocument(async (document) => {
    if (document.languageId === "vue") {
      const content = document.getText();

      const promptEn = `
From now on, you will act as a professional software engineer. 
Your task is to **support developers in optimizing code** for popular programming languages. 
You will analyze the code snippet below and look for opportunities to improve it. 
The main goal is to **optimize the syntax and logic of the code**, but you must **keep the original structure of the code**.

${additionalContext}

### Answer rules:
1. If the code does not need optimization or only contains minor issues, return **an empty array** \`[]\`.
2. If there are optimization opportunities, provide the details in the following format:
   \`\`\`json
   [
      {
          "codeOriginal": "const HelloWorld = 'Hello World';",
          "codeOptimized": "const helloWorld = 'Hello World';",
          "codeName": "Variable complies with camelCase",
          "codeDescription": "Using camelCase for variable names to improve consistency and follow JavaScript naming conventions."
      },
      {
          "codeOriginal": "<div>{{ user.name }}</div>",
          "codeOptimized": "<div>{{ user?.name }}</div>",
          "codeName": "Optional property access",
          "codeDescription": "Added the optional chaining operator '?.' to avoid errors when accessing undefined properties."
      }
   ]
   \`\`\`

### Here is the code snippet to optimize:
${content}
    `;

      const prompt = promptEn;

      // Gọi API
      try {
        const apiKey =
          process.env.API_KEY || "AIzaSyCoUn_Hm-imyDkaspoZqNK_a1r_QIGu8LU";

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: prompt,
                    },
                  ],
                },
              ],
            }),
          }
        );

        const result = await response.json();

        await handleApiResponse(result, optimizationProvider);
      } catch (error) {
        vscode.window.showErrorMessage("Lỗi khi gọi API: " + error);
      }
    }
  });

  context.subscriptions.push(disposable);
}

async function handleApiResponse(
  apiResponse: any,
  optimizationProvider: OptimizationResultsProvider
) {
  try {
    const contentText = apiResponse.candidates[0].content.parts[0].text;
    const jsonStart = contentText.indexOf("[");
    const jsonEnd = contentText.lastIndexOf("]");
    const jsonString = contentText.substring(jsonStart, jsonEnd + 1);

    const optimizationResults = JSON.parse(jsonString);

    optimizationProvider.setOptimizations(optimizationResults);

    vscode.window.showInformationMessage(
      "Kết quả tối ưu hóa đã được hiển thị trong Chicken Code Sidebar."
    );
  } catch (error) {
    vscode.window.showErrorMessage("Lỗi khi xử lý kết quả API: " + error);
  }
}
