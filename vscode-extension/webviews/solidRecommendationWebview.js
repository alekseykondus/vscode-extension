const { formatTextAsHTML, escapeHtml } = require('./../textFormatterToHtml');
const { getModelSelectorHTML } = require('./webviewTemplate');
const fs = require('fs');
const path = require('path');

/**
 * Отримує HTML-контент для вебв'ю відображення SOLID рекомендацій
 * @param {string} principleCode - Код принципу SOLID
 * @param {string} issue - Опис проблеми
 * @param {string} detailedRecommendation - Детальна рекомендація від AI
 * @returns {string} - HTML-контент
 */
function getSolidRecommendationWebviewContent(principleCode, issue, detailedRecommendation, currentModel) {
    const cssPath = path.resolve(__dirname, 'css/solidRecommendationStyles.css');
    const styles = fs.readFileSync(cssPath, 'utf-8');
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
                <script>
                    const vscode = acquireVsCodeApi();
                    const cancelButton = document.getElementById('cancelButton');
                    const regenerateButton = document.getElementById('regenerateButton');

                    document.getElementById('cancelButton').addEventListener('click', () => {
                        vscode.postMessage({ command: 'cancel' });
                    });

                    document.getElementById('regenerateButton').addEventListener('click', () => {
                        document.body.style.overflow = 'hidden';
                        document.getElementById('loading').style.display = 'flex';
                        cancelButton.disabled = true;
                        regenerateButton.disabled = true;
                        vscode.postMessage({ command: 'regenerate' });
                    });

                    function changeModel() {
                        const model = document.getElementById('model').value;
                        document.getElementById('loading').style.display = 'flex';
                        document.body.style.overflow = 'hidden';
                        cancelButton.disabled = true;
                        regenerateButton.disabled = true;
                        vscode.postMessage({ command: 'changeModel', model: model });
                    }

                    window.addEventListener('message', event => {
                        const message = event.data;

                        if (message.command === "showLoading") {
                            document.body.style.overflow = 'hidden';
                            document.getElementById('loading').style.display = 'flex';
                            cancelButton.disabled = true;
                            regenerateButton.disabled = true;
                        } else if (message.command === "hideLoading") {
                            document.body.style.overflow = 'auto';
                            document.getElementById('loading').style.display = 'none';
                            cancelButton.disabled = false;
                            regenerateButton.disabled = false;
                        }
                    });

                    document.addEventListener('DOMContentLoaded', (event) => {
                        if (typeof hljs !== 'undefined') {
                            document.querySelectorAll('pre code').forEach(el => {
                                hljs.highlightElement(el);
                            });
                        }
                    });
                </script>
            </body>
            </html>
            `;
}

module.exports = getSolidRecommendationWebviewContent;