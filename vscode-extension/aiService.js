const OpenAI = require("openai");
const axios = require("axios");
require("dotenv").config({ path: __dirname + "/.env" });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, 
});

async function getChatGPTResponse(code, prompt) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
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

async function getAIResponse(code, prompt, currentModel) {
    console.log("Model that will be used:", currentModel);
    if (currentModel === "gpt-3.5-turbo") {
        return await getChatGPTResponse(code, prompt);
    } else if (currentModel === "grok-2-latest") {
        return await getGrokResponse(code, prompt);
    } else {
        console.error("Невідома модель:", currentModel);
        return "Error: Unknown model.";
    }
}

module.exports = { getAIResponse };