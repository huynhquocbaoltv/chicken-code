import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

const CONFIG_FILES = [
  // ESLint config files
  ".eslintrc",
  ".eslintrc.json",
  ".eslintrc.js",
  ".eslintrc.cjs",
  // Prettier config files
  ".prettierrc",
  ".prettierrc.json",
  ".prettierrc.js",
  ".prettierrc.cjs",
  // TSConfig file
  "tsconfig.json",
];

/**
 * Lấy file hiện đang mở trong VS Code
 */
const getCurrentFilePath = (): string | undefined => {
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) return undefined;
  return activeEditor.document.fileName;
};

/**
 * Tìm file config ảnh hưởng đến file hiện tại
 */
const findConfigFileForCurrentFile = (
  fileName: string
): Record<string, string | undefined> => {
  let currentDir = path.dirname(fileName);
  const appliedConfigs: Record<string, string | undefined> = {};

  while (currentDir) {
    for (const configFile of CONFIG_FILES) {
      const configPath = path.join(currentDir, configFile);
      if (fs.existsSync(configPath)) {
        if (!appliedConfigs[configFile]) {
          appliedConfigs[configFile] = configPath;
        }
      }
    }

    const parentDir = path.dirname(currentDir);
    if (currentDir === parentDir) break; // Đã tới thư mục root
    currentDir = parentDir;
  }

  return appliedConfigs;
};

/**
 * Đọc nội dung file config và trả về nội dung file
 */
const readConfigFileContent = async (
  filePath: string
): Promise<string | null> => {
  try {
    const content = await fs.promises.readFile(filePath, "utf-8");
    console.log(`📄 Nội dung của file ${filePath}:\n${content}`);
    return content;
  } catch (error) {
    console.error(`❌ Không thể đọc file ${filePath}:`, error);
    return null;
  }
};

/**
 * Hàm chính để kiểm tra các file config đang được áp dụng
 */
export const checkAppliedConfigFiles = async () => {
  const currentFile = getCurrentFilePath();
  if (!currentFile) {
    vscode.window.showWarningMessage("⚠️ Không có tệp nào đang mở.");
    return;
  }

  console.log(`📘 File hiện tại: ${currentFile}`);

  const appliedConfigs = findConfigFileForCurrentFile(currentFile);
  if (Object.keys(appliedConfigs).length === 0) {
    vscode.window.showInformationMessage(
      "❌ Không tìm thấy file config áp dụng."
    );
    return;
  }

  console.log("📄 Các file config đã tìm thấy:", appliedConfigs);

  // Lấy nội dung của các file config (nếu có)
  const eslintConfig = appliedConfigs[".eslintrc"]
    ? await readConfigFileContent(appliedConfigs[".eslintrc"])
    : null;

  const prettierConfig = appliedConfigs[".prettierrc"]
    ? await readConfigFileContent(appliedConfigs[".prettierrc"])
    : null;

  const tsConfig = appliedConfigs["tsconfig.json"]
    ? await readConfigFileContent(appliedConfigs["tsconfig.json"])
    : null;

  // Tạo context để hiển thị
  const contextParts: string[] = [];

  if (eslintConfig) {
    contextParts.push(`
**ESLint Config**:
\`\`\`json
${eslintConfig}
\`\`\`
    `);
  }

  if (prettierConfig) {
    contextParts.push(`
**Prettier Config**:
\`\`\`json
${prettierConfig}
\`\`\`
    `);
  }

  if (tsConfig) {
    contextParts.push(`
**TSConfig**:
\`\`\`json
${tsConfig}
\`\`\`
    `);
  }

  // Nối tất cả các phần context thành 1 chuỗi
  const additionalContext = `
### 📋 Additional Context (Configuration Files)
${contextParts.join("\n\n")}
  `;

  // Chỉ log và hiển thị nếu có context
  if (contextParts.length > 0) {
    vscode.window.showInformationMessage("✅ Đã lấy thông tin file config.");
  } else {
    vscode.window.showInformationMessage("❌ Không tìm thấy file config.");
  }
};
