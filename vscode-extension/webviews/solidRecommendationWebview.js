const { formatTextAsHTML, escapeHtml } = require('./../textFormatterToHtml');
const { getModelSelectorHTML } = require('./webviewTemplate');
const fs = require('fs');
const path = require('path');
const vscode = require("vscode");

/**
 * Отримує HTML-контент для вебв'ю відображення SOLID рекомендацій
 * @param {string} principleCode - Код принципу SOLID
 * @param {string} issue - Опис проблеми
 * @param {string} detailedRecommendation - Детальна рекомендація від AI
 * @returns {string} - HTML-контент
 */
function getSolidRecommendationWebviewContent(principleCode, issue, detailedRecommendation, currentModel) {
    const styles = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Light
        ? fs.readFileSync(path.resolve(__dirname, 'css/solidRecommendationStyles_LightTheme.css'), 'utf-8')
        : fs.readFileSync(path.resolve(__dirname, 'css/solidRecommendationStyles_DarkTheme.css'), 'utf-8');
    const scripts = fs.readFileSync(path.resolve(__dirname, 'js/solidScripts.js'), 'utf-8');

    return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Detailed recommendation</title>
                <style>${styles}</style>
            </head>
            <body>
                ${getModelSelectorHTML(currentModel)}
                <div class="loading" id="loading" style="display: none;">
                    <div class="spinner"></div>
                </div>
                <div class="container">
                    <div class="header">
                        <h1>Detailed recommendation for ${principleCode}</h1>
                        <p>Problem: ${escapeHtml(issue)}</p>
                    </div>
                    <div class="content">
                        ${formatTextAsHTML(detailedRecommendation)}
                    </div>
                </div>
                <div class="buttons">
                    <button class="button" id="cancelButton">Cancel</button>
                    <button class="button" id="regenerateButton">Regenerate</button>
                </div>
                <script>${scripts}</script>
            </body>
            </html>
            `;
}

module.exports = getSolidRecommendationWebviewContent;