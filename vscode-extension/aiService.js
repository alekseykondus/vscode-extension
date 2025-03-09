const OpenAI = require("openai");
const axios = require("axios");
const { encoding_for_model } = require("tiktoken");
require("dotenv").config({ path: __dirname + "/.env" });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, 
});

async function getChatGPTResponse(code, prompt, currentModel) {
    try {
        const response = await openai.chat.completions.create({
            model: currentModel,
            messages: [{ role: "user", content: `${prompt}\n\n${code}` }],
            temperature: 0.7,
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error("Error requesting OpenAI:", error);
        return "Error retrieving documentation.";
    }
}

function cleanCodeFromMarkdown(response) {
    const markdownRegex = /```(?:\w+)?\n([\s\S]*?)\n```/;
    const match = response.match(markdownRegex);
    
    if (match && match[1]) {
        return match[1].trim();
    }
    return response.trim();
}


async function getGrokResponse(code, prompt) {
    try {
        const response = await axios.post(
            "https://api.x.ai/v1/chat/completions",
            {
                model: "grok-2-latest",
                messages: [
                    { role: "system", content: "You are Grok, created by xAI." },
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
        const rawContent = response.data.choices[0].message.content;
        return cleanCodeFromMarkdown(rawContent);
    } catch (error) {
        console.error("Помилка при запиті до Grok API:", error.response ? error.response.data : error.message);
        return "Error retrieving response from Grok.";
    }
}

function checkModelByTokenCount(code, currentModel, vscode) {
    const enc = encoding_for_model("gpt-3.5-turbo");
    const tokenCount = enc.encode(code).length;
    enc.free();
    const GPT_3_5_TURBO_LIMIT = 4000;
    const GPT_3_5_TURBO_16K_LIMIT = 16000;
    const GROK_LIMIT = 64000;
    console.log("tokenCount", tokenCount);
    console.log("currentModel", currentModel);
    if (tokenCount <= GPT_3_5_TURBO_LIMIT) {
        return currentModel;
    }

    if (tokenCount <= GPT_3_5_TURBO_16K_LIMIT && currentModel === "gpt-3.5-turbo") {
        vscode.window.showInformationMessage("The model was changed to gpt-3.5-turbo-16k due to the large length of the selected code.");
        return "gpt-3.5-turbo-16k";
    }

    if (tokenCount <= GROK_LIMIT) {
        if (currentModel != "grok-2-latest") {
            vscode.window.showInformationMessage("The code exceeds GPT limits. Switching to grok-2-latest for processing.");
        }
        console.log("return grok-2-latest");
        return "grok-2-latest";
    }

    vscode.window.showErrorMessage(`The selected code is too large (${tokenCount} tokens). Maximum supported: ${GROK_LIMIT} tokens.`);
    return currentModel;
}

async function getAIResponse(code, prompt, currentModel) {
    console.log("Model that will be used:", currentModel);
    if (currentModel === "gpt-3.5-turbo" || currentModel === "gpt-3.5-turbo-16k") {
        return await getChatGPTResponse(code, prompt, currentModel);
    } else if (currentModel === "grok-2-latest") {
        return await getGrokResponse(code, prompt);
    } else {
        console.error("Невідома модель:", currentModel);
        return "Error: Unknown model.";
    }
}


module.exports = { getAIResponse, checkModelByTokenCount };