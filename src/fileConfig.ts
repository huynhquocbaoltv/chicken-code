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

const getCurrentFilePath = (): string | undefined => {
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) {
    return undefined;
  }
  return activeEditor.document.fileName;
};

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
    if (currentDir === parentDir) {
      break;
    }
    currentDir = parentDir;
  }

  return appliedConfigs;
};

const readConfigFileContent = async (
  filePath: string
): Promise<string | null> => {
  try {
    const content = await fs.promises.readFile(filePath, "utf-8");
    return content;
  } catch (error) {
    return null;
  }
};

export const checkAppliedConfigFiles = async () => {
  const currentFile = getCurrentFilePath();
  if (!currentFile) {
    vscode.window.showInformationMessage("⚠️ No file is currently open.");
    return;
  }

  const appliedConfigs = findConfigFileForCurrentFile(currentFile);
  if (Object.keys(appliedConfigs).length === 0) {
    vscode.window.showInformationMessage("❌ No config file found.");
    return;
  }

  const eslintConfig = appliedConfigs[".eslintrc"]
    ? await readConfigFileContent(appliedConfigs[".eslintrc"])
    : null;

  const prettierConfig = appliedConfigs[".prettierrc"]
    ? await readConfigFileContent(appliedConfigs[".prettierrc"])
    : null;

  const tsConfig = appliedConfigs["tsconfig.json"]
    ? await readConfigFileContent(appliedConfigs["tsconfig.json"])
    : null;

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

  const additionalContext = `
### **Configuration Guidelines**

The following configurations must be respected when optimizing the code:

${contextParts.join("\n\n")}

----------

  `;

  if (contextParts.length > 0) {
    vscode.window.showInformationMessage(
      "✅ Have got the information of config files."
    );
  } else {
    vscode.window.showInformationMessage("❌ No config file found.");
  }

  return additionalContext;
};
