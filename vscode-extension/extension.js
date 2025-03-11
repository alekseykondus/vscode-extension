const vscode = require("vscode");
const { getAIResponse, checkModelByTokenCount } = require("./aiService");


// Залежності для парсингу AST
// TODO: Для JavaScript const { parse: parseJS } = require("@babel/parser"); // Для JavaScript
const { extractJavadocsFromProcessed, insertJavadocsUsingAST } = require("./javadocInserter");
const { extractDocstringsFromProcessed, insertDocstringsUsingAST } = require("./pythondocInserter");
const { documentationPrompts, refactoringPrompts, explanationPrompts, generationPrompts, testingPrompts } = require("./prompts");
const { getWebviewContent } = require("./webviewTemplate");


let currentModel = "gpt-3.5-turbo";

function getPrompt(prompts, languageId) {
    return prompts[languageId] || prompts.default;
}

// Функція для витягання документації з відповіді моделі
function extractDocumentation(originalCode, processedCode, languageId) {
	console.log("---------------------------------------------------");
	console.log("originalCode", originalCode);
	console.log("-------------------------------------------------------");
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
        }
        else if (languageId === "python") {
            console.log("Started building AST for Python");
            const docstrings = extractDocstringsFromProcessed(processedCode);
            console.log("Extracted Docstrings:", docstrings);
            updatedCode = insertDocstringsUsingAST(originalCode, docstrings);
            console.log("Updated Code:\n", updatedCode);
        }
        else {
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
        { command: "new-extension.generateExplanation", handler: handleCodeExplanation},
        { command: "new-extension.generateCodeFromSignature", handler: handleCodeGeneration },
        { command: "new-extension.generateTests", handler: handleGenerateTests }
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

async function handleCodeGeneration() {
    const editor = vscode.window.activeTextEditor;
    const languageId = editor?.document.languageId || "default";
    await processSelectedCode(getPrompt(generationPrompts, languageId), "Generated Code");
}

async function handleGenerateTests() {
    const editor = vscode.window.activeTextEditor;
    const languageId = editor?.document.languageId || "default";
    await processSelectedCode(getPrompt(testingPrompts, languageId), "Generated Tests", false, languageId);
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
    currentModel = checkModelByTokenCount(selectedText, currentModel, vscode);
    const processedCode = await getAIResponse(selectedText, prompt, currentModel);

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

    panel.webview.html = getWebviewContent(finalCode, currentModel, panelTitle === "Generated Tests");

    panel.webview.onDidReceiveMessage(async (message) => {
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

            case "changeModel":
                currentModel = message.model || currentModel;
                console.log("Model changed to: ", message.model);

                // Показываем индикатор загрузки через JS
                panel.webview.postMessage({ command: "showLoading" });
                currentModel = checkModelByTokenCount(selectedText, currentModel, vscode);
                const newProcessedCode = await getAIResponse(selectedText, prompt, currentModel);
                const finalCode = isDocumentation ? extractDocumentation(selectedText, newProcessedCode, languageId) : newProcessedCode;
                panel.webview.postMessage({ command: "updateCode", code: finalCode, model: currentModel });
                break;

            case "regenerate":
                panel.webview.postMessage({ command: "showLoading" });
                currentModel = checkModelByTokenCount(selectedText, currentModel, vscode);
                const regeneratedCode = await getAIResponse(selectedText, prompt, currentModel);
                const updatedCode = isDocumentation ? extractDocumentation(selectedText, regeneratedCode, languageId) : regeneratedCode;
                panel.webview.postMessage({ command: "updateCode", code: updatedCode, model: currentModel });
                break;

            case "copy":
                vscode.env.clipboard.writeText(message.code).then(() => {
                    vscode.window.showInformationMessage("Tests copied to clipboard!");
                });
                break;
        }
    });
}


function deactivate() {}

module.exports = {
    activate,
    deactivate
};
