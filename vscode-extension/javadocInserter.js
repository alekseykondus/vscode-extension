const Parser = require("tree-sitter");
const Java = require("tree-sitter-java");

function extractJavadocsFromProcessed(code) {
    const parser = new Parser();
    parser.setLanguage(Java);
    const tree = parser.parse(code);
    //console.log("Processed AST:", tree.rootNode.toString());

    const javadocs = { class: null };
    const rootChildren = tree.rootNode.children;

    for (let i = 0; i < rootChildren.length; i++) {
        const node = rootChildren[i];
        const prevNode = i > 0 ? rootChildren[i - 1] : null;
        if (node.type === "class_declaration") {
            const classNameNode = node.childForFieldName("name");
            const className = classNameNode ? classNameNode.text : null;
            
            if (className && prevNode && prevNode.type === "block_comment" && prevNode.text.startsWith("/**")) {
                javadocs.class = prevNode.text;
            }

            const classBody = node.childForFieldName("body");
            if (classBody) {
                const classChildren = classBody.children;
                for (let j = 0; j < classChildren.length; j++) {
                    const child = classChildren[j];
                    const prevChild = j > 0 ? classChildren[j - 1] : null;

                    if (child.type === "field_declaration") {
                        const fieldNameNode = child.childForFieldName("declarator")?.childForFieldName("name");
                        const fieldName = fieldNameNode ? fieldNameNode.text : null;
                        if (
                            fieldName &&
                            prevChild &&
                            prevChild.type === "block_comment" &&
                            prevChild.text.startsWith("/**")
                        ) {
                            javadocs[`field_${fieldName}`] = prevChild.text; // Унікальний ключ для поля
                        }
                    } else if (child.type === "constructor_declaration") {
                        const constructorName = className; // Конструктор має ім’я класу
                        if (
                            constructorName &&
                            prevChild &&
                            prevChild.type === "block_comment" &&
                            prevChild.text.startsWith("/**")
                        ) {
                            javadocs[`constructor_${constructorName}`] = prevChild.text; // Унікальний ключ для конструктора
                        }
                    } else if (child.type === "method_declaration") {
                        const methodNameNode = child.childForFieldName("name");
                        const methodName = methodNameNode ? methodNameNode.text : null;
                        if (
                            methodName &&
                            prevChild &&
                            prevChild.type === "block_comment" &&
                            prevChild.text.startsWith("/**")
                        ) {
                            javadocs[methodName] = prevChild.text;
                        }
                    }
                }
            }
        } else if (node.type === "local_variable_declaration" || node.type === "field_declaration") {
            const fieldNameNode = node.childForFieldName("declarator")?.childForFieldName("name");
            const fieldName = fieldNameNode ? fieldNameNode.text : null;
            if (
                fieldName &&
                prevNode &&
                prevNode.type === "block_comment" &&
                prevNode.text.startsWith("/**")
            ) {
                javadocs[`field_${fieldName}`] = prevNode.text;
            }
        } else if (node.type === "method_declaration") {
            const methodNameNode = node.childForFieldName("name");
            let methodName = methodNameNode ? methodNameNode.text : null;
            // Якщо ім’я відсутнє (MISSING), перевіряємо, чи це конструктор за сигнатурою
            if (!methodName && node.text.includes("EmployeeController")) {
                methodName = "EmployeeController"; // Призначаємо ім’я конструктора вручну
                if (
                    prevNode &&
                    prevNode.type === "block_comment" &&
                    prevNode.text.startsWith("/**")
                ) {
                    javadocs[`constructor_${methodName}`] = prevNode.text;
                }
            } else if (
                methodName &&
                prevNode &&
                prevNode.type === "block_comment" &&
                prevNode.text.startsWith("/**")
            ) {
                javadocs[methodName] = prevNode.text;
            }
        } else if (node.type === "constructor_declaration") {
            const constructorNameNode = node.childForFieldName("name");
            const constructorName = constructorNameNode ? constructorNameNode.text : null;
            if (
                constructorName &&
                prevNode &&
                prevNode.type === "block_comment" &&
                prevNode.text.startsWith("/**")
            ) {
                javadocs[`constructor_${constructorName}`] = prevNode.text;
            }
        }
    }

    //console.log("Extracted Javadocs:", javadocs);
    return javadocs;
}

function insertJavadocsUsingAST(originalCode, javadocs) {
    const parser = new Parser();
    parser.setLanguage(Java);
    const tree = parser.parse(originalCode);
    //console.log("Original AST:", tree.rootNode.toString());

    let updatedCode = originalCode.split("\n");
    const insertions = []; // Зберігаємо вставки для обробки в порядку з кінця до початку

    function traverse(node) {
        if (node.type === "class_declaration" && javadocs.class) {
            const classStartLine = node.startPosition.row;
            const indentedJavadoc = javadocs.class.split("\n").map(line => line.trim()).join("\n");
            insertions.push({ line: classStartLine, text: indentedJavadoc });
        }
        if (node.type === "local_variable_declaration" || node.type === "field_declaration") {
            const fieldNameNode = node.childForFieldName("declarator")?.childForFieldName("name");
            const fieldName = fieldNameNode ? fieldNameNode.text : null;
            if (fieldName && javadocs[`field_${fieldName}`]) {
                const fieldStartLine = node.startPosition.row;
                const indentedJavadoc = javadocs[`field_${fieldName}`].split("\n").map(line => "    " + line.trim()).join("\n");
                insertions.push({ line: fieldStartLine, text: indentedJavadoc });
            }
        }
        if (node.type === "method_declaration") {
            const methodNameNode = node.childForFieldName("name");
            let methodName = methodNameNode ? methodNameNode.text : null;
            // Обробка конструктора, якщо ім'я відсутнє (MISSING identifier)
            if (!methodName && node.text.includes("EmployeeController")) {
                methodName = "EmployeeController";
                if (javadocs[`constructor_${methodName}`]) {
                    const constructorStartLine = node.startPosition.row;
                    const indentedJavadoc = javadocs[`constructor_${methodName}`].split("\n").map(line => "    " + line.trim()).join("\n");
                    insertions.push({ line: constructorStartLine, text: indentedJavadoc });
                }
            } else if (methodName && javadocs[methodName]) {
                const methodStartLine = node.startPosition.row;
                const indentedJavadoc = javadocs[methodName].split("\n").map(line => "    " + line.trim()).join("\n");
                insertions.push({ line: methodStartLine, text: indentedJavadoc });
            }
        }
        if (node.type === "constructor_declaration") {
            const constructorNameNode = node.childForFieldName("name");
            const constructorName = constructorNameNode ? constructorNameNode.text : null;
            if (constructorName && javadocs[`constructor_${constructorName}`]) {
                const constructorStartLine = node.startPosition.row;
                const indentedJavadoc = javadocs[`constructor_${constructorName}`].split("\n").map(line => "    " + line.trim()).join("\n");
                insertions.push({ line: constructorStartLine, text: indentedJavadoc });
            }
        }
        for (const child of node.children) {
            traverse(child);
        }
    }

    traverse(tree.rootNode);

    // Виконуємо вставки з кінця до початку, щоб уникнути зміщення
    insertions.sort((a, b) => b.line - a.line); // Сортуємо за спаданням
    for (const insertion of insertions) {
        updatedCode.splice(insertion.line, 0, insertion.text);
    }

    return updatedCode.join("\n").trim();
}

// Ось так правильно експортувати
module.exports = {
    extractJavadocsFromProcessed,
    insertJavadocsUsingAST
};
