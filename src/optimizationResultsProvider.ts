import * as vscode from "vscode";

export class OptimizationResultsProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private optimizations: any[] = [];
  private SKIP_KEY = "chickenCodeSkippedOptions";
  private highlightDecoration: vscode.TextEditorDecorationType =
    vscode.window.createTextEditorDecorationType({
      backgroundColor: "black",
      borderRadius: "2px",
      border: "0.5px solid rgba(255, 215, 0, 0.8)",
    });

  constructor(private context: vscode.ExtensionContext) {}

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

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "showMessage":
          vscode.window.showInformationMessage(message.text);
          break;

        case "applyCode":
          const { originalCode, optimizedCode, index } = message; // Nhận thêm index từ message
          await this.applyOptimization(originalCode, optimizedCode);
          this._view?.webview.postMessage({
            command: "removeOptimization",
            index,
          });
          break;

        case "skipOption":
          const { codeOriginal, index: skipIndex } = message;
          this.skipOptimization(codeOriginal); // Lưu cache các tùy chọn đã bỏ qua
          this._view?.webview.postMessage({
            command: "removeOptimization",
            index: skipIndex,
          });
          break;
        case "viewCache":
          const skippedOptions =
            this.context.globalState.get<string[]>(this.SKIP_KEY) || [];
          this._view?.webview.postMessage({
            command: "showCache",
            cache: skippedOptions,
          });
          console.log("showCache", skippedOptions);
          break;
        case "clearCache":
          this.context.globalState.update(this.SKIP_KEY, []);
          vscode.window.showInformationMessage("Cache đã được xóa thành công.");
          this.setOptimizations(this.optimizations);
          break;
        case "scrollToCode":
          this.scrollToCode(message.originalCode);
          break;
        case "clearHighlight":
          this.clearHighlight();
          break;
      }
    });

    this.updateWebview();
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

  clearHighlight(originalCode?: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

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
        const startIndex = match.index;
        const endIndex = startIndex + match[0].length;

        const startPosition = editor.document.positionAt(startIndex);
        const endPosition = editor.document.positionAt(endIndex);
        const range = new vscode.Range(startPosition, endPosition);

        // Xóa highlight của đoạn mã cụ thể
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
        <button id="clear-cache-button">Clear Cache</button>
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
        #clear-cache-button {
          margin: 4px;
          padding: 4px 8px;
          font-size: 14px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          background-color: black;
        }

        #optimization-list {
          margin-top: 8px;
        }

        #clear-cache-button {
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
          background-color: #2d2d2d;
          color: #ffffff;
          padding: 4px 8px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 16px;
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

          if (message.command === 'removeOptimization') {
            const optimizationContainer = document.querySelector(\`[data-index="\${message.index}"]\`);
            if (optimizationContainer) {
              optimizationContainer.remove();
            }
          }

          if (message.command === 'removeOptimization') {
            const container = document.querySelector(\`[data-index="\${message.index}"]\`);
            if (container) container.remove();
          }

          if (message.command === 'updateOptimizations') {
            const optimizationList = document.getElementById('optimization-list');
            optimizationList.innerHTML = '';
            const title = document.getElementById('title');
            if (message.optimizations.length === 0) {
              optimizationList.innerHTML = getMessageContainer();
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

                vscode.postMessage({
                  command: isExpanded ? 'scrollToCode' : 'clearHighlight', // Nếu expanded thì scroll, nếu không thì clear
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
  
              optimizationList.appendChild(optimizationContainer);
            });
  
            document.querySelectorAll('pre code').forEach((block) => {
              hljs.highlightElement(block);
            });
          }
        });
  
        function getMessageContainer() {
          return \`
            <div class="message-container">
              <div class="message-title">Chicken Code hello!</div>
              <div class="message-subtitle">Create by Huynh Quoc Bao LTV</div>
            </div>
          \`;
        }
  
        function getOptimizationContent(titleText, optimization, index) {
          return \`
            <div class="optimization-title">
              <span>\${titleText}</span>
              <span class="arrow-icon">▶</span>
            </div>
            <div class="optimization-content">
              <pre class="original-code"><code>\${escapeHTML(optimization.codeOriginal)}</code></pre>
              <div class="optimized-code-container" style="position: relative; margin-top: 10px;">
                <pre class="optimized-code"><code>\${escapeHTML(optimization.codeOptimized)}</code></pre>
                <div class="button-group">
                  <button class="apply-button">Apply Code</button>
                  <button class="skip-button">Skip</button>
                </div>
              </div>
              <p>\${optimization.codeDescription}</p>
            </div>
          \`;
        }
      </script>
    `;
  }
}
