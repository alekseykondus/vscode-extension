const vscode = require("vscode");
const { getAIResponse, checkModelByTokenCount } = require("./aiService");
const { setupLogger, logInfo, logError, logDebug } = require('./logger');


// Залежності для парсингу AST
// TODO: Для JavaScript const { parse: parseJS } = require("@babel/parser"); // Для JavaScript
const { extractJavadocsFromProcessed, insertJavadocsUsingAST } = require("./javadocInserter");
const { extractDocstringsFromProcessed, insertDocstringsUsingAST } = require("./pythondocInserter");
const { documentationPrompts, refactoringPrompts, explanationPrompts, generationPrompts, testingPrompts } = require("./prompts");
const { getWebviewContent } = require("./webviewTemplate");

let currentModel = vscode.workspace.getConfiguration('aiCodeAssistant').get('defaultModel');
function getPrompt(prompts, languageId) {
    return prompts[languageId] || prompts.default;
}
	
function extractDocumentation(originalCode, processedCode, languageId) {
    logDebug("Starting documentation extraction...");
    logDebug("---------------------------------------------------");
	logDebug("originalCode" + originalCode);
	logDebug("-------------------------------------------------------");
	logDebug("processedCode" + processedCode);
	logDebug("---------------------------------------------------");

    let updatedCode = originalCode;
    try {
        if (languageId === "java") {
            logDebug("Building AST for Java code");
            const javadocs = extractJavadocsFromProcessed(processedCode);
            logDebug(`Extracted ${javadocs.length} Javadoc comments`);
            updatedCode = insertJavadocsUsingAST(originalCode, javadocs);
        }
        else if (languageId === "python") {
            logDebug("Building AST for Python code");
            const docstrings = extractDocstringsFromProcessed(processedCode);
            logDebug(`Extracted ${docstrings.length} docstrings`);
            updatedCode = insertDocstringsUsingAST(originalCode, docstrings);
        }
        else {
            updatedCode = processedCode;
            logDebug(`No AST processing for ${languageId}, using raw output`);
        }
    } catch (error) {
        logError(`Documentation processing failed: ${error.message}`);
        if (error.stack) logDebug(error.stack);
        return originalCode;
    }

    logDebug("Documentation extraction completed");
    return updatedCode;
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    setupLogger(context);
    
    logInfo("Extension activated");

    const commands = [
        { command: "ai-code-assistant.generateCodeDocumentation", handler: handleCodeDocumentation },
        { command: "ai-code-assistant.refactorCode", handler: handleCodeRefactoring },
        { command: "ai-code-assistant.generateExplanation", handler: handleCodeExplanation},
        { command: "ai-code-assistant.generateCodeFromSignature", handler: handleCodeGeneration },
        { command: "ai-code-assistant.generateTests", handler: handleGenerateTests }
    ];

    commands.forEach(({ command, handler }) => {
        const disposable = vscode.commands.registerCommand(command, () => {
            logInfo(`Command executed: ${command}`);
            handler().catch(error => {
                logError(`Command ${command} failed: ${error.message}`);
                if (error.stack) logDebug(error.stack);
                vscode.window.showErrorMessage(`Error executing command: ${error.message}`);
            });
        });
        context.subscriptions.push(disposable);
    });
}

async function handleCodeDocumentation() {
    try {
        const editor = vscode.window.activeTextEditor;
        const languageId = editor?.document.languageId || "default";
        logInfo(`Starting documentation generation for ${languageId}`);
        await processSelectedCode(getPrompt(documentationPrompts, languageId), "Code Documentation", true, languageId);
        logInfo(`Documentation generation completed for ${languageId}`);
    } catch (error) {
        logError(`Documentation generation failed: ${error.message}`);
        if (error.stack) logDebug(error.stack);
        vscode.window.showErrorMessage("Failed to generate documentation");
    }
}

async function handleCodeRefactoring() {
    try {
        const editor = vscode.window.activeTextEditor;
        const languageId = editor?.document.languageId || "default";
        logInfo(`Starting code refactoring for ${languageId}`);
        await processSelectedCode(getPrompt(refactoringPrompts, languageId), "Refactored Code");
        logInfo(`Code refactoring completed for ${languageId}`);
    } catch (error) {
        logError(`Refactoring failed: ${error.message}`);
        if (error.stack) logDebug(error.stack);
        vscode.window.showErrorMessage("Failed to refactor code");
    }
}

async function handleCodeExplanation() {
    try {
        const editor = vscode.window.activeTextEditor;
        const languageId = editor?.document.languageId || "default";
        logInfo(`Starting code explanation for ${languageId}`);
        await processSelectedCode(getPrompt(explanationPrompts, languageId), "Code Explanation");
        logInfo(`Code explanation completed for ${languageId}`);
    } catch (error) {
        logError(`Explanation failed: ${error.message}`);
        if (error.stack) logDebug(error.stack);
        vscode.window.showErrorMessage("Failed to generate explanation");
    }
}

async function handleCodeGeneration() {
    try {
        const editor = vscode.window.activeTextEditor;
        const languageId = editor?.document.languageId || "default";
        logInfo(`Starting code generation for ${languageId}`);
        await processSelectedCode(getPrompt(generationPrompts, languageId), "Generated Code");
        logInfo(`Code generation completed for ${languageId}`);
    } catch (error) {
        logError(`Generation failed: ${error.message}`);
        if (error.stack) logDebug(error.stack);
        vscode.window.showErrorMessage("Failed to generate code");
    }
}

async function handleGenerateTests() {
    try {
        const editor = vscode.window.activeTextEditor;
        const languageId = editor?.document.languageId || "default";
        logInfo(`Starting test generation for ${languageId}`);
        await processSelectedCode(getPrompt(testingPrompts, languageId), "Generated Tests", false, languageId);
        logInfo(`Test generation completed for ${languageId}`);
    } catch (error) {
        logError(`Test generation failed: ${error.message}`);
        if (error.stack) logDebug(error.stack);
        vscode.window.showErrorMessage("Failed to generate tests");
    }
}

async function processSelectedCode(prompt, panelTitle, isDocumentation = false, languageId) {
    logDebug(`Starting processSelectedCode for ${panelTitle}`);
    logDebug(`Parameters: isDocumentation=${isDocumentation}, language=${languageId}`);

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        logError("No active text editor");
        vscode.window.showInformationMessage("Open the file in the editor.");
        return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
        logError("Empty text selection");
        vscode.window.showInformationMessage("Select text before calling the command.");
        return;
    }

	logDebug(`Text selection: ${selection.start.line}:${selection.start.character}-${selection.end.line}:${selection.end.character}`);
    const selectedText = editor.document.getText(selection);
    logDebug(`Selected text length: ${selectedText.length} characters`);
    const previousModel = currentModel;
    currentModel = checkModelByTokenCount(selectedText, currentModel, vscode);
    logInfo(`Model selected: ${currentModel} ${previousModel !== currentModel ? `(changed from ${previousModel})` : ''}`);

    logDebug("Sending request to AI...");
    const processedCode = await getAIResponse(selectedText, prompt, currentModel);
    logDebug(`AI response received (${processedCode.length} characters)`);

    let finalCode = processedCode;
    if (isDocumentation) {
        logDebug(`Starting documentation processing for ${languageId}`);
        finalCode = extractDocumentation(selectedText, processedCode, languageId);
        logDebug(`Documentation processing completed. Result length: ${finalCode.length} characters`);
    }

    logDebug(`Creating webview panel: ${panelTitle}`);
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
    logDebug("Webview content initialized");

    panel.webview.onDidReceiveMessage(async (message) => {
        logDebug(`Received webview message: ${message.command}`);
        switch (message.command) {
            case "cancel":
                logInfo("User canceled operation");
                panel.dispose();
                vscode.window.showInformationMessage("Changes have been canceled.");
                break;
            case "approve":
                logInfo("User approved changes");
                const newText = message.updatedCode;
                editor.edit(editBuilder => {
                    editBuilder.replace(selection, newText);
                });
                panel.dispose();
                vscode.window.showInformationMessage("Code updated.");
                break;

            case "changeModel":
                logInfo(`User changed model to: ${message.model}`);
                currentModel = message.model || currentModel;
                console.log("Model changed to: ", message.model);

                // Показываем индикатор загрузки через JS
                panel.webview.postMessage({ command: "showLoading" });
                currentModel = checkModelByTokenCount(selectedText, currentModel, vscode);
                logDebug("Regenerating code with new model...");

                const newProcessedCode = await getAIResponse(selectedText, prompt, currentModel);
                const finalCode = isDocumentation ? extractDocumentation(selectedText, newProcessedCode, languageId) : newProcessedCode;
                panel.webview.postMessage({ command: "updateCode", code: finalCode, model: currentModel });
                logInfo(`Code regenerated with model: ${currentModel}`);
                break;

            case "regenerate":
                logInfo("User requested regeneration");
                panel.webview.postMessage({ command: "showLoading" });
                currentModel = checkModelByTokenCount(selectedText, currentModel, vscode);

                logDebug("Regenerating code...");
                const regeneratedCode = await getAIResponse(selectedText, prompt, currentModel);
                const updatedCode = isDocumentation ? extractDocumentation(selectedText, regeneratedCode, languageId) : regeneratedCode;
                panel.webview.postMessage({ command: "updateCode", code: updatedCode, model: currentModel });
                logInfo("Code regeneration completed");
                break;

            case "copy":
                logInfo("User copied tests to clipboard");
                vscode.env.clipboard.writeText(message.code).then(() => {
                    vscode.window.showInformationMessage("Tests copied to clipboard!");
                });
                break;
            
            default:
                logError(`Unknown command received: ${message.command}`);
                break;
        }
    });
}


function deactivate() {}

module.exports = {
    activate,
    deactivate
};
