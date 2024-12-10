# Chicken Code Optimizer 🐔
Automatic, Simple, Fast, and Accurate Code Optimization

📘 Introduction
Chicken Code Optimizer is a powerful extension for Visual Studio Code (VS Code) that helps developers automatically optimize source code for popular programming languages like Vue.js, TypeScript, and JavaScript. This tool uses AI (Google Generative Language API) to analyze, detect, and suggest code improvements directly in the Chicken Code Sidebar of VS Code.

With Chicken Code Optimizer, you can save development time, ensure code quality, follow industry best practices, and maintain ESLint, Prettier, and SonarQube standards.

🚀 Key Features
🔥 Automatic Code Optimization
Automatic analysis and optimization every time you save a file.
Detects syntax and logic improvements while preserving the original structure of the code.
Supports popular languages: Vue.js, TypeScript, and JavaScript.
📂 Config File Management
Automatically identifies and displays the configuration files affecting the current file, including:
ESLint: .eslintrc, .eslintrc.json, .eslintrc.js, .eslintrc.cjs
Prettier: .prettierrc, .prettierrc.json, .prettierrc.js, .prettierrc.cjs
TypeScript: tsconfig.json
⚡ User-Friendly Interface
Displays optimizations directly in the Chicken Code Sidebar.
Each optimization includes:
Apply: Instantly apply the optimization.
Skip: Skip the optimization and save it to the cache.
View Cache: View the list of skipped optimizations.
Clear Cache: Clear the cache to re-enable all optimizations.
🔐 Skip and Cache Management
Skip suggestions: If you don't want to apply a suggestion, click Skip to store it in the cache.
View and Clear Cache: View the list of skipped optimizations and clear the cache if needed.
📦 Installation
Open Visual Studio Code.
Go to Extensions (Ctrl + Shift + X).
Search for Chicken Code Optimizer and click Install.
The extension will be installed and ready to use.
✨ How to Use
1️⃣ Automatic Code Optimization
Open a Vue.js, TypeScript, or JavaScript file.
Write your code and press Ctrl + S (Save file).
The Chicken Code Sidebar will display a list of possible optimizations.
For each optimization, you have two options:
Apply: Apply the optimization directly to your file.
Skip: Skip the optimization, and it will not be displayed again unless you clear the cache.
2️⃣ View and Manage Configuration Files
When you open a file (.vue, .ts, or .js), the extension will automatically search for and display the contents of the following configuration files:
ESLint Config: .eslintrc, .eslintrc.json, .eslintrc.js, .eslintrc.cjs
Prettier Config: .prettierrc, .prettierrc.json, .prettierrc.js, .prettierrc.cjs
TypeScript Config: tsconfig.json
The configuration file content will be displayed directly in the Chicken Code Sidebar.
3️⃣ Cache Management
Skip an optimization: Click the Skip button to avoid the optimization.
View Cache: Click View Cache to see which optimizations have been skipped.
Clear Cache: Click Clear Cache to clear the cache and show all available optimizations again.
💡 Examples
1️⃣ Code Optimization Example
Before:

javascript
Copy code
let items = [];
items.push("a");
items.push("b");
items.push("c");
Optimization Suggestion:

javascript
Copy code
let items = ["a", "b", "c"];
2️⃣ Config File Detection
Current file: src/components/HelloWorld.vue

Detected Config Files:

diff
Copy code
- .eslintrc.json (in the root directory)
- .prettierrc (in the project directory)
- tsconfig.json (in the root directory)
🔧 File Structure
go
Copy code
📦 Chicken Code Optimizer
├─ 📁 src
│  ├─ 📄 extension.ts             // Main file that activates the extension
│  ├─ 📄 optimizationResultsProvider.ts // Manages the optimization view
│  ├─ 📄 fileConfig.ts            // Manages config file discovery
│  ├─ 📄 utils.ts                 // Utility functions
├─ 📄 package.json                // Extension manifest
├─ 📄 README.md                   // This readme file
📜 Supported Configuration Files
Type	File Name
ESLint	.eslintrc, .eslintrc.json, .eslintrc.js, .eslintrc.cjs
Prettier	.prettierrc, .prettierrc.json, .prettierrc.js, .prettierrc.cjs
TypeScript	tsconfig.json
🔥 Technologies Used
TypeScript: The primary language used to develop the extension.
Visual Studio Code API: Used to manage sidebars, file content, and event listeners.
Google Generative AI API: Used to analyze source code and suggest optimizations.
File System (FS): Used to read config files and display them in the sidebar.
🛠️ Configuration
No additional configuration is required! Just install the extension and enjoy automated code optimization.

🖥️ User Interface
Optimization List: Displays possible optimizations.
Apply/Skip Buttons: Users can Apply (make the change) or Skip (ignore) optimizations.
Cache Management: View and clear the cache of skipped optimizations.
Config File Display: Displays the contents of ESLint, Prettier, and TSConfig files directly in the sidebar.
🚀 How to Contribute
Fork the repository and create a new branch (git checkout -b feature/your-feature-name).
Make your changes and write clear commit messages.
Submit a pull request with a description of the changes.
Wait for review and feedback.
🧑‍💻 Author
Huynh Quoc Bao (LTV)

"Chicken Code – Let the chicken help you optimize your code."

📞 Support
If you encounter any issues, please contact us at email.

📃 License
Chicken Code Optimizer is licensed under the MIT License. See the LICENSE file for more details.

# chicken-code
