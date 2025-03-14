const fs = require('fs');
const path = require('path');
const vscode = require('vscode');
require("dotenv").config({ path: __dirname + "/.env" });

let logFilePath;
let isDebugMode = process.env.VSCODE_DEBUG_MODE === 'true' || vscode.workspace.getConfiguration('aiCodeAssistant').get('debugMode');

function setupLogger(context) {
    const globalStoragePath = context.extensionUri.fsPath;
    logFilePath = path.join(globalStoragePath, 'ai-assistant.log');
    
    if (!fs.existsSync(globalStoragePath)) {
        fs.mkdirSync(globalStoragePath, { recursive: true });
    }

    if (fs.existsSync(logFilePath)) {
        fs.writeFileSync(logFilePath, '');
    }
}

function logToFile(message) {
    fs.appendFileSync(logFilePath, `${message}\n`, 'utf-8');
}

function logInfo(message) { logToFile(`[INFO] ${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')} - ${message}`); }

function logError(message) { logToFile(`[ERROR] ${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')} - ${message}`); }

function logDebug(message) { 
    if (!isDebugMode) return; 
    logToFile(`[DEBUG] ${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')} - ${message}`); 
}

module.exports = { setupLogger, logInfo, logError, logDebug };