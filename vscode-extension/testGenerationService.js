const vscode = require("vscode");
const path = require('path');
const fs = require('fs');
const { logInfo, logDebug } = require('./logger');
const Parser = require("tree-sitter");
const Java = require("tree-sitter-java");
const Python = require("tree-sitter-python");
const JavaScript = require("tree-sitter-javascript");
const excludePattern = '**/{node_modules,bin,obj,out,build,.git,dist,vendor,target,.idea,.vscode}/**';

function generateTestFileName(originalPath, languageId) {
    const baseName = path.basename(originalPath);
    
    switch(languageId) {
        case 'javascript':
            return baseName.replace('.js', '.test.js');
        case 'java':
            return baseName.replace(/(.+)\.java/, '$1Test.java');
        case 'python':
            return baseName.replace('.py', '_test.py');
        default:
            return baseName.replace(/(\.[^.]+)$/, '_test$1');
    }
}

async function getExistingTestFiles(languageId) {
    const patterns = {
        java: '**/*Test.java',
        python: '**/*_test.py',
        javascript: '**/*.test.js'
    };

    const files = await vscode.workspace.findFiles(patterns[languageId] || '**/*test*', excludePattern);
    return files.map(file => 
        path.basename(file.fsPath)
    );
}

async function determineTestFilePath(fileName, languageId) {
    const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;

    const existingFiles = await getExistingTestFiles(languageId);
    if (existingFiles.includes(fileName)) {
        const fileUri = await vscode.workspace.findFiles(`**/${fileName}`, excludePattern);
        if (fileUri.length > 0) {
            logDebug(`Found existing test file: ${fileUri[0].fsPath}`);
            return fileUri[0].fsPath;
        }
    }

    const patterns = {
        java: '**/*Test.java',
        python: '**/*_test.py',
        javascript: '**/*.test.js'
    };
    
    const searchPattern = patterns[languageId] || '**/*test*';
    logDebug(`Using a search pattern for language ${languageId}: ${searchPattern}`);
    
    const existingTestFiles = await vscode.workspace.findFiles(searchPattern, excludePattern);
    
    let testDirPath;
    
    if (existingTestFiles.length > 0) {
        testDirPath = path.dirname(existingTestFiles[0].fsPath);
        logDebug(`Existing test directory found: ${testDirPath}`);
    } else {
        testDirPath = path.join(rootPath, 'test');
        await fs.promises.mkdir(testDirPath, { recursive: true });
        logDebug(`A new directory for tests has been created: ${testDirPath}`);
    }
    
    const fullPath = path.join(testDirPath, path.basename(fileName));
    logDebug(`The full path to the test file is defined: ${fullPath}`);
    return fullPath;
}


function findDescribeBlocks(node) {
    const callExpressions = node.descendantsOfType('call_expression');
    return callExpressions.filter(expr => {
        const funcNode = expr.childForFieldName('function');
        return funcNode && funcNode.text === 'describe';
    });
}

function findTopLevelDescribeBlock(describeBlocks, content) {
    const sortedBlocks = [...describeBlocks].sort((a, b) => 
        a.startPosition.row - b.startPosition.row || 
        a.startPosition.column - b.startPosition.column
    );
    
    if (sortedBlocks.length > 0) {
        const blockText = content.substring(
            sortedBlocks[0].startPosition.row, 
            sortedBlocks[0].endPosition.row
        );
        
        if (blockText.includes('JSDOM') || blockText.includes('beforeEach') || 
            blockText.includes('let dom') || blockText.includes('let document')) {
            return sortedBlocks[0];
        }
    }
    
    return null;
}

function getDescribeDescription(describeNode, codeText) {
    const args = describeNode.childForFieldName('arguments');
    if (args && args.namedChildren.length > 0) {
        const firstArg = args.namedChildren[0];
        if (firstArg.type === 'string') {
            const text = firstArg.text;
            return text.substring(1, text.length - 1);
        }
    }
    return null;
}

function findTestFunctions(node) {
    const callExpressions = node.descendantsOfType('call_expression');
    return callExpressions.filter(expr => {
        const funcNode = expr.childForFieldName('function');
        return funcNode && (funcNode.text === 'it' || funcNode.text === 'test');
    });
}

function getTestName(testNode, codeText) {
    const args = testNode.childForFieldName('arguments');
    if (args && args.namedChildren.length > 0) {
        const firstArg = args.namedChildren[0];
        if (firstArg.type === 'string') {
            const text = firstArg.text;
            return text.substring(1, text.length - 1);
        }
    }
    return null;
}

function mergeJsTestClasses(existingContent, newCode, existingClass, newClass) {
    const existingMethods = existingClass.descendantsOfType('method_definition');
    const existingMethodNames = new Set();
    
    for (const method of existingMethods) {
        const methodNameNode = method.childForFieldName('name');
        if (methodNameNode) {
            existingMethodNames.add(methodNameNode.text);
        }
    }
    logInfo(`Existing method names: ${[...existingMethodNames].join(', ')}`);

    const newMethods = newClass.descendantsOfType('method_definition');
    const methodsToAdd = [];
    
    for (const method of newMethods) {
        const methodNameNode = method.childForFieldName('name');
        if (methodNameNode && !existingMethodNames.has(methodNameNode.text)) {
            const methodText = getTextBetweenPositions(
                newCode,
                method.startPosition.row,
                method.startPosition.column,
                method.endPosition.row,
                method.endPosition.column
            );
            
            methodsToAdd.push(methodText.trim());
            logInfo(`Adding new method: ${methodNameNode.text}`);
        }
    }

    if (methodsToAdd.length === 0) {
        logInfo('No new methods to add');
        return existingContent;
    }

    const existingClassEndPos = existingClass.endPosition;
    const lastClosingBrace = existingContent.lastIndexOf('}');

    let indent = '  ';

    const lines = existingContent.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('test(') || lines[i].trim().startsWith('it(')) {
            const match = lines[i].match(/^(\s+)/);
            if (match) {
                indent = match[1];
                break;
            }
        }
    }

    const formattedMethods = methodsToAdd.map(method => {
        return method.split('\n').map(line => indent + line).join('\n');
    }).join('\n\n');

    return existingContent.substring(0, lastClosingBrace) + 
           '\n\n' + formattedMethods + 
           '\n}';
}

function mergeJsDescribeBlocks(existingContent, newCode, existingBlock, newBlock) {
    const existingTests = findTestFunctions(existingBlock);
    const existingTestNames = new Set();
    
    for (const test of existingTests) {
        const testName = getTestName(test, existingContent);
        if (testName) {
            existingTestNames.add(testName);
        }
    }
    logDebug(`Existing test names: ${[...existingTestNames].join(', ')}`);

    const newTests = findTestFunctions(newBlock);
    const testsToAdd = [];
    
    for (const test of newTests) {
        const testName = getTestName(test, newCode);
        if (testName && !existingTestNames.has(testName)) {
            const parentDescribe = findParentDescribe(test, newBlock);
            logDebug(`Parent describe found: ${!!parentDescribe}`);
            let contentToAdd;
            
            if (parentDescribe && parentDescribe !== newBlock) {
                const describeDesc = getDescribeDescription(parentDescribe, newCode);
                const testText = getTextBetweenPositions(
                    newCode,
                    test.startPosition.row,
                    test.startPosition.column,
                    test.endPosition.row,
                    test.endPosition.column
                );
                
                contentToAdd = testText.trim();
                logInfo(`Adding new test "${testName}" with nested describe context`);
            } else {
                const testText = getTextBetweenPositions(
                    newCode,
                    test.startPosition.row,
                    test.startPosition.column,
                    test.endPosition.row,
                    test.endPosition.column
                );
                contentToAdd = testText.trim() ;
                logInfo(`Adding new test "${testName}" without nested describe context`);
            }
            
            testsToAdd.push(contentToAdd);
        }
    }

    if (testsToAdd.length === 0) {
        logInfo('No new tests to add');
        return existingContent;
    }

    const describeEnd = existingBlock.endPosition;
    const describeEndIndex = positionToIndex(existingContent, describeEnd.row, describeEnd.column);

    let insertPos = describeEndIndex - 3;
    
    let indent = '  ';
    const lines = existingContent.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('it(') || lines[i].trim().startsWith('test(')) {
            const match = lines[i].match(/^(\s+)/);
            if (match) {
                indent = match[1];
                break;
            }
        }
    }

    const formattedTests = testsToAdd.map(test => {
        return test.split('\n').map(line => indent + line).join('\n');
    }).join('\n\n');

    logInfo(`Adding ${testsToAdd.length} new tests to the describe block`);
    
    return existingContent.substring(0, insertPos) + 
           '\n\n' + formattedTests + 
           '\n' + existingContent.substring(insertPos);
}


function mergeJsNewDescribeBlocks(existingContent, newCode, existingBlock, newBlock) {
    const describeEnd = existingBlock.endPosition;
    const describeEndIndex = positionToIndex(existingContent, describeEnd.row, describeEnd.column);

    let insertPos = describeEndIndex - 3;
    
    let indent = '  ';
    const lines = existingContent.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('describe(') || lines[i].trim().startsWith('it(') || lines[i].trim().startsWith('test(')) {
            const match = lines[i].match(/^(\s+)/);
            if (match) {
                indent = match[1];
                break;
            }
        }
    }

    const newBlockText = getTextBetweenPositions(
        newCode,
        newBlock.startPosition.row,
        newBlock.startPosition.column,
        newBlock.endPosition.row,
        newBlock.endPosition.column
    ).trim();

    const formattedBlock = newBlockText.split('\n').map(line => indent + line).join('\n');

    logInfo(`Adding new describe block to existing block`);
    
    return existingContent.substring(0, insertPos) + 
           '\n\n' + formattedBlock + ';' + 
           '\n' + existingContent.substring(insertPos);
}


function findParentDescribe(testNode, outerDescribeNode) {
    let currentNode = testNode.parent;
    while (currentNode) {
        if (currentNode.type === 'call_expression') {
            const funcName = currentNode.childForFieldName('function');
            if (funcName && funcName.text === 'describe' && currentNode !== outerDescribeNode) {
                return currentNode;
            }
        }
        if (currentNode === outerDescribeNode) {
            break;
        }
        currentNode = currentNode.parent;
    }
    return null;
}

function positionToIndex(code, row, column) {
    const lines = code.split('\n');
    let index = 0;
    for (let i = 0; i < row; i++) {
        index += lines[i].length + 1;
    }
    
    return index + column;
}

function getTextBetweenPositions(text, startRow, startColumn, endRow, endColumn) {
    const startIndex = positionToIndex(text, startRow, startColumn);
    const endIndex = positionToIndex(text, endRow, endColumn);
    return text.substring(startIndex, endIndex);
}

function collectJavaMethodsToAdd(newMethods, newCode, existingMethodNames) {
    const methodsToAdd = [];
    for (const method of newMethods) {
        const methodNameNode = method.childForFieldName('name');
        if (methodNameNode && !existingMethodNames.has(methodNameNode.text)) {
            const methodText = getTextBetweenPositions(
                newCode,
                method.startPosition.row,
                method.startPosition.column,
                method.endPosition.row,
                method.endPosition.column
            );
            logDebug(`methodText: ${methodText}`);
            
            let annotationsText = "";
            let prevSibling = method.previousSibling;
            while (prevSibling && (prevSibling.type === 'annotation' || 
                                  prevSibling.type === 'marker_annotation' || 
                                  prevSibling.type === 'line_comment' || 
                                  prevSibling.type === 'block_comment')) {
                const annotationText = getTextBetweenPositions(
                    newCode, 
                    prevSibling.startPosition.row, 
                    prevSibling.startPosition.column,
                    prevSibling.endPosition.row,
                    prevSibling.endPosition.column
                );
                
                annotationsText = annotationText + '\n' + annotationsText;
                prevSibling = prevSibling.previousSibling;
            }
            
            const fullMethodText = annotationsText + methodText;
            methodsToAdd.push(fullMethodText.trim());
            logDebug(`Adding new method: ${methodNameNode.text}`);
        }
    }
    return methodsToAdd;
}



function mergeJsTests(existingContent, newCode) {
    logInfo(`Starting merge operation`);
    logDebug(`Existing content length: ${existingContent.length} characters`);
    logDebug(`New code length: ${newCode.length} characters`);
    if (existingContent.includes(newCode.trim())) {
        logInfo('New code already exists in the file, skipping merge');
        return existingContent;
    }

    try {
        const parser = new Parser();
        parser.setLanguage(JavaScript);

        const existingTree = parser.parse(existingContent);
        const newTree = parser.parse(newCode);

        let existingTestClass = null;
        let newTestClass = null;
        const existingClasses = existingTree.rootNode.descendantsOfType('class_declaration');
        const newClasses = newTree.rootNode.descendantsOfType('class_declaration');

        logDebug(`Found ${existingClasses.length} classes in existing code and ${newClasses.length} classes in new code`);

        for (const existingClass of existingClasses) {
            const existingClassNameNode = existingClass.childForFieldName('name');
            const existingClassName = existingClassNameNode ? existingClassNameNode.text : null;

            for (const newClass of newClasses) {
                const newClassNameNode = newClass.childForFieldName('name');
                const newClassName = newClassNameNode ? newClassNameNode.text : null;

                if (existingClassName && newClassName && existingClassName === newClassName) {
                    existingTestClass = existingClass;
                    newTestClass = newClass;
                    logDebug(`Found matching test class: "${existingClassName}"`);
                    break;
                }
            }
            if (existingTestClass) break;
        }

        if (existingTestClass && newTestClass) {
            logInfo(`Merging test classes`);
            return mergeJsTestClasses(existingContent, newCode, existingTestClass, newTestClass);
        }

        // If there are no classes or no matching classes, check for describe blocks (common in Jest/Mocha)
        const existingDescribeBlocks = findDescribeBlocks(existingTree.rootNode);
        const newDescribeBlocks = findDescribeBlocks(newTree.rootNode);
        const existingTopLevelDescribe = findTopLevelDescribeBlock(existingDescribeBlocks, existingContent);
        const newTopLevelDescribe = findTopLevelDescribeBlock(newDescribeBlocks, newCode);
        logDebug(`Top-level describe blocks found: existing=${!!existingTopLevelDescribe}, new=${!!newTopLevelDescribe}`);
        logDebug(`Found ${existingDescribeBlocks.length} describe blocks in existing code and ${newDescribeBlocks.length} describe blocks in new code`);

        const matchingBlockPairs = [];
        
        for (const existingBlock of existingDescribeBlocks) {
            if (existingBlock === existingTopLevelDescribe) continue;
            const existingDesc = getDescribeDescription(existingBlock, existingContent);
            
            for (const newBlock of newDescribeBlocks) {
                if (newBlock === newTopLevelDescribe) continue;
                const newDesc = getDescribeDescription(newBlock, newCode);
                
                if (existingDesc && newDesc && existingDesc === newDesc) {
                    matchingBlockPairs.push({
                        existingBlock: existingBlock,
                        newBlock: newBlock,
                        description: existingDesc
                    });
                    logDebug(`Found matching describe block: "${existingDesc}"`);
                }
            }
        }

        const newDescribeBlocksToAdd = [];
        const existingDescriptions = new Set();
        for (const block of existingDescribeBlocks) {
            const desc = getDescribeDescription(block, existingContent);
            if (desc) {
                existingDescriptions.add(desc);
            }
        }
        
        for (const newBlock of newDescribeBlocks) {
            if (newBlock === newTopLevelDescribe) continue;
            const newDesc = getDescribeDescription(newBlock, newCode);
            if (newDesc && !existingDescriptions.has(newDesc)) {
                newDescribeBlocksToAdd.push(newBlock);
                logDebug(`Found new describe block to add: "${newDesc}"`);
            }
        }
        let mergedContent = existingContent;
        if (matchingBlockPairs.length > 0) {
            for (const pair of matchingBlockPairs) {
                logInfo(`Merging describe block: "${pair.description}"`);
                
                if (mergedContent !== existingContent) {
                    const updatedTree = parser.parse(mergedContent);
                    
                    const updatedDescribeBlocks = findDescribeBlocks(updatedTree.rootNode);
                    const updatedBlock = updatedDescribeBlocks.find(block => {
                        const desc = getDescribeDescription(block, mergedContent);
                        return desc === pair.description;
                    });
                    
                    if (updatedBlock) {
                        pair.existingBlock = updatedBlock;
                        logDebug(`Located updated position for describe block: "${pair.description}"`);
                    } else {
                        logInfo(`Warning: Could not find updated position for describe block: "${pair.description}"`);
                    }
                }
                
                mergedContent = mergeJsDescribeBlocks(
                    mergedContent, 
                    newCode, 
                    pair.existingBlock, 
                    pair.newBlock
                );
            }   
        }

        if (newDescribeBlocksToAdd.length > 0) {
            if (existingTopLevelDescribe) {
                const updatedTree = parser.parse(mergedContent);
                const updatedDescribeBlocks = findDescribeBlocks(updatedTree.rootNode);
                const updatedTopLevelDescribe = findTopLevelDescribeBlock(updatedDescribeBlocks, mergedContent);
                
                if (updatedTopLevelDescribe) {
                    for (const newBlock of newDescribeBlocksToAdd) {
                        const newDesc = getDescribeDescription(newBlock, newCode);
                        logInfo(`Adding new describe block: "${newDesc}" to top-level describe`);
                        
                        mergedContent = mergeJsNewDescribeBlocks(
                            mergedContent,
                            newCode,
                            updatedTopLevelDescribe,
                            newBlock
                        );
                    }
                }
            } else {
                for (const newBlock of newDescribeBlocksToAdd) {
                    const newDesc = getDescribeDescription(newBlock, newCode);
                    logInfo(`Adding new describe block: "${newDesc}" to end of file`);
                    
                    const blockText = getTextBetweenPositions(
                        newCode,
                        newBlock.startPosition.row,
                        newBlock.startPosition.column,
                        newBlock.endPosition.row,
                        newBlock.endPosition.column
                    );
                    
                    mergedContent = mergedContent.trim() + '\n\n' + blockText;
                }
            }
        }
        if (matchingBlockPairs.length > 0 || newDescribeBlocksToAdd.length > 0) {
            logInfo(`Successfully merged describe blocks`);
            return mergedContent;
        }

        logInfo('No matching test structures found, appending code to the end');
        return existingContent + '\n\n\n' + newCode;
    } catch (error) {
        logInfo(`Error parsing JavaScript code with tree-sitter: ${error.message}`);
        if (error.stack) logDebug(`Stack trace: ${error.stack}`);
        logInfo('Falling back to simple append merge');
        return existingContent + '\n\n\n' + newCode;
    }
}

function mergeJavaTests(existingContent, newCode) {
    //logDebug(`existingContent ${existingContent}`);
    //logDebug(`newCode ${newCode}`);

    if (existingContent.includes(newCode.trim())) {
        logInfo('New code already exists in the file, skipping merge');
        return existingContent;
    }

    try {
        const parser = new Parser();
        parser.setLanguage(Java);

        const existingTree = parser.parse(existingContent);
        const newTree = parser.parse(newCode);

        let existingClassName = null;
        const existingClassNode = existingTree.rootNode.descendantsOfType('class_declaration')[0];
        if (existingClassNode) {
            const classNameNode = existingClassNode.childForFieldName('name');
            existingClassName = classNameNode ? classNameNode.text : null;
        }
        logDebug(`Extracted existingClassName from AST: ${existingClassName}`);

        let newClassName = null;
        const newClassNode = newTree.rootNode.descendantsOfType('class_declaration')[0];
        if (newClassNode) {
            const classNameNode = newClassNode.childForFieldName('name');
            newClassName = classNameNode ? classNameNode.text : null;
        }
        logDebug(`Extracted newClassName from AST: ${newClassName}`);

        const sameClass = existingClassName && newClassName && existingClassName === newClassName;
        
        if (sameClass) {
            logDebug(`Classes are the same: ${sameClass}`);
            const newMethods = newClassNode.descendantsOfType('method_declaration');
            const existingMethods = existingClassNode.descendantsOfType('method_declaration');
            const existingMethodNames = new Set();
            
            for (const method of existingMethods) {
                const methodNameNode = method.childForFieldName('name');
                if (methodNameNode) {
                    existingMethodNames.add(methodNameNode.text);
                }
            }
            logDebug(`existingMethodNames: ${[...existingMethodNames].join(', ')}`);
            
            if (existingContent.trim().endsWith('}')) {
                logDebug("Existing code correctly ends with a closing curly brace");
                const lastClosingBrace = existingContent.lastIndexOf('}');
                
                let methodsToAdd = collectJavaMethodsToAdd(newMethods, newCode, existingMethodNames);

                if (methodsToAdd.length > 0) {
                    const methodsText = methodsToAdd.join('\n\n    ');
                    return existingContent.substring(0, lastClosingBrace) + '\n\n    ' + methodsText + '\n}';
                } else {
                    logInfo('No new methods to add');
                    return existingContent;
                }
            } else {
                const existingBodyNode = existingClassNode.childForFieldName('body');
                if (existingBodyNode) {
                    let methodsToAdd = collectJavaMethodsToAdd(newMethods, newCode, existingMethodNames);
                    
                    if (methodsToAdd.length > 0) {
                        const methodsText = methodsToAdd.join('\n\n    ');
                        return existingContent + '\n\n    ' + methodsText;
                    } else {
                        logInfo('No new methods to add');
                        return existingContent;
                    }
                } else {
                    logInfo('Could not find class body, appending code to the end');
                    return existingContent + '\n\n\n' + newCode;
                }
            }
        } else {
            logInfo('Class names do not match, appending code to the end of file');
            return existingContent + '\n\n\n' + newCode;
        }
    } catch (error) {
        logInfo(`Error parsing code with tree-sitter: ${error.message}`);
    }
}

function mergePythonTests(existingContent, newCode) {
    if (existingContent.includes(newCode.trim())) {
        logInfo('New code already exists in the file, skipping merge');
        return existingContent;
    }

    try {
        const parser = new Parser();
        parser.setLanguage(Python);

        const existingTree = parser.parse(existingContent);
        const newTree = parser.parse(newCode);

        const existingClasses = existingTree.rootNode.descendantsOfType('class_definition');
        const newClasses = newTree.rootNode.descendantsOfType('class_definition');

        if (existingClasses.length === 0 || newClasses.length === 0) {
            logInfo('No test classes found in one of the files, appending code to the end');
            return existingContent + '\n\n\n' + newCode;
        }

        let matchedExistingClass = null;
        let matchedNewClass = null;

        for (const existingClass of existingClasses) {
            const existingClassNameNode = existingClass.childForFieldName('name');
            const existingClassName = existingClassNameNode ? existingClassNameNode.text : null;

            for (const newClass of newClasses) {
                const newClassNameNode = newClass.childForFieldName('name');
                const newClassName = newClassNameNode ? newClassNameNode.text : null;

                if (existingClassName && newClassName && existingClassName === newClassName) {
                    matchedExistingClass = existingClass;
                    matchedNewClass = newClass;
                    logDebug(`Found matching test class: ${existingClassName}`);
                    break;
                }
            }
            if (matchedExistingClass) break;
        }

        if (!matchedExistingClass || !matchedNewClass) {
            logInfo('No matching test classes found, appending code to the end');
            return existingContent + '\n\n\n' + newCode;
        }

        const existingMethods = matchedExistingClass.descendantsOfType('function_definition');
        const newMethods = matchedNewClass.descendantsOfType('function_definition');
        
        const existingMethodNames = new Set();
        for (const method of existingMethods) {
            const methodNameNode = method.childForFieldName('name');
            if (methodNameNode) {
                existingMethodNames.add(methodNameNode.text);
            }
        }
        logDebug(`Existing method names: ${[...existingMethodNames].join(', ')}`);

        const methodsToAdd = [];
        for (const method of newMethods) {
            const methodNameNode = method.childForFieldName('name');
            if (methodNameNode && !existingMethodNames.has(methodNameNode.text)) {
                const methodText = getTextBetweenPositions(
                    newCode,
                    method.startPosition.row,
                    method.startPosition.column,
                    method.endPosition.row,
                    method.endPosition.column
                );
                logDebug(`New method text: ${methodText}`);
                
                let decoratorsText = "";
                let prevSibling = method.previousSibling;
                while (prevSibling && prevSibling.type === 'decorator') {
                    const decoratorText = getTextBetweenPositions(
                        newCode, 
                        prevSibling.startPosition.row, 
                        prevSibling.startPosition.column,
                        prevSibling.endPosition.row,
                        prevSibling.endPosition.column
                    );
                    
                    decoratorsText = decoratorText + '\n' + decoratorsText;
                    prevSibling = prevSibling.previousSibling;
                }
                
                const fullMethodText = decoratorsText + methodText;
                methodsToAdd.push(fullMethodText.trim());
                logDebug(`Adding new method: ${methodNameNode.text}`);
            }
        }

        if (methodsToAdd.length === 0) {
            logInfo('No new methods to add');
            return existingContent;
        }

        const existingClassEndPos = matchedExistingClass.endPosition;
        const endIndex = positionToIndex(existingContent, existingClassEndPos.row, existingClassEndPos.column);

        const lines = existingContent.split('\n');
        let indent = '';
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().startsWith('def ')) {
                const match = lines[i].match(/^(\s+)/);
                if (match) {
                    indent = match[1];
                    break;
                }
            }
        }
        if (!indent) indent = '    ';

        const formattedMethods = methodsToAdd.map(method => {
            return method.split('\n').map(line => indent + line).join('\n');
        }).join('\n\n');

        const updatedContent = existingContent.substring(0, endIndex) + 
                               '\n\n' + formattedMethods + 
                               '\n' + existingContent.substring(endIndex);

        return updatedContent;
    } catch (error) {
        logInfo(`Error parsing Python code with tree-sitter: ${error.message}`);
        return existingContent + '\n\n\n' + newCode;
    }
}

function mergeDefaultTests(existingContent, newCode) {
    if (existingContent.includes(newCode.trim())) {
        logInfo('New code already exists in the file, skipping merge');
        return existingContent;
    }
    
    const trimmedExisting = existingContent.trim();
    const testFunctionRegex = /\b(test_\w+|test\w+|should_\w+|it_\w+)\s*\(/g;
    const existingTestFunctions = [...trimmedExisting.matchAll(testFunctionRegex)]
        .map(match => match[1]);
    logInfo(`Searching for test functions with pattern: test_*, test*, should_*, it_*`);
    logInfo(`Existing test functions found: ${existingTestFunctions.join(', ')}`);
    const newTestFunctions = [...newCode.matchAll(testFunctionRegex)]
        .map(match => match[1]);
    logInfo(`New test functions found: ${newTestFunctions.join(', ')}`);

    const duplicateTestFunctions = newTestFunctions.filter(func => 
        existingTestFunctions.includes(func)
    );
    
    if (duplicateTestFunctions.length > 0) {
        logInfo(`Found ${duplicateTestFunctions.length} duplicate test functions, skipping those`);
    }
    
    let separator = '\n\n\n';
    
    if (/}$/.test(trimmedExisting) || /\bend\b\s*$/.test(trimmedExisting)) {
        // For languages like Ruby, Java, C#, etc. that use closing braces or end keywords
        const lastClosingBrace = trimmedExisting.lastIndexOf('}');
        const lastEndKeyword = trimmedExisting.lastIndexOf('end');
        
        if (lastClosingBrace > -1 && lastClosingBrace > lastEndKeyword) {
            const isClass = /class\s+\w+/.test(trimmedExisting);
            logInfo(`File contains class definition: ${isClass}`);
            if (isClass) {
                logInfo('Inserting new code inside class before closing brace');
                const codeBeforeBrace = trimmedExisting.substring(0, lastClosingBrace);
                return codeBeforeBrace + '\n\n' + newCode.trim() + '\n}';
            } else {
                logInfo('Appending new code after functions');
                return trimmedExisting + '\n\n' + newCode.trim();
            }
        } else if (lastEndKeyword > -1) {
            logInfo('Inserting new code before end keyword');
            return trimmedExisting.substring(0, lastEndKeyword) + '\n\n' + newCode.trim() + '\nend';
        }
    }
    
    logInfo('Appending new code with standard separator');
    return trimmedExisting + separator + newCode.trim();
}

async function saveTestsToFile(filePath, code, languageId) {
    try {
        try {
            await fs.promises.writeFile(filePath, code, { flag: 'wx' });
            logInfo(`A new test file has been created: ${path.basename(filePath)}`);
        } catch (createError) {
            if (createError.code !== 'EEXIST') throw createError;
            logInfo(`Test file already exists: ${filePath}`);

            const existingContent = await fs.promises.readFile(filePath, 'utf-8');
            logInfo(`Merging with existing file content`);
            
            let finalCode;
            switch (languageId) {
                case 'javascript':
                    finalCode = mergeJsTests(existingContent, code);
                    break;
                case 'java':
                    finalCode = mergeJavaTests(existingContent, code);
                    break;
                case 'python':
                    finalCode = mergePythonTests(existingContent, code);
                    break;
                default:
                    finalCode = mergeDefaultTests(existingContent, code);
            }

            await fs.promises.writeFile(filePath, finalCode, 'utf-8');
            logInfo(`Tests merged successfully`);

        }
        logInfo(`Tests saved successfully to ${filePath}`);
        vscode.window.showInformationMessage(`Tests saved to ${filePath}`);
    } catch (error) {
        if (error.stack) logDebug(error.stack);
        vscode.window.showErrorMessage(`Error saving tests: ${error.message}`);
    }
}

module.exports = {
    generateTestFileName,
    getExistingTestFiles,
    determineTestFilePath,
    saveTestsToFile,
    mergeJsTests,
    mergeJavaTests,
    mergePythonTests,
    mergeDefaultTests
};