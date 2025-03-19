const { extractJSDocsFromProcessed, insertJSDocsUsingAST } = require("../jsdocInserter")

describe("JSDoc Inserter Tests - JavaScript", () => {
    const originalCode = `
const express = require('express');
const axios = require('axios');

class ApiClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.timeout = 5000;
    }

    async getData(endpoint, params = {}) {
        try {
            const url = \`\${this.baseUrl}/\${endpoint}\`;
            const response = await axios.get(url, { 
                params,
                timeout: this.timeout
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching data:', error.message);
            throw error;
        }
    }

    setTimeoutDuration(ms) {
        this.timeout = ms;
    }
}

function formatResponse(data) {
    return {
        timestamp: new Date().toISOString(),
        data: data,
        count: Array.isArray(data) ? data.length : 1
    };
}

const createServer = (port = 3000) => {
    const app = express();
    const apiClient = new ApiClient('https://api.example.com');
    
    app.get('/api/users', async (req, res) => {
        try {
            const data = await apiClient.getData('users', req.query);
            res.json(formatResponse(data));
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    app.listen(port, () => {
        console.log(\`Server running on port \${port}\`);
    });
    
    return app;
};

module.exports = { ApiClient, formatResponse, createServer };
`;

    const processedCode = `
/**
 * API Client and Server Module
 * 
 * This module provides functionality for creating API clients and servers.
 * It includes classes and functions to simplify working with REST APIs.
 */
const express = require('express');
const axios = require('axios');

/**
 * Client for making API requests
 * 
 * Handles HTTP requests to external APIs with configurable timeout and error handling.
 */
class ApiClient {
    /**
     * Create a new API client
     * 
     * @param {string} baseUrl - The base URL for the API
     */
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.timeout = 5000;
    }

    /**
     * Fetch data from an API endpoint
     * 
     * @param {string} endpoint - The API endpoint to request
     * @param {Object} params - Query parameters to include
     * @returns {Promise<Object>} The response data
     * @throws {Error} If the request fails
     */
    async getData(endpoint, params = {}) {
        try {
            const url = \`\${this.baseUrl}/\${endpoint}\`;
            const response = await axios.get(url, { 
                params,
                timeout: this.timeout
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching data:', error.message);
            throw error;
        }
    }

    /**
     * Configure the request timeout
     * 
     * @param {number} ms - Timeout in milliseconds
     */
    setTimeoutDuration(ms) {
        this.timeout = ms;
    }
}

/**
 * Format API response with metadata
 * 
 * @param {Object|Array} data - The data to format
 * @returns {Object} Formatted response with timestamp and count
 */
function formatResponse(data) {
    return {
        timestamp: new Date().toISOString(),
        data: data,
        count: Array.isArray(data) ? data.length : 1
    };
}

/**
 * Create and configure an Express server
 * 
 * @param {number} port - The port number to listen on
 * @returns {Object} The configured Express app
 */
const createServer = (port = 3000) => {
    const app = express();
    const apiClient = new ApiClient('https://api.example.com');
    
    app.get('/api/users', async (req, res) => {
        try {
            const data = await apiClient.getData('users', req.query);
            res.json(formatResponse(data));
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    app.listen(port, () => {
        console.log(\`Server running on port \${port}\`);
    });
    
    return app;
};

/**
 * module.exports
 */
module.exports = { ApiClient, formatResponse, createServer };
`;

    const expectedJSDocs = {
        "module": null,
        "var_express": "/**\n * API Client and Server Module\n * \n * This module provides functionality for creating API clients and servers.\n * It includes classes and functions to simplify working with REST APIs.\n */",
        "class_ApiClient": "/**\n * Client for making API requests\n * \n * Handles HTTP requests to external APIs with configurable timeout and error handling.\n */",
        "method_ApiClient_constructor": "/**\n     * Create a new API client\n     * \n     * @param {string} baseUrl - The base URL for the API\n     */",
        "method_ApiClient_getData": "/**\n     * Fetch data from an API endpoint\n     * \n     * @param {string} endpoint - The API endpoint to request\n     * @param {Object} params - Query parameters to include\n     * @returns {Promise<Object>} The response data\n     * @throws {Error} If the request fails\n     */",
        "method_ApiClient_setTimeoutDuration": "/**\n     * Configure the request timeout\n     * \n     * @param {number} ms - Timeout in milliseconds\n     */",
        "function_formatResponse": "/**\n * Format API response with metadata\n * \n * @param {Object|Array} data - The data to format\n * @returns {Object} Formatted response with timestamp and count\n */",
        "function_createServer": "/**\n * Create and configure an Express server\n * \n * @param {number} port - The port number to listen on\n * @returns {Object} The configured Express app\n */",
        "module_exports": "/**\n * module.exports\n */"
    };

    test("extractJSDocsFromProcessed should extract JSDocs correctly", () => {
        const jsdocs = extractJSDocsFromProcessed(processedCode);
        expect(jsdocs).toEqual(expectedJSDocs);
    });

    test("insertJSDocsUsingAST should insert JSDocs correctly", () => {
        const jsdocs = extractJSDocsFromProcessed(processedCode);
        const updatedCode = insertJSDocsUsingAST(originalCode, jsdocs);

        // Check class documentation
        expect(updatedCode).toContain("Client for making API requests");
        expect(updatedCode.indexOf("Client for making API")).toBeLessThan(updatedCode.indexOf("class ApiClient"));

        // Check constructor documentation
        expect(updatedCode).toContain("Create a new API client");
        expect(updatedCode.indexOf("Create a new API client")).toBeLessThan(updatedCode.indexOf("constructor(baseUrl)"));

        // Check method documentation
        expect(updatedCode).toContain("Fetch data from an API endpoint");
        expect(updatedCode.indexOf("Fetch data from an API")).toBeLessThan(updatedCode.indexOf("async getData"));

        // Check function documentation
        expect(updatedCode).toContain("Format API response with metadata");
        expect(updatedCode.indexOf("Format API response")).toBeLessThan(updatedCode.indexOf("function formatResponse"));

        // Check arrow function documentation
        expect(updatedCode).toContain("Create and configure an Express server");
        expect(updatedCode.indexOf("Create and configure")).toBeLessThan(updatedCode.indexOf("const createServer"));

        // Check module.exports documentation
        expect(updatedCode).toContain("module.exports");
        expect(updatedCode.indexOf("/**\n * module.exports\n */")).toBeLessThan(updatedCode.indexOf("module.exports = {"));
    });
});