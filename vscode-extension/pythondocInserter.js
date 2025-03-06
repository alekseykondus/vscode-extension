const Parser = require("tree-sitter");
const Python = require("tree-sitter-python");


// Функція для витягання docstrings для Python
function extractDocstringsFromProcessed(code) {
    const parser = new Parser();
    parser.setLanguage(Python);
    const tree = parser.parse(code);

    let docstrings = { module: null };
    const rootNode = tree.rootNode;

    // Module-level docstring: якщо перший вираз є рядковим літералом.
    if (rootNode.firstChild && rootNode.firstChild.type === "expression_statement") {
        const expression = rootNode.firstChild.firstChild;
        if (expression && expression.type === "string") {
            docstrings.module = expression.text;
        }
    }

    // Рекурсивний обхід AST для класів та функцій.
    function traverse(node) {
        if (node.type === "class_definition") {
            const classNameNode = node.childForFieldName("name");
            const className = classNameNode ? classNameNode.text : null;
            const suiteNode = node.childForFieldName("body");
            if (suiteNode && suiteNode.childCount > 0) {
                const firstStmt = suiteNode.children[0];
                if (firstStmt.type === "expression_statement") {
                    const expr = firstStmt.firstChild;
                    if (expr && expr.type === "string") {
                        docstrings[`class_${className}`] = expr.text;
                    }
                }
            }
        } else if (node.type === "function_definition") {
            const functionNameNode = node.childForFieldName("name");
            const functionName = functionNameNode ? functionNameNode.text : null;
            const suiteNode = node.childForFieldName("body");
            if (suiteNode && suiteNode.childCount > 0) {
                const firstStmt = suiteNode.children[0];
                if (firstStmt.type === "expression_statement") {
                    const expr = firstStmt.firstChild;
                    if (expr && expr.type === "string") {
                        docstrings[`function_${functionName}`] = expr.text;
                    }
                }
            }
        }
        for (const child of node.children) {
            traverse(child);
        }
    }
    traverse(rootNode);
    //console.log("Extracted Docstrings:", docstrings);
    return docstrings;
}

// Нова функція для вставки docstrings для Python
function insertDocstringsUsingAST(originalCode, docstrings) {
    const parser = new Parser();
    parser.setLanguage(Python);
    const tree = parser.parse(originalCode);
    let updatedCode = originalCode.split("\n");
    const insertions = [];

    function traverse(node) {
        // Модульний рівень
        if (node.type === "module" && docstrings.module) {
            const firstChild = node.firstChild;
            if (!firstChild || firstChild.type !== "expression_statement" || 
                (firstChild.firstChild && firstChild.firstChild.type !== "string")) {
                // Вставляємо docstring на початок файлу
                const insertionLine = 0;
                insertions.push({ line: insertionLine, text: docstrings.module });
            }
        }
        // Клас
        if (node.type === "class_definition") {
            const classNameNode = node.childForFieldName("name");
            const className = classNameNode ? classNameNode.text : null;
            if (docstrings[`class_${className}`]) {
                const suiteNode = node.childForFieldName("body");
                if (suiteNode) {
                    const firstStmt = suiteNode.children[0];
                    if (!firstStmt || firstStmt.type !== "expression_statement" || 
                        (firstStmt.firstChild && firstStmt.firstChild.type !== "string")) {
                        // Вставляємо docstring як перший вираз у тілі класу
                        const insertionLine = node.startPosition.row + 1;
                        // Отримуємо відступ із першого рядка тіла
                        const lineText = updatedCode[insertionLine] || "";
                        const match = lineText.match(/^(\s+)/);
                        const indent = match ? match[1] : "    ";
                        const indentedDocstring = docstrings[`class_${className}`]
                            .split("\n")
                            .map(line => indent + line)
                            .join("\n");
                        insertions.push({ line: insertionLine, text: indentedDocstring });
                    }
                }
            }
        }
        // Функція
        if (node.type === "function_definition") {
            const functionNameNode = node.childForFieldName("name");
            const functionName = functionNameNode ? functionNameNode.text : null;
            if (docstrings[`function_${functionName}`]) {
                const suiteNode = node.childForFieldName("body");
                if (suiteNode) {
                    const firstStmt = suiteNode.children[0];
                    if (!firstStmt || firstStmt.type !== "expression_statement" || 
                        (firstStmt.firstChild && firstStmt.firstChild.type !== "string")) {
                        const insertionLine = node.startPosition.row + 1;
                        const lineText = updatedCode[insertionLine] || "";
                        const match = lineText.match(/^(\s+)/);
                        const indent = match ? match[1] : "    ";
                        const indentedDocstring = docstrings[`function_${functionName}`]
                            .split("\n")
                            .map(line => indent + line)
                            .join("\n");
                        insertions.push({ line: insertionLine, text: indentedDocstring });
                    }
                }
            }
        }
        for (const child of node.children) {
            traverse(child);
        }
    }

    traverse(tree.rootNode);

    // Виконуємо вставки з кінця до початку, щоб уникнути зміщення рядків.
    insertions.sort((a, b) => b.line - a.line);
    for (const insertion of insertions) {
        updatedCode.splice(insertion.line, 0, insertion.text);
    }

    //console.log("Updated Code:\n", updatedCode.join("\n"));
    return updatedCode.join("\n").trim();
}


module.exports = {
    extractDocstringsFromProcessed,
    insertDocstringsUsingAST
};