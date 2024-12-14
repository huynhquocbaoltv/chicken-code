import * as vscode from "vscode";
import { checkAppliedConfigFiles } from "./fileConfig";

export class OptimizationResultsProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private optimizations: any[] = [];
  private readonly SKIP_KEY = "chickenCodeSkippedOptions";
  private readonly ADDITIONAL_RULES_KEY = "chickenCodeAdditionalRules";
  private readonly DATA_OPTIMIZE_KEY = "chickenCodeAdditionalWebview";
  private readonly highlightDecoration: vscode.TextEditorDecorationType =
    vscode.window.createTextEditorDecorationType({
      backgroundColor: "black",
      borderRadius: "2px",
      border: "0.5px solid rgba(255, 215, 0, 0.8)",
    });
  private additionalContext: string = "";

  private showAdditionalRulesPanel() {
    const panel = vscode.window.createWebviewPanel(
      "additionalRulesPanel", // ID của view
      "Additional Rules", // Tiêu đề của panel
      vscode.ViewColumn.One, // Hiển thị trong cột bên phải
      {
        enableScripts: true, // Cho phép chạy JavaScript trong webview
      }
    );

    const additionalRules = this.context.globalState.get<string[]>(
      this.ADDITIONAL_RULES_KEY,
      []
    );

    // Tạo nội dung HTML cho panel
    panel.webview.html = this.getAdditionalRulesContent(additionalRules);
  }

  private getAdditionalRulesContent(rules: string[]): string {
    const rulesList =
      rules.length > 0
        ? rules
            .map(
              (rule, index) => `
        <li class="rule-item" data-index="${index}">
          <span class="rule-name">${rule}</span>
          <button class="delete-button" data-rule="${rule}" title="Delete Rule">Delete</button>
        </li>
      `
            )
            .join("")
        : "<p>No additional rules available.</p>";

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Additional Rules</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 16px;
          }
          h1 {
            font-size: 24px;
            font-weight: bold;
            text-align: center;
          }
          ul {
            list-style-type: none;
            padding: 0;
          }
          .rule-item {
            background-color: black;
            margin: 4px 0;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background-color 0.2s ease;
          }
          .rule-item:hover {
            background-color: #e0e0e0;
            color: black;
          }
          .delete-button {
            background: red;
            border-radius: 4px;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            visibility: hidden;
          }
          .rule-item:hover .delete-button {
            visibility: visible;
          }
          .no-rules {
            color: #999;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <h1>Additional Rules</h1>
        <ul id="rules-list">
          ${rulesList}
        </ul>
        <script>
          const vscode = acquireVsCodeApi();
  
          // Gắn sự kiện click cho nút delete
          document.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', (event) => {
              const rule = event.target.getAttribute('data-rule');
              vscode.postMessage({ command: 'deleteRule', rule });
            });
          });
          document.getElementById('rules-list').addEventListener('click', (event) => {
            const target = event.target;

            if (target.classList.contains('delete-button')) {
              const rule = target.getAttribute('data-rule');
              vscode.postMessage({ command: 'deleteRule', rule });
            }
          });
        </script>
      </body>
      </html>
    `;
  }

  public showLoadingIndicator() {
    if (this._view) {
      this._view.webview.postMessage({ command: "showLoading" });
    }
  }

  public hideLoadingIndicator() {
    if (this._view) {
      this._view.webview.postMessage({ command: "hideLoading" });
    }
  }

  private deleteAdditionalRule(ruleToDelete: string) {
    const currentRules = this.context.globalState.get<string[]>(
      this.ADDITIONAL_RULES_KEY,
      []
    );
    vscode.window.showInformationMessage(`Deleting rule '${ruleToDelete}'...`);
    const updatedRules = currentRules.filter((rule) => rule !== ruleToDelete);

    this.context.globalState
      .update(this.ADDITIONAL_RULES_KEY, updatedRules)
      .then(() => {
        vscode.window.showInformationMessage(
          `Rule '${ruleToDelete}' has been deleted.`
        );
        this.showAdditionalRulesPanel(); // Tải lại webview panel với danh sách mới
      });
  }

  constructor(private readonly context: vscode.ExtensionContext) {
    this.loadAdditionalContext();
  }

  async loadAdditionalContext() {
    const context = await checkAppliedConfigFiles();
    this.additionalContext = context ?? "";
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true, // Cho phép chạy JavaScript
    };

    webviewView.webview.html = this.getWebviewContent();

    webviewView.onDidChangeVisibility(() => {
      if (!webviewView.visible) {
        const currentData = this.optimizations;
        this.context.workspaceState.update(this.DATA_OPTIMIZE_KEY, currentData);
        this.clearHighlight();
      } else {
        const savedData = this.context.workspaceState.get<any[]>(
          this.DATA_OPTIMIZE_KEY,
          []
        );
        if (savedData && savedData.length > 0) {
          this.optimizations = savedData; // Phục hồi dữ liệu tối ưu hóa
          this.updateWebview(); // Cập nhật webview với dữ liệu đã phục hồi
        }
      }
    });

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "showMessage":
          vscode.window.showInformationMessage(message.text);
          break;
        case "removeOptimization":
          this.removeOptimization(message.originalCode);
          break;

        case "applyCode":
          await this.applyOptimization(
            message.originalCode,
            message.optimizedCode
          );
          this._view?.webview.postMessage({
            command: "removeOptimization",
            index: message.index,
          });
          break;

        case "skipOption":
          this.skipOptimization(message.codeOriginal);
          this._view?.webview.postMessage({
            command: "removeOptimization",
            index: message.index,
          });
          break;
        case "viewCache":
          {
            const skippedOptions =
              this.context.globalState.get<string[]>(this.SKIP_KEY) || [];
            this._view?.webview.postMessage({
              command: "showCache",
              cache: skippedOptions,
            });
          }
          break;
        case "clearCache":
          this.context.globalState.update(this.SKIP_KEY, []);
          vscode.window.showInformationMessage("Cache đã được xóa thành công.");
          this.setOptimizations(this.optimizations);
          break;

        case "viewAdditionalRule":
          this.showAdditionalRulesPanel();
          break;
        case "scrollToCode":
          this.scrollToCode(message.originalCode);
          break;
        case "optimizeCode":
          this.startOptimization();
          break;
        case "clearHighlight":
          this.clearHighlight(message.originalCode);
          break;
        case "skipRule":
          const currentSkippedRules =
            this.context.globalState.get<string[]>(this.ADDITIONAL_RULES_KEY) ||
            [];
          if (!currentSkippedRules.includes(message.rule)) {
            currentSkippedRules.push(message.rule);
            this.context.globalState.update(
              this.ADDITIONAL_RULES_KEY,
              currentSkippedRules
            );
            vscode.window.showInformationMessage(
              `Rule '${message.rule}' has been skipped.`
            );
          }
          break;
        case "deleteRule":
          vscode.window.showInformationMessage(
            `Deleting rule '${message.rule}'...sdsđ`
          );
          this.deleteAdditionalRule(message.rule);
          break;
      }
    });

    this.updateWebview();
  }

  async startOptimization() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("Không có tệp nào đang mở để tối ưu hóa.");
      return;
    }

    const content = editor.document.getText();

    const promptEn = `
      From now on, you will act as a professional software engineer.
      Your task is to **support developers in optimizing code** for popular programming languages.
      You will analyze the code snippet below and look for opportunities to improve it.
      The main goal is to **optimize the syntax and logic of the code**, but you must **keep the original structure of the code**.

      ${this.additionalContext}

      ### Answer rules:
      1. If the code does not need optimization or only contains minor issues, skip.
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
      3. Returns the exact original code content.

      ### Here is the code snippet to optimize:
      ${content}
          `;

    const prompt = promptEn;

    try {
      const result = await this.fetchOptimizationResults(
        prompt,
        "AIzaSyCp9s7GBND0rfn4E7L6UAwzi28xzGvB_0E"
      );

      await this.handleApiResponse(result);
    } catch (error) {
      vscode.window.showErrorMessage("Lỗi khi gọi API: " + error);
    }
  }

  async fetchOptimizationResults(prompt: string, apiKey: string) {
    try {
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
      return result;
    } catch (error) {
      vscode.window.showErrorMessage("Lỗi khi gọi API: " + error);
      return null;
    }
  }

  async handleApiResponse(apiResponse: any) {
    try {
      vscode.window.showInformationMessage(
        "Kết quả tối ưu hóa đã được nhận.",
        apiResponse.candidates
      );
      const contentText = apiResponse.candidates[0].content.parts[0].text;

      const jsonStart = contentText.indexOf("[");
      const jsonEnd = contentText.lastIndexOf("]");

      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("Không tìm thấy mảng JSON hợp lệ trong nội dung.");
      }

      // 2️⃣ Trích xuất chuỗi JSON
      const jsonString = contentText.substring(jsonStart, jsonEnd + 1);
      // 3️⃣ Phân tích cú pháp JSON
      const optimizationResults = JSON.parse(jsonString);
      // Kiểm tra xem kết quả có phải là mảng hợp lệ hay không
      if (!Array.isArray(optimizationResults)) {
        throw new Error("Phân tích JSON không trả về mảng hợp lệ.");
      }
      this.setOptimizations(optimizationResults);

      vscode.window.showInformationMessage(
        "Kết quả tối ưu hóa đã được hiển thị trong Chicken Code Sidebar."
      );
    } catch (error) {
      vscode.window.showErrorMessage("Lỗi khi xử lý kết quả API: " + error);
    }
  }

  async scrollToCode(originalCode: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage(
        "Không có tệp nào đang mở để cuộn đến mã."
      );
      return;
    }

    const documentText = editor.document.getText();

    // Tạo RegEx từ đoạn mã originalCode, cho phép khớp với khoảng trắng tùy ý (\s+)
    const escapeSpecialChars = (code: string) =>
      code.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"); // Escape các ký tự đặc biệt

    const normalizedOriginalCode = escapeSpecialChars(originalCode).replace(
      /\s+/g,
      "\\s+"
    );
    const regex = new RegExp(normalizedOriginalCode, "g"); // Global search

    // Tìm đoạn mã trong tài liệu
    const match = regex.exec(documentText);

    if (!match) {
      vscode.window.showWarningMessage(
        "Không tìm thấy đoạn mã trong tài liệu."
      );
      this._view?.webview.postMessage({
        command: "removeOptimization",
        originalCode,
      });
      return;
    }

    const startIndex = match.index; // Vị trí bắt đầu của đoạn mã
    const endIndex = startIndex + match[0].length; // Vị trí kết thúc của đoạn mã

    const startPosition = editor.document.positionAt(startIndex);
    const endPosition = editor.document.positionAt(endIndex);
    const range = new vscode.Range(startPosition, endPosition);

    // Highlight đoạn mã
    editor.setDecorations(this.highlightDecoration, [range]);

    // Cuộn đến đoạn mã
    editor.selection = new vscode.Selection(startPosition, startPosition);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
  }

  removeOptimization(originalCode: string) {
    this.optimizations = this.optimizations.filter(
      (opt) => opt.codeOriginal !== originalCode
    );
    this.updateWebview();
  }

  clearHighlight(originalCode?: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    if (originalCode) {
      const documentText = editor.document.getText();

      const escapeSpecialChars = (code: string) =>
        code.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");

      const normalizedOriginalCode = escapeSpecialChars(originalCode).replace(
        /\s+/g,
        "\\s+"
      );
      const regex = new RegExp(normalizedOriginalCode, "g");
      const match = regex.exec(documentText);

      if (match) {
        editor.setDecorations(this.highlightDecoration, []);
      }
    } else {
      // Xóa tất cả highlight nếu không có originalCode
      editor.setDecorations(this.highlightDecoration, []);
    }
  }

  skipOptimization(codeOriginal: string) {
    const currentSkippedOptions =
      this.context.globalState.get<string[]>(this.SKIP_KEY) || [];
    const hash = this.hashCode(codeOriginal);
    if (!currentSkippedOptions.includes(hash)) {
      currentSkippedOptions.push(hash);
      this.context.globalState.update(this.SKIP_KEY, currentSkippedOptions);
    }
  }

  hashCode(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return hash.toString();
  }

  setOptimizations(optimizations: any[]): void {
    if (optimizations.length > 0) {
      vscode.commands
        .executeCommand("workbench.view.extension.chickenCodeOptimizer")
        .then(() => {
          const skippedOptions =
            this.context.globalState.get<string[]>(this.SKIP_KEY) || [];
          this.optimizations = optimizations.filter(
            (opt) => !skippedOptions.includes(this.hashCode(opt.codeOriginal))
          );
          this.updateWebview();
        });
    } else {
      this.optimizations = [];
      this.updateWebview();
    }
  }

  updateWebview() {
    if (this._view) {
      this._view.webview.postMessage({
        command: "updateOptimizations",
        optimizations: this.optimizations,
      });
    }
  }

  async applyOptimization(originalCode: string, optimizedCode: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage(
        "Không có tệp nào đang mở để áp dụng mã tối ưu."
      );
      return;
    }

    const documentText = editor.document.getText();
    const startIndex = documentText.indexOf(originalCode);

    if (startIndex === -1) {
      vscode.window.showWarningMessage("Không tìm thấy đoạn mã gốc trong tệp.");
      return;
    }

    const startPosition = editor.document.positionAt(startIndex);
    const endPosition = editor.document.positionAt(
      startIndex + originalCode.length
    );
    const range = new vscode.Range(startPosition, endPosition);

    editor
      .edit((editBuilder) => {
        editBuilder.replace(range, optimizedCode);
      })
      .then((success) => {
        if (success) {
          vscode.window.showInformationMessage(
            "Áp dụng tối ưu hóa thành công!"
          );
        } else {
          vscode.window.showErrorMessage("Không thể áp dụng tối ưu hóa.");
        }
      });
  }

  getWebviewContent() {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>I think your code need to update ^^</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github-dark.min.css">
        ${this.getStyles()}
      </head>
      <body>
        <div style="display: flex; flex-direction: column; padding: 16px; height: 100%; justify-content: space-between;">
        ${this.getHtmlBody()}
        <div class="message-container">
          <div class="message-title">Chicken Code hello!</div>
          <div class="message-subtitle">Create by Huynh Quoc Bao LTV</div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 4px;">
        <button id="clear-cache-button">Clear Cache</button>
        <button id="view-additional-rule-button">View Additional Rule</button>
        <button id="optimize-button">Optimize</button>
      </div>
        </div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js"></script>
        ${this.getScript()}
      </body>
      </html>
    `;
  }

  getStyles() {
    return `
      <style>
        body {
          font-family: Arial, sans-serif;
        }
        #clear-cache-button, #optimize-button, #view-additional-rule-button {
          margin: 4px;
          padding: 4px 8px;
          font-size: 14px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          background-color: black;
        }

        .loading-message {
          font-size: 18px;
          font-weight: bold;
          color: #ffffff;
          text-align: center;
        }

        #optimization-list {
          margin-top: 8px;
        }

        #clear-cache-button, #optimize-button, #view-additional-rule-button {
          color: white;
        }

        .optimization-container.expanded .arrow-icon {
          transform: rotate(90deg);
        }

        .original-code { 
          border: 1px solid #f8d7da;
        }
        .optimized-code { 
          border: 1px solid #d4edda;
        }

        .skip-button:hover {
          background-color: #c9302c;
        }

        .optimization-container {
          border: 1px solid #ccc;
          border-radius: 8px;
          margin-bottom: 8px;
          overflow: hidden;
        }
  
        .optimization-title {
          background-color: black;
          color: #ffffff;
          padding: 4px 8px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 15px;
        }
  
        .optimization-title:hover {
          background-color: #3a3a3a;
        }
  
        .arrow-icon {
          transition: transform 0.3s;
        }
  
        .collapsed .arrow-icon {
          transform: rotate(-90deg);
        }
  
        .optimization-content {
          padding: 8px;
          display: none;
        }
  
        .expanded .optimization-content {
          display: block;
        }
  
        pre {
          background-color: #1e1e1e;
          padding: 4px;
          border-radius: 5px;
          overflow-x: auto;
        }
  
        .button-group {
          position: absolute;
          top: -10px;
          right: 10px;
          display: flex;
          gap: 10px;
        }

        .apply-button {
          background-color: #4caf50;
          color: white;
          border: none;
          padding: 2px 4px;
          cursor: pointer;
          border-radius: 5px;
        }

        .skip-button {
          background-color: #d9534f;
          color: white;
          border: none;
          padding: 2px 4px;
          cursor: pointer;
          border-radius: 5px;
        }

  
        .apply-button:hover {
          background-color: #45a049;
        }
  
        .message-container {
          text-align: center;
          margin-top: 16px;
        }
  
        .message-title {
          font-size: 24px;
          font-weight: bold;
          color: #4caf50;
        }
  
        .message-subtitle {
          font-size: 16px;
          color: #cccccc;
        }
      </style>
    `;
  }

  getHtmlBody() {
    return `
      <div id="title">Welcome</div>
      <div id="optimization-list"></div>
    `;
  }

  getScript() {
    return `
      <script>
        const vscode = acquireVsCodeApi();
  
        function escapeHTML(unsafe) {
          return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        }

        document.getElementById('clear-cache-button').addEventListener('click', () => {
          vscode.postMessage({ command: 'clearCache' });
        });

        document.getElementById('view-additional-rule-button').addEventListener('click', () => {
          vscode.postMessage({ command: 'viewAdditionalRule' });
        });

        document.getElementById('optimize-button').addEventListener('click', () => {
          vscode.postMessage({ command: 'optimizeCode' });
        });
  
        window.addEventListener('message', event => {
          const message = event.data;
          
          if (message.command === 'showCache') {
            const cacheContent = document.getElementById('cache-content');
            cacheContent.innerHTML = '<h3>Cache Content:</h3>';
            if (message.cache.length === 0) {
              cacheContent.innerHTML += '<p>Cache is empty.</p>';
            } else {
              cacheContent.innerHTML += '<ul>' + message.cache.map(hash => \`<li>\${hash}</li>\`).join('') + '</ul>';
            }
          }

          if (message.command === 'showLoading') {
            const optimizationList = document.getElementById('optimization-list');
            optimizationList.innerHTML = '<div class="loading-message">Loading, please wait...</div>';
          }

          if (message.command === 'removeOptimization') {
            const optimizationContainer = document.querySelector(\`[data-index="\${message.index}"]\`);
            if (optimizationContainer) {
              optimizationContainer.remove();
            }
          }

          if (message.command === 'removeOptimization') {
            const container = document.querySelector(\`[data-original-code="\${message.originalCode}"]\`);
            if (container) container.remove();
          }


          if (message.command === 'updateOptimizations') {
            const optimizationList = document.getElementById('optimization-list');
            optimizationList.innerHTML = '';
            const title = document.getElementById('title');
            if (message.optimizations.length === 0) {
              title.textContent = 'No optimizations available';
              return;
            }

            title.textContent = 'I think your code need to update ^^';
  
            message.optimizations.forEach((optimization, index) => {
              const optimizationContainer = document.createElement('div');
              optimizationContainer.classList.add('optimization-container');
              optimizationContainer.setAttribute('data-index', index);
  
              const titleText = optimization.codeName ? optimization.codeName : \`Optimization \${index + 1}\`;
  
              optimizationContainer.innerHTML = getOptimizationContent(titleText, optimization, index);

              const title = optimizationContainer.querySelector('.optimization-title');
              title.addEventListener('click', () => {
                const isExpanded = optimizationContainer.classList.toggle('expanded');

                if (isExpanded) {
                  // Đóng tất cả các options khác
                  document.querySelectorAll('.optimization-container.expanded').forEach(container => {
                    if (container !== optimizationContainer) {
                      container.classList.remove('expanded');
                    }
                  });
                }

                vscode.postMessage({
                  command: isExpanded ? 'scrollToCode' : 'clearHighlight',
                  originalCode: optimization.codeOriginal
                });
              });
  
              const applyButton = optimizationContainer.querySelector('.apply-button');
              applyButton.addEventListener('click', () => {
                vscode.postMessage({
                  command: 'applyCode',
                  originalCode: optimization.codeOriginal,
                  optimizedCode: optimization.codeOptimized,
                  index: index 
                });
              });

              optimizationContainer.querySelector('.skip-button').addEventListener('click', () => {
                vscode.postMessage({
                  command: 'skipOption',
                  codeOriginal: optimization.codeOriginal,
                  index
                });
              });

              const skipRuleButton = optimizationContainer.querySelector('.skip-rule-button');
              skipRuleButton.addEventListener('click', () => {
                vscode.postMessage({ command: 'skipRule', rule: optimization.codeDescription });
              });
  
              optimizationList.appendChild(optimizationContainer);
            });
  
            document.querySelectorAll('pre code').forEach((block) => {
              hljs.highlightElement(block);
            });
          }
        });
  
        function getOptimizationContent(titleText, optimization, index) {
          return \`
            <div class="optimization-title">
              <span>\${titleText}</span>
              <span class="arrow-icon">▶</span>
            </div>
            <div class="optimization-content" data-original-code="\${escapeHTML(optimization.codeOriginal)}">
              <pre class="original-code"><code>\${escapeHTML(optimization.codeOriginal)}</code></pre>
              <div class="optimized-code-container" style="position: relative; margin-top: 10px;">
                <pre class="optimized-code"><code>\${escapeHTML(optimization.codeOptimized)}</code></pre>
                <div class="button-group">
                  <button class="apply-button">Apply Code</button>
                  <button class="skip-button">Skip</button>
                </div>
              </div>
              <div style="position: relative; margin-top: 10px;">
                <p>\${optimization.codeDescription}</p>
                <button class="skip-rule-button">Skip This Rule</button>
              </div>
            </div>
          \`;
        }

      </script>
    `;
  }
}
