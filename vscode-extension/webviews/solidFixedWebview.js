const { formatTextAsHTML, escapeHtml } = require('./../textFormatterToHtml');
const { getModelSelectorHTML } = require('./webviewTemplate');
const { cleanCodeFromMarkdown } = require('./../aiService');
const fs = require('fs');
const path = require('path');

function getSolidFixedWebviewContent(refactoringPlan, principle, issue, currentModel) {
    const styles = fs.readFileSync(path.resolve(__dirname, 'css/solidRecommendationStyles.css'), 'utf-8');
    const scripts = fs.readFileSync(path.resolve(__dirname, 'js/solidScripts.js'), 'utf-8');

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SOLID Refactoring: ${escapeHtml(principle)}</title>
        <style>${styles}</style>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
    </head>
        <body>
            ${getModelSelectorHTML(currentModel)}
            <div class="loading" id="loading" style="display: none;">
                <div class="spinner"></div>
            </div>
            <div class="container">
                <div class="header">
                    <h1>Refactoring: ${escapeHtml(principle)}</h1>
                    <p>Problem: ${escapeHtml(issue)}</p>
                </div>
                <div class="content">
                    <h3>New Architecture</h3>
                    <p>${replaceBackticksWithCodeTags(escapeHtml(refactoringPlan.architectureDescription || 'No architecture description provided.'))}</p>
                    
                    <h3>Created Files:</h3>
                    <ul>
                        ${refactoringPlan.refactoredClasses.map(cls => `
                            <li>
                                <strong>${cls.fileName}</strong>
                                <pre><code>${cleanCodeFromMarkdown(cls.fullCode)}</code></pre>
                                <em>Purpose: ${cls.purpose}</em>
                            </li>
                        `).join('')}
                    </ul>
                    
                    <h3>Migration steps:</h3>
                   <ol>
                        ${refactoringPlan.migrationSteps.map(step => {
                            const cleanStep = step.replace(/^\d+\.\s*/, '');
                            return `<li>${replaceBackticksWithCodeTags(cleanStep)}</li>`;
                        }).join('')}
                    </ol>
                    <div class="buttons">
                        <button class="button" id="cancelButton">Cancel</button>
                        <button class="button" id="regenerateButton">Regenerate</button>
                    </div>
                    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
                    <script>${scripts}</script>
                </div>
            </div>
        </body>
    </html>
    `;
}

function replaceBackticksWithCodeTags(text) {
    return text.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  }

module.exports = getSolidFixedWebviewContent;