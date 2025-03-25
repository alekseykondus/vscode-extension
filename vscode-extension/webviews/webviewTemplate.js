const OperationType = require('./../operationTypes');
const { logInfo, logError, logDebug } = require('./../logger');
const fs = require('fs');
const path = require('path');

function getWebviewContent(code, currentModel, operationType, testData = null) {
    const styles = fs.readFileSync(path.resolve(__dirname, 'css/webviewTemplateStyles.css'), 'utf-8');
    const scripts = fs.readFileSync(path.resolve(__dirname, 'js/webviewTemplateScript.js'), 'utf-8');

    const isTesting = operationType === OperationType.TESTING;
    const suggestedName = testData?.suggestedName || '';
    const testFiles = testData?.testFiles || [];
    return `<!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your code</title>
        <style>
            ${styles}
            .test-file-section {
                margin: 15px;
                display: ${isTesting ? 'block' : 'none'};
                background: #2d2d2d;
                padding: 15px;
                border-radius: 4px;
            }
        </style>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
    </head>
    <body>
       <div class="model-selector">
            <label for="model">Choose Model: </label>
            <select id="model" onchange="changeModel()">
                <option value="gpt-3.5-turbo" ${(currentModel === "gpt-3.5-turbo" || currentModel === "gpt-3.5-turbo-16k") ? "selected" : ""}>GPT-3.5-Turbo</option>
                <option value="grok-2-latest" ${currentModel === "grok-2-latest" ? "selected" : ""}>Grok-2-Latest</option>
                <option value="deepseek-chat" ${currentModel === "deepseek-chat" ? "selected" : ""}>Deepseek-Chat</option>
                <option value="claude-3-7-sonnet-20250219" ${currentModel === "claude-3-7-sonnet-20250219" ? "selected" : ""}>Claude-3-7-sonnet</option>
                <option value="claude-3-5-haiku-20241022" ${currentModel === "claude-3-5-haiku-20241022" ? "selected" : ""}>Claude-3-5-haiku</option>
                <option value="gemini-1.5-pro-latest" ${currentModel === "gemini-1.5-pro-latest" ? "selected" : ""}>Gemini-1.5-Pro</option>
                <option value="gemini-2.0-flash" ${currentModel === "gemini-2.0-flash" ? "selected" : ""}>Gemini-2.0-Flash</option>
            </select>
        </div>
        <div class="test-file-section">
            <div class="file-input-group">
                <input type="text" id="testFilePath" 
                    placeholder="Name of the file with tests..."
                    value="${suggestedName}"
                    autocomplete="off">
                <div id="customDropdown" class="custom-dropdown">
                    ${testFiles.map(file => `<div class="dropdown-option">${file}</div>`).join('')}
                </div>
                <button class="button move-button" id="moveButton">
                    ${isTesting ? 'Move tests' : ''}
                </button>
            </div>
        </div>
        <div class="loading" id="loading">
            <div class="spinner"></div>
        </div>
        <pre><code id="code">${code}</code></pre>
        <div class="buttons">
            <button class="button" id="cancelButton">Cancel</button>
            <button class="button" id="regenerateButton">Regenerate</button>
            <button class="button ${isTesting ? '' : 'hidden'}" id="copyButton">Copy</button>
            <button class="button ${isTesting ? 'hidden' : ''}" id="approveButton">Approve</button>
        </div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
        <script>${scripts}</script>
    </body>
    </html>`;
}

module.exports = { getWebviewContent };