const OpenAI = require("openai");
const axios = require("axios");
const { encoding_for_model } = require("tiktoken");
require("dotenv").config({ path: __dirname + "/.env" });
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const { logInfo, logError, logDebug } = require('./logger');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, 
});

const deepseek = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY,
});

const grok = new OpenAI({
    baseURL: "https://api.x.ai/v1",
    apiKey: process.env.XAI_API_KEY
});

const anthropic = new Anthropic({
    apiKey: process.env.CLOUDE_API_KEY,
});

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const vscode = require("vscode");
function cleanCodeFromMarkdown(response, language = vscode.window.activeTextEditor?.document.languageId) {
    logDebug("Cleaning markdown from response");
    try {
        const markdownRegex = /```(?:\w+)?\n([\s\S]*?)\n```/;
        const match = response.match(markdownRegex);
        let cleanedCode = match && match[1] ? match[1].trim() : response.trim();

        logDebug(match && match[1] ? "Markdown code block found and cleaned" : "No markdown code blocks found");

        const unsafePatterns = {
            javascript: /\b(eval|Function|setTimeout\s*\(\s*['"][^'"]+['"]|setInterval\s*\(\s*['"][^'"]+['"]|XMLHttpRequest|fetch|location\.href|document\.write)\b/,
            python: /\b(eval|exec|compile|os\.system|subprocess\.run|eval)\b/,
            java: /\b(javax\.script\.ScriptEngine|java\.lang\.reflect\.Method\.invoke|Runtime\.getRuntime|ProcessBuilder)\b/,
            default: /\b(eval|exec|new\s+Function|setTimeout|setInterval|XMLHttpRequest|fetch|location\.href|document\.write)\b/
        };

        const pattern = unsafePatterns[language] || unsafePatterns.default;
        if (pattern.test(cleanedCode)) {
            logError(`Unsafe constructs detected in ${language} code: ${cleanedCode}`);
            throw new Error(`Code contains unsafe constructs (e.g., eval, exec, or similar) and cannot be processed for safety reasons.`);
        }

        logDebug("Code passed safety check");
        return cleanedCode;
    } catch (error) {
        logError(`Markdown cleaning or safety check failed: ${error.message}`);
        return "Markdown cleaning or safety check failed, code contains unsafe constructs (e.g., eval, exec, or similar) and cannot be processed for safety reasons.";
    }
}

async function getChatGPTResponse(code, prompt, currentModel) {
    logDebug(`Starting ChatGPT request with model ${currentModel}`);
    try {
        const startTime = Date.now();
        const response = await openai.chat.completions.create({
            model: currentModel,
            messages: [
                { role: "system", content: "You are an expert in working with code and an experienced developer." },
                { role: "user", content: `${prompt}\n\n${code}` }
            ],
            temperature: 0.7,
        });
        const duration = Date.now() - startTime;
        logInfo(`ChatGPT response received in ${duration}ms`);

        const rawContent = response.choices[0].message.content;
        logDebug(`Raw response length: ${rawContent.length} chars`);
        return cleanCodeFromMarkdown(rawContent);
    } catch (error) {
        logError(`ChatGPT request failed: ${error.message}`);
        if (error.response) logDebug("Error details:", error.response.data);
        return "Error retrieving documentation.";
    }
}

async function getGrokResponse(code, prompt, currentModel) {
    logDebug("Starting Grok API request");
    try {
        const startTime = Date.now();
        const response = await axios.post(
            "https://api.x.ai/v1/chat/completions",
            {
                model: currentModel,
                messages: [
                    { role: "system", content: "You are an expert in working with code and an experienced developer." },
                    { role: "user", content: `${prompt}\n\n${code}` }
                ],
                temperature: 0.7,
                stream: false
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.XAI_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );
        const duration = Date.now() - startTime;
        logInfo(`Grok response received in ${duration}ms`);

        const rawContent = response.data.choices[0].message.content;
        logDebug(`Raw Grok response: ${rawContent.substring(0, 100)}...`);
        return cleanCodeFromMarkdown(rawContent);
    } catch (error) {
        logError(`Grok request failed: ${error.message}`);
        if (error.response) logDebug("Error response:", error.response.data);
        return "Error retrieving response from Grok.";
    }
}

async function getGrokResponse_2(code, prompt, currentModel) {
    try {
        const completion = await grok.chat.completions.create({
            model: currentModel,
            messages: [
                { role: "system", content: "You are an expert in working with code and an experienced developer." },
                { role: "user", content: `${prompt}\n\n${code}` }
            ],
            temperature: 0.7
        });
        const rawContent = completion.choices[0].message.content;
        return cleanCodeFromMarkdown(rawContent);
    } catch (error) {
        console.error("Помилка при запиті до Grok API:", error.response ? error.response.data : error.message);
        return "Error retrieving response from Grok.";
    }
}

async function getDeepseekResponse(code, prompt) {
    try {
        const response = await deepseek.chat.completions.create({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: "You are an expert in working with code and an experienced developer." },
                { role: "user", content: `${prompt}\n\n${code}` }
            ],
            temperature: 0.7,
        });
        const rawContent = response.choices[0].message.content;
        return cleanCodeFromMarkdown(rawContent);
    } catch (error) {
        console.error("Error requesting Deepseek API:", error);
        return "Error retrieving response from Deepseek.";
    }
}

async function getClaudeResponse(code, prompt, model = "claude-3-7-sonnet-20250219") {
    try {
        const response = await anthropic.messages.create({
            model: model,
            max_tokens: 4096,
            messages: [
                { role: "user", content: `${prompt}\n\n${code}` }
            ],
            temperature: 0.7,
        });
        
        const rawContent = response.content[0].text;
        return cleanCodeFromMarkdown(rawContent);
    } catch (error) {
        console.error("Error requesting Claude API:", error);
        return "Error retrieving response from Claude.";
    }
}

async function getGeminiResponse(code, prompt, modelName = "gemini-1.5-pro-latest") {
    logDebug("Starting Gemini API request");
    try {
        const model = gemini.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(`${prompt}\n\n${code}`);
        const response = await result.response;
        const text = response.text();
        logDebug(`Raw Gemini response: ${text.substring(0, 100)}...`);
        return cleanCodeFromMarkdown(text);
    } catch (error) {
        logError(`Gemini request failed: ${error.message}`);
        if (error.response) logDebug("Error response:", error.response.data);
        return "Error retrieving response from Gemini.";
    }
}

function checkModelByTokenCount(code, currentModel, vscode) {
    logDebug("Checking model by token count");
    try {
        const enc = encoding_for_model("gpt-3.5-turbo");
        const tokenCount = enc.encode(code).length;
        enc.free();

        logInfo(`Token count: ${tokenCount}, current model: ${currentModel}`);

        const GPT_3_5_TURBO_LIMIT = 4000;
        const GPT_3_5_TURBO_16K_LIMIT = 16000;
        const DEEPSEEK_LIMIT = 8000;
        const GEMINI_2_FLASH_LIMIT = 8000;
        const CLAUDE_LIMIT = 20000;
        const GROK_LIMIT = 60000;
        const GEMINI_2_5_PRO_LIMIT = 65500;

        
        if (tokenCount <= GPT_3_5_TURBO_LIMIT) {
            logDebug(`Within GPT-3.5-Turbo limit (${tokenCount} <= ${GPT_3_5_TURBO_LIMIT})`);
            logInfo(`Keeping current model: ${currentModel}`);
            return currentModel;
        }

        if (tokenCount <= GPT_3_5_TURBO_16K_LIMIT && currentModel === "gpt-3.5-turbo") {
            logInfo(`Switching to GPT-3.5-16K (${tokenCount} > ${GPT_3_5_TURBO_LIMIT})`);
            vscode.window.showInformationMessage("The model was changed to gpt-3.5-turbo-16k due to the large length of the selected code.");
            return "gpt-3.5-turbo-16k";
        }

        if (tokenCount <= DEEPSEEK_LIMIT) {
            if (currentModel !== "deepseek-chat") {
                logInfo(`Switching to Deepseek (${tokenCount} > ${GPT_3_5_TURBO_16K_LIMIT})`);
                vscode.window.showInformationMessage("The code exceeds limits. Switching to deepseek-chat for processing.");
            }
            return "deepseek-chat";
        }

        if (tokenCount <= GEMINI_2_FLASH_LIMIT) {
            if (currentModel != "gemini-1.5-pro-latest" && currentModel != "gemini-2.0-flash") {
                logInfo(`Switching to Gemini (${tokenCount} > ${DEEPSEEK_LIMIT})`);
                vscode.window.showInformationMessage("The code exceeds limits. Switching to gemini-1.5-pro-latest for processing.");
            }
            return "gemini-1.5-pro-latest";
        }

        if (tokenCount <= CLAUDE_LIMIT) {
            if (currentModel != "claude-3-7-sonnet-20250219" && currentModel != "claude-3-5-haiku-20241022") {
                logInfo(`Switching to Claude (${tokenCount} > ${DEEPSEEK_LIMIT})`);
                vscode.window.showInformationMessage("The code exceeds limits. Switching to claude-3-7-sonnet for processing.");
            }
            return "claude-3-7-sonnet-20250219";
        }

        if (tokenCount <= GROK_LIMIT) {
            if (currentModel != "grok-2-latest" && currentModel != "grok-3-latest") {
                logInfo(`Switching to Grok (${tokenCount} > ${CLAUDE_LIMIT})`);
                vscode.window.showInformationMessage("The code exceeds limits. Switching to grok-3-latest for processing.");
            }
            return "grok-3-latest";
        }

        if (tokenCount <= GEMINI_2_5_PRO_LIMIT) {
            if (currentModel != "gemini-2.5-pro-exp-03-25") {
                logInfo(`Switching to Grok (${tokenCount} > ${CLAUDE_LIMIT})`);
                vscode.window.showInformationMessage("The code exceeds limits. Switching to gemini-2.5-pro-exp-03-25 for processing.");
            }
            return "gemini-2.5-pro-exp-03-25";
        }

        
        logError(`Code too large! Tokens: ${tokenCount}, Max: ${GEMINI_2_5_PRO_LIMIT}`);
        vscode.window.showErrorMessage(`The selected code is too large (${tokenCount} tokens). Maximum supported: ${GEMINI_2_5_PRO_LIMIT} tokens.`);
        return currentModel;
    } catch (error) {
        logError(`Token counting failed: ${error.message}`);
        return currentModel;
    }
}

async function getAIResponse(code, prompt, currentModel) {
    logInfo(`Starting AI request with model: ${currentModel}`);
    try {
        let response;
        const startTime = Date.now();
        
        switch(currentModel) {
            case "gpt-4-turbo":
            case "gpt-3.5-turbo":
            case "gpt-3.5-turbo-16k":
            case "gpt-4o":
                response = await getChatGPTResponse(code, prompt, currentModel);
                break;
            case "grok-2-latest":
            case "grok-3-latest":
                response = await getGrokResponse(code, prompt, currentModel);
                break;
            case "deepseek-chat":
                response = await getDeepseekResponse(code, prompt);
                break;
            case "claude-3-7-sonnet-20250219":
            case "claude-3-5-haiku-20241022":
                response = await getClaudeResponse(code, prompt, currentModel);
                break;
            case "gemini-2.0-flash":
            case "gemini-1.5-pro-latest":
            case "gemini-2.5-pro-exp-03-25":
                response = await getGeminiResponse(code, prompt, currentModel);
                break;
            default:
                logError(`Unknown model requested: ${currentModel}`);
                return "Error: Unknown model.";
        }

        const duration = Date.now() - startTime;
        logInfo(`AI request completed in ${duration}ms`);
        logDebug(`Final processed code length: ${response.length} chars`);
        
        return response;
    } catch (error) {
        logError(`AI request failed: ${error.message}`);
        if (error.stack) logDebug(error.stack);
        return "Error processing request. Check logs for details.";
    }
}

module.exports = { getAIResponse, checkModelByTokenCount, cleanCodeFromMarkdown };