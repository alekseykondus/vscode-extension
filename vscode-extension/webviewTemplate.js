function getWebviewContent(code, currentModel) {
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
        </style>
    </head>
    <body>
       <div class="model-selector">
            <label for="model">Choose Model: </label>
            <select id="model" onchange="changeModel()">
                <option value="gpt-3.5-turbo" ${(currentModel === "gpt-3.5-turbo" || currentModel === "gpt-3.5-turbo-16k") ? "selected" : ""}>GPT-3.5-Turbo</option>
                <option value="grok-2-latest" ${currentModel === "grok-2-latest" ? "selected" : ""}>Grok-2-Latest</option>
            </select>
        </div>
        <div class="loading" id="loading">
            <div class="spinner"></div>
        </div>
        <pre id="code">${code}</pre>
        <div class="buttons">
            <button class="button" id="cancelButton">Cancel</button>
            <button class="button" id="regenerateButton">Regenerate</button>
            <button class="button" id="approveButton">Approve</button>
        </div>
        <script>
            const vscode = acquireVsCodeApi();
            const cancelButton = document.getElementById('cancelButton');
            const regenerateButton = document.getElementById('regenerateButton');
            const approveButton = document.getElementById('approveButton');

            document.getElementById('cancelButton').addEventListener('click', () => {
                vscode.postMessage({ command: 'cancel' });
            });

            document.getElementById('regenerateButton').addEventListener('click', () => {
                document.body.style.overflow = 'hidden';
                document.getElementById('loading').style.display = 'flex';
                cancelButton.disabled = true;
                approveButton.disabled = true;
                vscode.postMessage({ command: 'regenerate' });
            });

            document.getElementById('approveButton').addEventListener('click', () => {
                const updatedCode = document.getElementById('code').textContent;
                vscode.postMessage({ command: 'approve', updatedCode: updatedCode });
            });

            function changeModel() {
                const model = document.getElementById('model').value;
                document.getElementById('loading').style.display = 'flex'; // Показываем загрузку
                vscode.postMessage({ command: 'changeModel', model: model });
            }
            window.addEventListener('message', event => {
                const message = event.data;

                if (message.command === "showLoading") {
                    document.body.style.overflow = 'hidden';
                    document.getElementById('loading').style.display = 'flex';
                    cancelButton.disabled = true;
                    approveButton.disabled = true;
                }
                if (message.command === "updateCode") {
                    document.body.style.overflow = 'auto';
                    document.getElementById('code').textContent = message.code;
                    document.getElementById('loading').style.display = 'none';
                    cancelButton.disabled = false;
                    approveButton.disabled = false;
                }
            });
        </script>
    </body>
    </html>`;
}


module.exports = { getWebviewContent };