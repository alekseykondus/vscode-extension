# AI Code Assistant

🚀 **Supercharge your coding workflow** with the **AI Code Assistant**, a powerful Visual Studio Code extension designed to streamline development for JavaScript, Python, and Java. Generate documentation, refactor code, explain logic, create tests, and ensure SOLID principles—all with a few clicks.

## ✨ Features

- 📝 **Auto-Generate Documentation**: Create detailed, professional documentation for JavaScript, Python, and Java code.
- 🔄 **Smart Refactoring**: Improve code readability, performance, and maintainability with AI-powered suggestions.
- 🧠 **Line-by-Line Explanations**: Understand complex code with clear, concise breakdowns.
- ⚙️ **Code from Signatures**: Generate functional code from function signatures in seconds.
- 🧪 **Unit Test Generation**: Automatically create unit tests for JavaScript, Python, and Java projects.
- 🏛️ **SOLID Principle Analysis**: Analyze code for SOLID compliance and get actionable suggestions to improve design.

## 🛠️ Requirements

- **Visual Studio Code** version **1.97.0** or higher.

## 🎮 Commands

Unlock the full power of AI Code Assistant with these commands:

| Command                                       | Description                              |
|-----------------------------------------------|------------------------------------------|
| `ai-code-assistant.generateCodeDocumentation` | Generate detailed code documentation.    |
| `ai-code-assistant.refactorCode`              | Refactor code for better quality.        |
| `ai-code-assistant.generateExplanation`       | Explain code line by line.               |
| `ai-code-assistant.generateCodeFromSignature` | Generate code from a function signature. |
| `ai-code-assistant.generateTests`             | Create unit tests automatically.         |
| `ai-code-assistant.showSolidRecommendation`   | Analyze SOLID principles compliance.     |
| `ai-code-assistant.suggestSolidFix`           | Suggest fixes for SOLID violations.      |

## ⚙️ Configuration

The extension can be configured through the settings.json file in the .vscode directory. The following settings are available:

| Setting                                   | Description                                                    |
|-------------------------------------------|----------------------------------------------------------------|
| `aiCodeAssistant.debugMode`               | Enable/disable debug logging (`true`/`false`).                 |
| `aiCodeAssistant.defaultModel`            | Specify the default AI model for processing (e.g., `"grok-2-latest"`). |
| `aiCodeAssistant.enableAutoSolidAnalysis` | Toggle automatic SOLID principle analysis (`true`/`false`).    |

Example:
```json
{
  "aiCodeAssistant.debugMode": false,
  "aiCodeAssistant.defaultModel": "grok-2-latest",
  "aiCodeAssistant.enableAutoSolidAnalysis": true
}
```

## 🐞 Known Issues

- The extension currently supports only JavaScript, Python, and Java for documentation generation and refactoring.
- SOLID principle analysis is limited to Java, Python, JavaScript, and TypeScript.

## 📜 Release Notes

### 🎉 1.0.0

**Initial Release**  
Launched with core features:
- Documentation generation
- Code refactoring
- Line-by-line explanations
- Code generation from signatures
- Unit test creation
- SOLID principle analysis


## 🚀 Get Started

1. Install the extension from the [VS Code Marketplace](https://marketplace.visualstudio.com/).
2. Open a JavaScript, Python, or Java file.
3. Select the desired piece of code and use the command palette (`Ctrl+Shift+P`) to run any `ai-code-assistant` command.

**Enjoy coding smarter with AI Code Assistant!**  
Have feedback or ideas? [Let us know](https://github.com/alekseykondus/vscode-extension/issues)!
