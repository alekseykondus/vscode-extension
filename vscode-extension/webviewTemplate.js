const OperationType = require('./operationTypes');
const { logInfo, logError, logDebug } = require('./logger');

function getWebviewContent(code, currentModel, operationType, testData = null) {
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
            .loading {
                display: none;
                justify-content: center;
                align-items: center;
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
            }
            .spinner {
                width: 50px;
                height: 50px;
                border: 5px solid rgba(255, 255, 255, 0.3);
                border-top: 5px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .model-selector {
                display: flex;
                align-items: center;
                gap: 10px;
                background-color: #2d2d2d;
                padding: 10px 20px;
                border-radius: 8px;
                box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.3);
            }

            .model-selector label {
                font-size: 14px;
                font-weight: bold;
                color: white;
            }

            .model-selector select {
                background-color: #3a3a3a;
                color: white;
                border: none;
                padding: 5px 10px;
                font-size: 14px;
                border-radius: 4px;
                cursor: pointer;
            }

            .model-selector select:focus {
                outline: none;
                border: 1px solid #007acc;
            }
            .hidden {
                display: none !important;
            }

                
            .test-file-section {
                margin: 15px;
                display: ${isTesting ? 'block' : 'none'};
                background: #2d2d2d;
                padding: 15px;
                border-radius: 4px;
            }

            .file-input-group {
                position: relative;
                display: flex;
                gap: 10px;
                align-items: center;
                width: 100%;
            }

            #testFilePath {
                flex: 1;
                padding: 10px 10px 10px 15px;
                background: #3a3a3a;
                border: 2px solid #454545;
                color: #fff;
                border-radius: 6px;
                font-family: Consolas, monospace;
                font-size: 14px;
                transition: all 0.3s ease;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            #testFilePath:focus {
                outline: none;
                border-color: #007acc;
                box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.3);
            }

            input::-webkit-calendar-picker-indicator {
                display: none !important;
            }
            
            .custom-dropdown {
                position: absolute;
                top: 100%;
                left: 0;
                width: calc(100% - 120px);
                max-height: 200px;
                overflow-y: auto;
                background: #252526;
                border: 1px solid #3d3d3d;
                border-radius: 4px;
                z-index: 1000;
                box-shadow: 0 4px 6px rgba(0,0,0,0.2);
                display: none;
                margin-top: 5px;
            }
            
            .dropdown-option {
                padding: 10px 15px;
                cursor: pointer;
                color: #d4d4d4;
                transition: background 0.2s;
            }
            
            .dropdown-option:hover {
                background: #37373d;
            }
            
            .move-button {
                background: #238636;
                padding: 10px 20px;
                border-radius: 6px;
                font-weight: 500;
                transition: all 0.2s;
                flex-shrink: 0;
            }

            .move-button:hover {
                background: #1f6e2f;
                transform: translateY(-1px);
            }

            .file-input-group::after {
                content: "";
                position: absolute;
                right: 125px; /* Adjusted to be before the button */
                top: 50%;
                transform: translateY(-50%);
                width: 16px;
                height: 16px;
                background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23888" width="18" height="18"><path d="M7 10l5 5 5-5z"/></svg>');
                pointer-events: none;
                transition: transform 0.2s;
            }

            #testFilePath:focus ~ .file-input-group::after {
                transform: translateY(-50%) rotate(180deg);
            }
        </style>
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
        <pre id="code">${code}</pre>
        <div class="buttons">
            <button class="button" id="cancelButton">Cancel</button>
            <button class="button" id="regenerateButton">Regenerate</button>
            <button class="button ${isTesting ? '' : 'hidden'}" id="copyButton">Copy</button>
            <button class="button ${isTesting ? 'hidden' : ''}" id="approveButton">Approve</button>
        </div>
        <script>
            const vscode = acquireVsCodeApi();
            const cancelButton = document.getElementById('cancelButton');
            const regenerateButton = document.getElementById('regenerateButton');
            const approveButton = document.getElementById('approveButton');
            const copyButton = document.getElementById('copyButton');
            const moveButton = document.getElementById('moveButton');
            
            document.getElementById('cancelButton').addEventListener('click', () => {
                vscode.postMessage({ command: 'cancel' });
            });

            document.getElementById('regenerateButton').addEventListener('click', () => {
                document.body.style.overflow = 'hidden';
                document.getElementById('loading').style.display = 'flex';
                cancelButton.disabled = true;
                if (approveButton) approveButton.disabled = true;
                vscode.postMessage({ command: 'regenerate' });
            });

            if (approveButton) {
                approveButton.addEventListener('click', () => {
                    const updatedCode = document.getElementById('code').textContent;
                    vscode.postMessage({ command: 'approve', updatedCode: updatedCode });
                });
            }

            if (copyButton) {
                copyButton.addEventListener('click', () => {
                    const codeToCopy = document.getElementById('code').textContent;
                    vscode.postMessage({ command: 'copy', code: codeToCopy });
                });
            }

            function changeModel() {
                const model = document.getElementById('model').value;
                document.getElementById('loading').style.display = 'flex';
                vscode.postMessage({ command: 'changeModel', model: model });
            }
            
            window.addEventListener('message', event => {
                const message = event.data;

                if (message.command === "showLoading") {
                    document.body.style.overflow = 'hidden';
                    document.getElementById('loading').style.display = 'flex';
                    cancelButton.disabled = true;
                    if (approveButton) approveButton.disabled = true;
                }
                if (message.command === "updateCode") {
                    document.body.style.overflow = 'auto';
                    document.getElementById('code').textContent = message.code;
                    document.getElementById('loading').style.display = 'none';
                    cancelButton.disabled = false;
                    if (approveButton) approveButton.disabled = false;
                }
            });

            const testFilePath = document.getElementById('testFilePath');
            const customDropdown = document.getElementById('customDropdown');
            const dropdownOptions = document.querySelectorAll('.dropdown-option');
            
            testFilePath.addEventListener('focus', () => {
                if (customDropdown.children.length > 0) {
                    customDropdown.style.display = 'block';
                }
            });
            
            testFilePath.addEventListener('input', () => {
                const inputValue = testFilePath.value.toLowerCase();
                let hasVisible = false;
                
                Array.from(dropdownOptions).forEach(option => {
                    const optionText = option.textContent.toLowerCase();
                    if (optionText.includes(inputValue)) {
                        option.style.display = 'block';
                        hasVisible = true;
                    } else {
                        option.style.display = 'none';
                    }
                });
                
                customDropdown.style.display = hasVisible ? 'block' : 'none';
            });
            
            customDropdown.addEventListener('click', (e) => {
                if (e.target.classList.contains('dropdown-option')) {
                    testFilePath.value = e.target.textContent;
                    customDropdown.style.display = 'none';
                }
            });
            
            document.addEventListener('click', (e) => {
                if (e.target !== testFilePath && !customDropdown.contains(e.target)) {
                    customDropdown.style.display = 'none';
                }
            });
            
            if (moveButton) {
                moveButton.addEventListener('click', () => {
                    const fileName = testFilePath.value;
                    vscode.postMessage({ 
                        command: 'moveToFile', 
                        fileName: fileName,
                        code: document.getElementById('code').textContent
                    });
                });
            }
        </script>
    </body>
    </html>`;
}

module.exports = { getWebviewContent };