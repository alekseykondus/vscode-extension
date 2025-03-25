/**
 * Convert Markdown-like text to HTML with basic formatting support  
 * @param {string} text - Input text with simple formatting  
 * @returns {string} Formatted HTML  
 */
function formatTextAsHTML(text) {
    const codeBlocks = [];
    text = text.replace(/```([a-z]*)\n([\s\S]*?)```/g, function(match, lang, code) {
        const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
        codeBlocks.push({
            lang: lang,
            code: code.trim()
        });
        return placeholder;
    });
    
    const inlineCodes = [];
    text = text.replace(/`([^`]+)`/g, function(match, code) {
        const placeholder = `__INLINE_CODE_${inlineCodes.length}__`;
        inlineCodes.push(code);
        return placeholder;
    });
    
    text = text.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
    text = text.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    text = text.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    let lines = text.split('\n');
    let result = [];
    let inOrderedList = false;
    let inUnorderedList = false;
    let listItems = [];
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        
        const orderedMatch = line.match(/^(\d+)\. (.*)$/);
        if (orderedMatch) {
            if (!inOrderedList) {
                if (inUnorderedList) {
                    result.push(`<ul>${listItems.join('')}</ul>`);
                    listItems = [];
                    inUnorderedList = false;
                }
                inOrderedList = true;
            }
            listItems.push(`<li>${orderedMatch[2]}</li>`);
            continue;
        }
        

        const unorderedMatch = line.match(/^[\*\-] (.*)$/);
        if (unorderedMatch) {
            if (!inUnorderedList) {
                if (inOrderedList) {
                    result.push(`<ol>${listItems.join('')}</ol>`);
                    listItems = [];
                    inOrderedList = false;
                }
                inUnorderedList = true;
            }
            listItems.push(`<li>${unorderedMatch[1]}</li>`);
            continue;
        }
        
        if (inOrderedList) {
            result.push(`<ol>${listItems.join('')}</ol>`);
            listItems = [];
            inOrderedList = false;
        }
        if (inUnorderedList) {
            result.push(`<ul>${listItems.join('')}</ul>`);
            listItems = [];
            inUnorderedList = false;
        }
        
        if (line === '' || line.startsWith('__CODE_BLOCK_') || line.startsWith('__INLINE_CODE_')) {
            result.push(line);
            continue;
        }
        
        result.push(`<p>${line}</p>`);
    }
    
    if (inOrderedList) {
        result.push(`<ol>${listItems.join('')}</ol>`);
    }
    if (inUnorderedList) {
        result.push(`<ul>${listItems.join('')}</ul>`);
    }
    
    text = result.join('\n');

    text = text.replace(/__CODE_BLOCK_(\d+)__/g, function(match, index) {
        const block = codeBlocks[parseInt(index)];
        return `<pre><code class="language-${block.lang}">${escapeHtml(block.code)}</code></pre>`;
    });
    
    text = text.replace(/__INLINE_CODE_(\d+)__/g, function(match, index) {
        return `<code>${escapeHtml(inlineCodes[parseInt(index)])}</code>`;
    });
    
    return text;
}

/**
 * Escape special HTML characters to prevent XSS  
 * @param {string} unsafe - Raw input string  
 * @returns {string} Sanitized HTML-safe string  
 */
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

module.exports = { formatTextAsHTML, escapeHtml };