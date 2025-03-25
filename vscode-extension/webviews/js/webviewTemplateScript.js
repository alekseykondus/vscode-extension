const vscode = acquireVsCodeApi();
const cancelButton = document.getElementById('cancelButton');
const regenerateButton = document.getElementById('regenerateButton');
const approveButton = document.getElementById('approveButton');
const copyButton = document.getElementById('copyButton');
const moveButton = document.getElementById('moveButton');

function highlightCodeBlocks() {
    document.getElementById('code')?.removeAttribute('data-highlighted');
    document.querySelectorAll('pre code').forEach(el => {
        hljs.highlightElement(el);
    });
}

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
        highlightCodeBlocks();
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

document.addEventListener('DOMContentLoaded', (event) => {
    highlightCodeBlocks();
});