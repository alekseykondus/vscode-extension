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
    document.getElementById('code')?.removeAttribute('data-highlighted');
    document.querySelectorAll('pre code').forEach(el => {
        hljs.highlightElement(el);
    });
});