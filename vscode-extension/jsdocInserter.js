const Parser = require("tree-sitter");
const JavaScript = require("tree-sitter-javascript");

function extractJSDocsFromProcessed(code) {
    const parser = new Parser();
    parser.setLanguage(JavaScript);

    const tree = parser.parse(code);
    
    const jsdocs = { module: null };
    const rootNode = tree.rootNode;
    
    const comments = rootNode.firstChild?.previousNamedSibling?.type === "comment" ? 
        rootNode.firstChild.previousNamedSibling : null;
    if (comments && comments.text.startsWith("/**")) {
        jsdocs.module = comments.text;
    }

    function traverse(node) {
        //console.log("node.type" +  node.type);
        //console.log("node.text" +  node.text);
        if (node.type === "class_declaration") {
            const classNameNode = node.childForFieldName("name");
            const className = classNameNode ? classNameNode.text : null;
            
            if (className && node.previousNamedSibling && 
                node.previousNamedSibling.type === "comment" && 
                node.previousNamedSibling.text.startsWith("/**")) {
                jsdocs[`class_${className}`] = node.previousNamedSibling.text;
            }
            const classBody = node.childForFieldName("body");
            if (classBody) {
                for (let i = 0; i < classBody.namedChildCount; i++) {
                    const child = classBody.namedChildren[i];
                    const prevChild = i > 0 ? classBody.namedChildren[i - 1] : null;
                    
                    if (child.type === "method_definition") {
                        const methodNameNode = child.childForFieldName("name");
                        const methodName = methodNameNode ? methodNameNode.text : null;
                        
                        if (methodName && prevChild && 
                            prevChild.type === "comment" && 
                            prevChild.text.startsWith("/**")) {
                            jsdocs[`method_${className}_${methodName}`] = prevChild.text;
                        }
                    } else if (child.type === "field_definition") {
                        const fieldNameNode = child.childForFieldName("property");
                        const fieldName = fieldNameNode ? fieldNameNode.text : null;
                        
                        if (fieldName && prevChild && 
                            prevChild.type === "comment" && 
                            prevChild.text.startsWith("/**")) {
                            jsdocs[`field_${className}_${fieldName}`] = prevChild.text;
                        }
                    }
                }
            }
        }
        else if (node.type === "function_declaration" || node.type === "function") {
            const functionNameNode = node.childForFieldName("name");
            const functionName = functionNameNode ? functionNameNode.text : null;
            
            if (functionName && node.previousNamedSibling && 
                node.previousNamedSibling.type === "comment" && 
                node.previousNamedSibling.text.startsWith("/**")) {
                jsdocs[`function_${functionName}`] = node.previousNamedSibling.text;
            }
        }
        else if (node.type === "variable_declarator") {
            const variableDeclaration = node.parent;
            const prevNode = variableDeclaration.previousSibling;
            if (prevNode && prevNode.type === "comment" && prevNode.text.startsWith("/**")) {
                const varName = node.childForFieldName("name")?.text;
                if (varName) {
                    const valueNode = node.childForFieldName("value");
                    const isArrowFunction = valueNode?.type === "arrow_function";
                    jsdocs[isArrowFunction ? `function_${varName}` : `var_${varName}`] = prevNode.text;
                }
            }
        }
        else if (node.type === "expression_statement") {
            const assignmentNode = node.namedChildren[0];
            if (assignmentNode && assignmentNode.type === "assignment_expression") {
                const leftNode = assignmentNode.childForFieldName("left");
                if (leftNode && leftNode.type === "member_expression" && leftNode.text === "module.exports") {
                    let prevNode = node.previousSibling;
                    while (prevNode) {
                        if (prevNode.type === "comment" && prevNode.text.startsWith("/**")) {
                            jsdocs["module_exports"] = prevNode.text;
                            break;
                        }
                        prevNode = prevNode.previousSibling;
                    }
                }
            }
        }
        for (const child of node.children) {
            traverse(child);
        }
    }

    traverse(rootNode);
    return jsdocs;
}

function insertJSDocsUsingAST(originalCode, jsdocs) {
    const parser = new Parser();
    parser.setLanguage(JavaScript);
    const tree = parser.parse(originalCode);
    
    let updatedCode = originalCode.split("\n");
    const insertions = [];

    function traverse(node) {
        if (node.type === "program" && jsdocs.module) {
            insertions.push({ line: 0, text: jsdocs.module });
        }

        if (node.type === "class_declaration") {
            const classNameNode = node.childForFieldName("name");
            const className = classNameNode ? classNameNode.text : null;
            
            if (className && jsdocs[`class_${className}`]) {
                const classStartLine = node.startPosition.row;
                insertions.push({ line: classStartLine, text: jsdocs[`class_${className}`] });
            }

            const classBody = node.childForFieldName("body");
            if (classBody) {
                for (const child of classBody.namedChildren) {
                    if (child.type === "method_definition") {
                        const methodNameNode = child.childForFieldName("name");
                        const methodName = methodNameNode ? methodNameNode.text : null;
                        
                        if (methodName && jsdocs[`method_${className}_${methodName}`]) {
                            const methodStartLine = child.startPosition.row;
                            const lineText = updatedCode[methodStartLine] || "";
                            const match = lineText.match(/^(\s+)/);
                            const indent = match ? match[1] : "    ";
                            const indentedJSDoc = jsdocs[`method_${className}_${methodName}`]
                                .split("\n")
                                .map(line => indent + line)
                                .join("\n");
                            
                            insertions.push({ line: methodStartLine, text: indentedJSDoc });
                        }
                    } else if (child.type === "field_definition") {
                        const fieldNameNode = child.childForFieldName("property");
                        const fieldName = fieldNameNode ? fieldNameNode.text : null;
                        
                        if (fieldName && jsdocs[`field_${className}_${fieldName}`]) {
                            const fieldStartLine = child.startPosition.row;
                            const lineText = updatedCode[fieldStartLine] || "";
                            const match = lineText.match(/^(\s+)/);
                            const indent = match ? match[1] : "    ";
                            const indentedJSDoc = jsdocs[`field_${className}_${fieldName}`]
                                .split("\n")
                                .map(line => indent + line)
                                .join("\n");
                            
                            insertions.push({ line: fieldStartLine, text: indentedJSDoc });
                        }
                    }
                }
            }
        }
        else if (node.type === "function_declaration" || node.type === "function") {
            const functionNameNode = node.childForFieldName("name");
            const functionName = functionNameNode ? functionNameNode.text : null;
            
            if (functionName && jsdocs[`function_${functionName}`]) {
                const functionStartLine = node.startPosition.row;
                insertions.push({ line: functionStartLine, text: jsdocs[`function_${functionName}`] });
            }
        }
        else if (node.type === "variable_declarator") {
            const nameNode = node.childForFieldName("name");
            const varName = nameNode ? nameNode.text : null;
            
            if (varName) {
                const valueNode = node.childForFieldName("value");
                const isArrowFunction = valueNode && valueNode.type === "arrow_function";
                const docKey = isArrowFunction ? `function_${varName}` : `var_${varName}`;
                
                if (jsdocs[docKey]) {
                    const varDeclaration = node.parent;
                    const varStartLine = varDeclaration.startPosition.row;
                    insertions.push({ line: varStartLine, text: jsdocs[docKey] });
                }
            }
        }
        else if (node.type === "expression_statement") {
            const assignmentNode = node.namedChildren[0];
            if (assignmentNode && assignmentNode.type === "assignment_expression") {
                const leftNode = assignmentNode.childForFieldName("left");
                if (leftNode && leftNode.type === "member_expression" && leftNode.text === "module.exports") {
                    const docKey = "module_exports";
                    if (jsdocs[docKey]) {
                        const startLine = node.startPosition.row;
                        insertions.push({ line: startLine, text: jsdocs[docKey] });
                    }
                }
            }
        }
        
        for (const child of node.children) {
            traverse(child);
        }
    }

    traverse(tree.rootNode);

    insertions.sort((a, b) => b.line - a.line);
    for (const insertion of insertions) {
        updatedCode.splice(insertion.line, 0, insertion.text);
    }

    return updatedCode.join("\n").trim();
}

module.exports = {
    extractJSDocsFromProcessed,
    insertJSDocsUsingAST
};