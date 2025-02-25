const vscode = require("vscode");
const OpenAI = require("openai");
require("dotenv").config({ path: __dirname + "/.env" });

// Залежності для парсингу AST
const { parse: parseJS } = require("@babel/parser"); // Для JavaScript
// Временно без python const PythonAst = require("ast"); // Для Python (вимагає додаткової інтеграції з Python через child_process)
const { extractJavadocsFromProcessed, insertJavadocsUsingAST } = require("./javadocInserter");

// TODO: добавить поддержку для больше языков программирования, поправить prompts и протестировать
const documentationPrompts = {
    javascript: "Generate detailed documentation for the following JavaScript code without modifying the original code. Add the documentation as JSDoc comments above the relevant functions, classes, or variables. Include a description of the purpose, parameters, return values, and usage examples in JSDoc format.",
    python: "Create comprehensive documentation for the following Python code without altering the original code. Add the documentation as docstrings in Google style above the relevant functions or classes. Include a function/class description, parameters, return values, and examples, leaving the code itself unchanged.",
    java: "Produce detailed documentation for the following Java code without changing the original code. Add the documentation as Javadoc comments above the relevant classes, methods, or fields. Include descriptions of the class/method purpose, parameters, return types, exceptions, and examples, preserving the code as is.",
    default: "Generate detailed documentation for the following code without modifying the original code. Add the documentation as comments above the relevant sections, including a description of its purpose, inputs, outputs, and a simple usage example, while keeping the code unchanged."
};

const refactoringPrompts = {
    javascript: "Refactor the following JavaScript code to improve readability, performance, and maintainability. Use modern ES6+ features where applicable and follow best practices.",
    python: "Refactor the following Python code to enhance clarity, efficiency, and adherence to PEP 8 style guidelines. Optimize where possible.",
    java: "Refactor the following Java code to improve structure, readability, and efficiency. Apply object-oriented principles and Java naming conventions.",
    default: "Refactor the following code to make it more readable, efficient, and maintainable, following best practices for its programming language."
};

const explanationPrompts = {
    javascript: "Explain the following JavaScript code line-by-line by adding detailed comments above each line, describing what it does and why.",
    python: "Provide a line-by-line explanation of the following Python code by adding clear, concise comments above each line, detailing its functionality.",
    java: "Annotate the following Java code with detailed comments above each line, explaining its purpose and behavior in the context of the program.",
    default: "Add detailed comments above each line of the following code, explaining what each line does and its role in the overall logic."
};



const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, 
});

async function getChatGPTResponse(code, prompt) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: `${prompt}\n\n${code}` }],
            temperature: 0.7,
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error("Error requesting OpenAI:", error);
        return "Error retrieving documentation.";
    }
}

function getPrompt(prompts, languageId) {
    return prompts[languageId] || prompts.default;
}

// Функція для витягання документації з відповіді моделі
function extractDocumentation(originalCode, processedCode, languageId) {
	console.log("---------------------------------------------------");
	console.log("originalCode", originalCode);
	console.log("---------------------------------------------------");
	console.log("processedCode", processedCode);
	console.log("---------------------------------------------------");

    let updatedCode = originalCode;
	try {
        if (languageId === "java") {
            console.log("Started building AST for Java");
            const javadocs = extractJavadocsFromProcessed(processedCode);
            console.log("Extracted Javadocs:", javadocs);
            updatedCode = insertJavadocsUsingAST(originalCode, javadocs);
            console.log("Updated Code:\n", updatedCode);
        } else {
            console.log(`No processing implemented for language: ${languageId}. Returning original code.`);
        }
    } catch (error) {
        console.error(`Error processing ${languageId} code:`, error.message);
        return originalCode;
    }

    return updatedCode;
}


/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    const commands = [
        { command: "new-extension.generateCodeDocumentation", handler: handleCodeDocumentation },
        { command: "new-extension.refactorCode", handler: handleCodeRefactoring },
        { command: "new-extension.generateExplanation", handler: handleCodeExplanation}
    ];

    commands.forEach(({ command, handler }) => {
        const disposable = vscode.commands.registerCommand(command, handler);
        context.subscriptions.push(disposable);
    });
}

async function handleCodeDocumentation() {
    const editor = vscode.window.activeTextEditor;
    const languageId = editor?.document.languageId || "default";
    await processSelectedCode(getPrompt(documentationPrompts, languageId), "Code Documentation", true, languageId);
}

async function handleCodeRefactoring() {
    const editor = vscode.window.activeTextEditor;
    const languageId = editor?.document.languageId || "default";
    await processSelectedCode(getPrompt(refactoringPrompts, languageId), "Refactored Code");
}

async function handleCodeExplanation() {
    const editor = vscode.window.activeTextEditor;
    const languageId = editor?.document.languageId || "default";
    await processSelectedCode(getPrompt(explanationPrompts, languageId), "Code Explanation");
}

async function processSelectedCode(prompt, panelTitle, isDocumentation = false, languageId) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage("Open the file in the editor.");
        return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
        vscode.window.showInformationMessage("Select text before calling the command.");
        return;
    }

	console.log("-------AAAAAAAAAAAAAAAA----");
    const selectedText = editor.document.getText(selection);
    const processedCode = await getChatGPTResponse(selectedText, prompt);

    let finalCode = processedCode;
    if (isDocumentation) {
        finalCode = extractDocumentation(selectedText, processedCode, languageId);
    }

    let panel = vscode.window.createWebviewPanel(
        "codePreview",
        panelTitle,
        vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
        }
    );

    panel.webview.html = getWebviewContent(finalCode);

    panel.webview.onDidReceiveMessage(message => {
        switch (message.command) {
            case "cancel":
                panel.dispose();
                vscode.window.showInformationMessage("Changes have been canceled.");
                break;
            case "approve":
                const newText = message.updatedCode;
                editor.edit(editBuilder => {
                    editBuilder.replace(selection, newText);
                });
                panel.dispose();
                vscode.window.showInformationMessage("Code updated.");
                break;
        }
    });
}

function getWebviewContent(code) {
    return `<!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your code</title>
        <style>
            body {
                font-family: Consolas, "Courier New", monospace;
                background-color: #1e1e1e;
                color: white;
                margin: 0;
                padding: 0;
            }
            pre {
                padding: 20px;
                white-space: pre-wrap;
                word-wrap: break-word;
                background-color: #2d2d2d;
                border-radius: 4px;
                margin: 20px;
                font-size: 14px;
            }
            .buttons {
                display: flex;
                justify-content: space-between;
                padding: 10px;
                background-color: #2d2d2d;
            }
            .button {
                background-color: #007acc;
                color: white;
                border: none;
                padding: 10px;
                cursor: pointer;
                border-radius: 4px;
            }
            .button:hover {
                background-color: #005f8f;
            }
        </style>
    </head>
    <body>
        <pre id="code">${code}</pre>
        <div class="buttons">
            <button class="button" id="cancelButton">Cancel</button>
            <button class="button" id="approveButton">Approve</button>
        </div>
        <script>
            const vscode = acquireVsCodeApi();

            document.getElementById('cancelButton').addEventListener('click', () => {
                vscode.postMessage({ command: 'cancel' });
            });

            document.getElementById('approveButton').addEventListener('click', () => {
                const updatedCode = document.getElementById('code').textContent;
                vscode.postMessage({ command: 'approve', updatedCode: updatedCode });
            });
        </script>
    </body>
    </html>`;
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
