const vscode = require("vscode");
const path = require('path');
const { getAIResponse } = require("./aiService");
const { logInfo, logError, logDebug } = require('./logger');
const { SolidPrinciples, getSolidRecommendationPrompt, getSolidFixPrompt } = require("./prompts");
const getSolidRecommendationWebviewContent = require('./webviews/solidRecommendationWebview');
const getSolidFixedWebviewContent = require('./webviews/solidFixedWebview');

const solidDiagnostics = vscode.languages.createDiagnosticCollection('solid-principles');

const analyzedFiles = new Map();
const analyzeTimeouts = new Map();

/**
 * Знаходить позицію класу у тексті за іменем.
 * 
 * @param {string} code - Вхідний код
 * @param {string} className - Ім'я класу для пошуку
 * @returns {Object} - Об'єкт з початковою та кінцевою позицією
 */
function findClassPosition(code, className) {
    const classPatterns = new RegExp(`\\b(class|interface)\\s+${className}\\b`, 'g');
    const match = classPatterns.exec(code);
    if (match) {
        const matchedText = match[0];
        const startPos = match.index;
        const endPos = startPos + matchedText.length;
        
        const codeBeforeMatch = code.substring(0, startPos);
        const lines = codeBeforeMatch.split('\n');
        const line = lines.length;
        const character = lines[lines.length - 1].length;
        
        const matchedLines = matchedText.split('\n');
        const endLine = line + matchedLines.length - 1;
        const endCharacter = matchedLines.length > 1 
            ? matchedLines[matchedLines.length - 1].length 
            : character + matchedText.length;
        
        return {
            line: line,
            endLine: endLine,
            character: character,
            endCharacter: endCharacter,
            startPos: startPos,
            endPos: endPos
        };
    }
    return null;
}

/**
 * Аналізує код на відповідність принципам SOLID.
 * 
 * @param {string} code - Код для аналізу
 * @param {string} languageId - Ідентифікатор мови програмування
 * @param {string} principle - Принцип SOLID для аналізу (або 'ALL' для всіх)
 * @param {string} model - Модель AI для використання
 * @returns {Promise<Object[]>} - Масив знайдених проблем
 */
async function analyzeSolidPrinciples(code, languageId, principle = 'ALL', model) {
    logInfo(`Analyzing ${languageId} code for ${principle} principle`);
    
    const supportedLanguages = ['java', 'python', 'javascript', 'typescript'];
    if (!supportedLanguages.includes(languageId)) {
        logInfo(`Language ${languageId} is not supported for SOLID analysis`);
        return [];
    }
    
    let principles = [];
    if (principle === 'ALL') {
        principles = Object.values(SolidPrinciples);
    } else {
        principles = [SolidPrinciples[principle]];
    }
    
    let allIssues = [];
    
    for (const p of principles) {
        logDebug(`Analyzing for ${p.name}`);
        try {
            const response = await getAIResponse(code, p.prompt, model);
            logDebug(`Received response for ${p.name}`);
            logDebug(`Received response: ${response}`);
            
            let issues = [];
            try {
                const jsonStart = response.indexOf('[');
                const jsonEnd = response.lastIndexOf(']') + 1;
                
                if (jsonStart !== -1 && jsonEnd !== -1) {
                    const jsonStr = response.substring(jsonStart, jsonEnd);
                    issues = JSON.parse(jsonStr);
                    //logDebug(`Parsed issues from substring successfully: ${JSON.stringify(issues, null, 2)}`);
                } else {
                    issues = JSON.parse(response);
                    //logDebug(`Parsed issues from full response successfully: ${JSON.stringify(issues, null, 2)}`);
                }
                
                const validIssues = [];
                
                for (const issue of issues) {
                    issue.principle = p.name;
                    issue.principleKey = Object.keys(SolidPrinciples).find(key => 
                        SolidPrinciples[key] === p);
                    
                    const classPosition = findClassPosition(code, issue.name);
                    if (classPosition) {
                        issue.line = classPosition.line;
                        issue.endLine = classPosition.endLine;
                        issue.character = classPosition.character;
                        issue.endCharacter = classPosition.endCharacter;
                        validIssues.push(issue);
                    } else {
                        logError(`Could not find position for class "${issue.name}". Skipping this issue.`);
                    }
                }

                const seenClasses = new Set();
                const uniqueIssues = validIssues.filter(issue => seenClasses.has(issue.name) ? false : seenClasses.add(issue.name));

                logDebug(`Found ${uniqueIssues.length} valid unique issues for ${p.name}`);
                allIssues.push(...uniqueIssues);
            } catch (parseError) {
                logError(`Failed to parse issues for ${p.name}: ${parseError.message}`);
                logDebug(`Raw response: ${response}`);
            }
        } catch (error) {
            logError(`Failed to analyze for ${p.name}: ${error.message}`);
            if (error.stack) logDebug(error.stack);
        }
    }
    
    logInfo(`Found ${allIssues.length} SOLID issues`);
    return allIssues;
}

/**
 * Показує діагностики для знайдених проблем.
 * 
 * @param {Object[]} issues - Знайдені проблеми
 * @param {vscode.TextDocument} document - Документ, який аналізується
 */
function showDiagnostics(issues, document) {
    const diagnostics = [];
    
    issues.forEach(issue => {
        try {
            const startLine = Math.max(0, (issue.line || 1) - 1);
            const endLine = Math.max(startLine, (issue.endLine || issue.line || 1) - 1);
            
            const startChar = Math.max(0, issue.character || 0);
            const endChar = issue.endCharacter || document.lineAt(endLine).text.length;
            
            const range = new vscode.Range(
                new vscode.Position(startLine, startChar),
                new vscode.Position(endLine, endChar)
            );
            
            const diagnostic = new vscode.Diagnostic(
                range,
                `${issue.principle}: ${issue.issue}`,
                vscode.DiagnosticSeverity.Warning
            );
            
            diagnostic.source = 'SOLID Analyzer';
            diagnostic.code = issue.principleKey || 'SOLID';
            diagnostic.issue = issue.issue;
            
            diagnostic.relatedInformation = [
                new vscode.DiagnosticRelatedInformation(
                    new vscode.Location(document.uri, range),
                    `Recommendation: ${issue.solution}`
                )
            ];

            diagnostic.tags = [vscode.DiagnosticTag.Unnecessary];
            diagnostics.push(diagnostic);
        } catch (error) {
            logError(`Error creating diagnostic for issue: ${error.message}`);
            if (error.stack) logDebug(error.stack);
        }
    });

    solidDiagnostics.set(document.uri, diagnostics);
}

/**
 * Очищає всі діагностики для документа.
 * 
 * @param {vscode.TextDocument} document - Документ для очищення діагностик
 */
function clearDiagnostics(document) {
    solidDiagnostics.delete(document.uri);
}

/**
 * Автоматично аналізує документ на відповідність SOLID принципам.
 * Викликається при відкритті документа та при його зміні.
 * 
 * @param {vscode.TextDocument} document - Документ для аналізу
 */
async function automaticSolidAnalysis(document) {
    logDebug(`Analyzing document: ${document.uri.toString()}`);
    
    const config = vscode.workspace.getConfiguration('aiCodeAssistant');
    const enableAutoAnalysis = config.get('enableAutoSolidAnalysis', true);
    
    if (!enableAutoAnalysis) {
        logDebug(`Skipping analysis (auto analysis disabled)`);
        return;
    }

    const supportedLanguages = ['java', 'python', 'javascript', 'typescript'];

    if (!supportedLanguages.includes(document.languageId)) {
        logDebug(`Language ${document.languageId} is not supported for SOLID analysis`);
        return;
    }

    // Дебаунсінг: відкладаємо аналіз на 2 секунди після останньої зміни
    const timeoutId = setTimeout(async () => {
        try {
            const documentText = document.getText();
            const documentHash = hashCode(documentText);
            
            if (analyzedFiles.get(document.uri.toString()) === documentHash) {
                logDebug(`Skipping analysis for unchanged document: ${document.uri.toString()}`);
                return;
            }
            
            vscode.window.setStatusBarMessage('$(sync~spin) Analysis of SOLID principles...', 5000);
            
            const model = config.get('defaultModel');
            
            clearDiagnostics(document);
            
            const issues = await analyzeSolidPrinciples(documentText, document.languageId, 'ALL', model);
            
            if (issues.length > 0) {
                showDiagnostics(issues, document);
                vscode.window.setStatusBarMessage(`$(alert) Found ${issues.length} SOLID principles issues`, 3000);
            } else {
                vscode.window.setStatusBarMessage('$(check) The code corresponds to SOLID principles', 5000);
            }
            
            analyzedFiles.set(document.uri.toString(), documentHash);
        } catch (error) {
            logError(`Auto analysis failed: ${error.message}`);
            if (error.stack) logDebug(error.stack);
            vscode.window.setStatusBarMessage('$(error) Error with SOLID principles analysis', 5000);
        }
    }, 2000);
    analyzeTimeouts.set(document.uri.toString(), timeoutId);
}

/**
 * Генерує хеш-код для рядка (для відстеження змін у документі)
 * 
 * @param {string} str - Рядок для хешування
 * @returns {number} - Хеш-код
 */
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

/**
 * Реєструє обробники подій для автоматичного аналізу документів.
 * 
 * @param {vscode.ExtensionContext} context - Контекст розширення
 */
function registerDocumentListeners(context) {
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(document => {
            automaticSolidAnalysis(document);
        })
    );
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            automaticSolidAnalysis(event.document);
        })
    );
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                automaticSolidAnalysis(editor.document);
            }
        })
    );
    vscode.workspace.textDocuments.forEach(document => {
        automaticSolidAnalysis(document);
    });
}

/**
 * Реєструє швидкі дії (Quick Fixes) для виправлення SOLID проблем.
 * 
 * @param {vscode.ExtensionContext} context - Контекст розширення
 */
function registerSolidQuickFixes(context) {
    const fixProvider = vscode.languages.registerCodeActionsProvider(
        { pattern: '**/*' },
        {
            provideCodeActions(document, range, context, token) {
                const actions = [];
                
                const diagnostics = context.diagnostics.filter(
                    diag => diag.source === 'SOLID Analyzer'
                );
                
                if (diagnostics.length === 0) {
                    return actions;
                }
                
                diagnostics.forEach(diagnostic => {
                    const showAction = new vscode.CodeAction(
                        `Show detailed recommendation for ${diagnostic.code}`,
                        vscode.CodeActionKind.QuickFix
                    );
                    
                    let recommendation = '';
                    if (diagnostic.relatedInformation && diagnostic.relatedInformation.length > 0) {
                        recommendation = diagnostic.relatedInformation[0].message;
                    }
                    
                    showAction.command = {
                        command: 'ai-code-assistant.showSolidRecommendation',
                        title: 'Show recommendation',
                        arguments: [recommendation, vscode.window.activeTextEditor?.document, diagnostic]
                    };
                    
                    actions.push(showAction);
                    
                    const fixAction = new vscode.CodeAction(
                        `Suggest a fix for ${diagnostic.code}`,
                        vscode.CodeActionKind.QuickFix
                    );
                    
                    fixAction.command = {
                        command: 'ai-code-assistant.suggestSolidFix',
                        title: 'Suggest a fix',
                        arguments: [document, diagnostic.range, diagnostic.code, diagnostic.message, recommendation]
                    };
                    
                    actions.push(fixAction);
                });
                
                return actions;
            }
        }
    );
    
    const showRecommendationCmd = vscode.commands.registerCommand(
        'ai-code-assistant.showSolidRecommendation',
        async (recommendation, document, diagnostic) => {
            try {
                if (!document && vscode.window.activeTextEditor) {
                    document = vscode.window.activeTextEditor.document;
                }
                
                const config = vscode.workspace.getConfiguration('aiCodeAssistant');
                const model = config.get('defaultModel');
                
                vscode.window.setStatusBarMessage('$(sync~spin) Getting detailed recommendation...', 5000);
                
                const principleCode = diagnostic ? diagnostic.code : 'SOLID';
                const issue = diagnostic ? diagnostic.issue : recommendation;
                
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: "Getting detailed recommendation...",
                    cancellable: false
                }, async (progress) => {
                    const prompt = getSolidRecommendationPrompt(principleCode, issue, recommendation);
                    logDebug(`Prompt for detailed recommendation: ${prompt}`);

                    const detailedRecommendation = await getAIResponse(document.getText(), prompt, model);
                    logDebug(`Received detailed recommendation: ${detailedRecommendation}`);

                    const panel = vscode.window.createWebviewPanel(
                        "solidRecommendation",
                        `Detailed recommendation: ${principleCode}`,
                        vscode.ViewColumn.Beside,
                        {
                            enableScripts: true,
                            retainContextWhenHidden: true,
                        }
                    );
                    
                    panel.webview.html = getSolidRecommendationWebviewContent(principleCode, issue, detailedRecommendation, model);

                    panel.webview.onDidReceiveMessage(async (message) => {
                        logDebug(`Received webview message: ${message.command}`);
                        switch (message.command) {
                            case "cancel":
                                logInfo("User canceled operation");
                                panel.dispose();
                                vscode.window.showInformationMessage("Changes have been canceled.");
                                break;
                            
                            case "changeModel":
                                logInfo(`User changed model to: ${message.model}`);
                                let newModel = message.model || model;
                                logInfo(`Model changed to: ${newModel}`);
                                
                                panel.webview.postMessage({ command: "showLoading" });
                                try {
                                    const prompt = getSolidRecommendationPrompt(principleCode, issue, recommendation);
                                    const newDetailedRecommendation = await getAIResponse(document.getText(), prompt, newModel);
                                    panel.webview.html = getSolidRecommendationWebviewContent(principleCode, issue, newDetailedRecommendation, newModel);
                                    logInfo(`Recommendation regenerated with model: ${newModel}`);
                                } catch (error) {
                                    logError(`Error regenerating with new model: ${error.message}`);
                                    panel.webview.postMessage({ command: "hideLoading" });
                                    vscode.window.showErrorMessage(`Failed to regenerate recommendation: ${error.message}`);
                                }
                                break;
                            
                            case "regenerate":
                                logInfo("User requested regeneration");
                                panel.webview.postMessage({ command: "showLoading" });
                                try {
                                    const prompt = getSolidRecommendationPrompt(principleCode, issue, recommendation);
                                    const regeneratedRecommendation = await getAIResponse(document.getText(), prompt, model);
                                    panel.webview.html = getSolidRecommendationWebviewContent(principleCode, issue, regeneratedRecommendation, model);
                                    logInfo("Recommendation regeneration completed");
                                } catch (error) {
                                    logError(`Error regenerating recommendation: ${error.message}`);
                                    panel.webview.postMessage({ command: "hideLoading" });
                                    vscode.window.showErrorMessage(`Failed to regenerate recommendation: ${error.message}`);
                                }
                                break;

                            default:
                                logError(`Unknown command received: ${message.command}`);
                                break;
                        }
                    });
                });
                vscode.window.setStatusBarMessage('$(check) Detailed recommendation is ready', 5000);
            } catch (error) {
                logError(`Failed to get detailed recommendation: ${error.message}`);
                if (error.stack) logDebug(error.stack);
                vscode.window.showErrorMessage(`Error while receiving detailed recommendation: ${error.message}`);
            }
        }
    );

    const suggestSolidFix = vscode.commands.registerCommand(
        'ai-code-assistant.suggestSolidFix',
        async (document, range, principle, issue, recommendation) => {
            try {
                const fullDocumentText = document.getText();
                const codeToFix = document.getText();
                const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
                let model = vscode.workspace.getConfiguration('aiCodeAssistant').get('defaultModel');

                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: "Preparing SOLID fix suggestion...",
                    cancellable: false
                }, async (progress) => {

                    const comprehensiveRefactoringPrompt = getSolidFixPrompt(principle, issue, recommendation, codeToFix, document.languageId);
                    logDebug(`Comprehensive refactoring prompt: ${comprehensiveRefactoringPrompt}`);

                    const refactoringResponse = await getAIResponse(fullDocumentText, comprehensiveRefactoringPrompt, model);
                    logDebug(`Received refactoring response: ${refactoringResponse}`);

                    const refactoringPlan = JSON.parse(refactoringResponse);
                    logDebug(`Parsed refactoring plan: ${JSON.stringify(refactoringPlan, null, 2)}`);

                    const panel = vscode.window.createWebviewPanel(
                        'solidRefactoring',
                        `Refactoring: ${principle}`,
                        vscode.ViewColumn.Beside,
                        { enableScripts: true }
                    );
        
                    panel.webview.html = getSolidFixedWebviewContent(refactoringPlan, principle, issue, model);
                    panel.webview.onDidReceiveMessage(async (message) => {
                        logDebug(`Received webview message: ${message.command}`);
                        switch (message.command) {
                            case "cancel":
                                logInfo("User canceled operation");
                                panel.dispose();
                                vscode.window.showInformationMessage("Changes have been canceled.");
                                break;
                            
                            case "changeModel":
                                logInfo(`User changed model to: ${message.model}`);
                                model = message.model || model;
                                logInfo(`Model changed to: ${model}`);
                                
                                panel.webview.postMessage({ command: "showLoading" });
                                try {
                                    const prompt = getSolidFixPrompt(principle, issue, recommendation, codeToFix, document.languageId);
                                    const newResponse = await getAIResponse(fullDocumentText, prompt, model);
                                    logDebug(`Received SOLID fix suggestion response: ${newResponse}`);
                                    const newRefactoringPlan = JSON.parse(escapeQuotesInCode(newResponse));
                                    logDebug(`Parsed sanitized refactoring plan: ${newRefactoringPlan}`);
                                    panel.webview.html = getSolidFixedWebviewContent(newRefactoringPlan, principle, issue, model);
                                    panel.webview.postMessage({ command: "hideLoading" });
                                    logInfo(`SOLID fix suggestion regenerated with model: ${model}`);
                                } catch (error) {
                                    logError(`Error regenerating with new model: ${error.message}`);
                                    panel.webview.postMessage({ command: "hideLoading" });
                                    vscode.window.showErrorMessage(`Failed to regenerate fix suggestion`);
                                    if (error.stack) logDebug(error.stack);
                                }
                                break;
                            
                            case "regenerate":
                                logInfo("User requested regeneration");
                                panel.webview.postMessage({ command: "showLoading" });
                                try {
                                    const prompt = getSolidFixPrompt(principle, issue, recommendation, codeToFix, document.languageId);
                                    const newResponse = await getAIResponse(fullDocumentText, prompt, model);
                                    logDebug(`Received SOLID fix suggestion response: ${newResponse}`);
                                    const newRefactoringPlan = JSON.parse(newResponse);
                                    logDebug(`Parsed sanitized refactoring plan: ${newRefactoringPlan}`);
                                    panel.webview.html = getSolidFixedWebviewContent(newRefactoringPlan, principle, issue, model);
                                    panel.webview.postMessage({ command: "hideLoading" });
                                    logInfo("SOLID fix suggestion regenerated");
                                } catch (error) {
                                    logError(`Error regenerating fix suggestion: ${error.message}`);
                                    panel.webview.postMessage({ command: "hideLoading" });
                                    vscode.window.showErrorMessage(`Failed to regenerate fix suggestion`);
                                    if (error.stack) logDebug(error.stack);
                                }
                                break;

                            default:
                                logError(`Unknown command received: ${message.command}`);
                                break;
                        }
                    });
                });
                vscode.window.setStatusBarMessage('$(check) SOLID fix suggestion is ready', 5000);
            } catch (error) {
                vscode.window.showErrorMessage(
                    `Error SOLID fix suggestion`
                );
                logError(`Error SOLID fix suggestion: ${message.command}`);
            }
        }
    );
    
    context.subscriptions.push(fixProvider, showRecommendationCmd, suggestSolidFix);
}

function escapeQuotesInCode(jsonString) {
    return jsonString.replace(/"fullCode": "(.*?)",\s*"purpose"/gs, function(match, codeContent) {
        let escapedContent = codeContent.replace(/([^\\])(")(?=[^\\])/g, '$1\\"');
        if (escapedContent.startsWith('"') && !escapedContent.startsWith('\\"')) {
        escapedContent = '\\' + escapedContent;
        }
        return '"fullCode": "' + escapedContent + '",\n"purpose"';
    });
}

module.exports = {
    registerSolidQuickFixes,
    registerDocumentListeners
};