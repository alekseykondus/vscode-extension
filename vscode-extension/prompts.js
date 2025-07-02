// TODO: добавить поддержку для больше языков программирования
const documentationPrompts = {
    javascript: "Generate detailed documentation for the following JavaScript code without modifying the original code. Add the documentation as JSDoc comments above the relevant functions, classes, or variables. Include a description of the purpose, parameters, return values, and usage examples in JSDoc format. Return only the documented code without any additional text or Markdown wrappers.",
    python: "Generate detailed documentation for the following Python code while keeping the original code unchanged. Use Google-style docstrings and place them directly above the corresponding functions or classes. Each docstring should include a concise description, parameter explanations (Args:), return values (Returns:). Return only the documented code without any additional text or Markdown wrappers.",
    java: "Produce detailed documentation for the following Java code without changing the original code. Add the documentation as Javadoc comments above the relevant classes, methods, or fields. Include descriptions of the class/method purpose, parameters, return types, exceptions, and examples. Return only the documented code without any additional text or Markdown wrappers.",
    default: "Generate detailed documentation for the following code without modifying the original code. Add the documentation as comments above the relevant sections, including a description of its purpose, inputs, outputs, and a simple usage example. Return only the documented code without any additional text or Markdown wrappers."
};

const refactoringPrompts = {
    javascript: "Refactor the following JavaScript code to improve readability, performance, and maintainability. Use modern ES6+ features where applicable and follow best practices. Do not use unsafe functions such as eval, Function constructor, or dynamic code execution via setTimeout/setInterval with string arguments. Return only the refactored code without any additional text or Markdown wrappers.",
    python: "Refactor the following Python code to enhance clarity, efficiency, and adherence to PEP 8 style guidelines. Optimize where possible. Do not use unsafe functions such as eval, exec, or compile for dynamic code execution. Return only the refactored code without any additional text or Markdown wrappers.",
    java: "Refactor the following Java code to improve readability and efficiency within its existing structure. Optimize the code without adding new classes or significant structural changes unless explicitly required. Follow Java naming conventions and best practices. Do not use unsafe dynamic code execution constructs, such as ScriptEngine or reflection for executing arbitrary code. Return only the refactored code without any additional text or Markdown wrappers.",
    default: "Refactor the following code to make it more readable, efficient, and maintainable, following best practices for its programming language. Avoid using unsafe functions or constructs for dynamic code execution, such as eval, exec, or similar mechanisms. Return only the refactored code without any additional text or Markdown wrappers."
};

const explanationPrompts = {
    javascript: "Explain the following JavaScript code line-by-line by adding detailed comments above each line, describing what it does and why. Return only the annotated code without any additional text or Markdown wrappers.",
    python: "Provide a line-by-line explanation of the following Python code by adding clear, concise comments above each line, detailing its functionality. Return only the annotated code without any additional text or Markdown wrappers.",
    java: "Annotate the following Java code with detailed comments above each line, explaining its purpose and behavior in the context of the program. Return only the annotated code without any additional text or Markdown wrappers.",
    default: "Add detailed comments above each line of the following code, explaining what each line does and its role in the overall logic. Return only the annotated code without any additional text or Markdown wrappers."
};

const generationPrompts = {
    javascript: "You will receive a JavaScript function signature. Your task is to generate and come up with a **complete** JavaScript function implementation. Ensure the signature remains unchanged and provide a meaningful implementation using ES6+ features and best practices. Return only the function code without any additional text or Markdown wrappers.",
    python: "You will receive a Python function signature. Your task is to generate and come up with a **complete** Python function implementation. Keep the exact signature unchanged and provide a meaningful implementation following PEP 8 style guidelines. Return only the function code without any additional text or Markdown wrappers.",
    java: "You will receive a Java method signature. Your task is to generate and come up with a **complete** Java method implementation",
    default: "You will receive a function or method signature. Your task is to generate and come up with a **complete** implementation in the corresponding language, ensuring the signature remains unchanged and providing a meaningful body. Return only the generated code without any additional text or Markdown wrappers."
};

const testingPrompts = {
    javascript: "Generate unit tests for the following JavaScript code using a testing framework like Jest or Mocha. Include test cases for all major functionalities, edge cases, and error handling. Return only the test code without any additional text or Markdown wrappers.",
    python: "Generate unit tests for the following Python code using the `unittest` or `pytest` framework. Include test cases for all major functionalities, edge cases, and error handling. Return only the test code without any additional text or Markdown wrappers.",
    java: "Generate unit tests for the following Java code using JUnit. Include test cases for all major functionalities, edge cases, and error handling. Return only the test code without any additional text or Markdown wrappers.",
    default: "Generate unit tests for the following code using the appropriate testing framework for its programming language. Include test cases for all major functionalities, edge cases, and error handling. Return only the test code without any additional text or Markdown wrappers."
};

const resultFormat = "Return the analysis result in JSON format: [{\"name\": \"class/interface name that has the problem\", \"issue\": \"issue description\", \"solution\": \"short proposed solution\"}]";

const SolidPrinciples = {
    SRP: {
        name: "Single Responsibility Principle",
        description: "A class should have only one reason to change",
        prompt: "Analyze the code for compliance with the Single Responsibility Principle (SRP). Identify classes that have more than one responsibility. " + resultFormat,
    },
    OCP: {
        name: "Open-Closed Principle",
        description: "Software entities should be open for extension, but closed for modification",
        prompt: "Analyze the code for compliance with the Open-Closed Principle (OCP). Identify classes that require modification to add new behavior instead of extension. " + resultFormat,
    },
    LSP: {
        name: "Liskov Substitution Principle",
        description: "Objects in a program should be replaceable with instances of their subtypes without altering the correctness of the program",
        prompt: "Analyze the code for compliance with the Liskov Substitution Principle (LSP). Identify subclasses that violate the contracts of base classes. " + resultFormat,
    },
    ISP: {
        name: "Interface Segregation Principle",
        description: "Many client-specific interfaces are better than one general-purpose interface",
        prompt: "Analyze the code for compliance with the Interface Segregation Principle (ISP). Identify interfaces that are too large and force classes to implement methods they don't need. " + resultFormat,
    },
    DIP: {
        name: "Dependency Inversion Principle",
        description: "High-level modules should not depend on low-level modules. Both should depend on abstractions",
        prompt: "Analyze the code for compliance with the Dependency Inversion Principle (DIP). Identify classes that depend on concrete implementations instead of abstractions. " + resultFormat
    }
};

const getSolidRecommendationPrompt = (principleCode, issue, recommendation) => 
    `Describe in detail how to correct the following violation of the principle ${principleCode}:
    ${issue}
    ${recommendation}

    Give:
    1. Explanation of why this is a problem from the perspective of the ${principleCode} principle
    2. Detailed step-by-step instructions on how to fix this
    3. What are the benefits of such a fix for code maintenance and extension
    
    You DO NOT need to generate the corrected code yourself. Only recommendations and instructions in words.`;

const getSolidFixPrompt = (principle, issue, recommendation, codeToFix, fileLanguage) => 
    `Task: Complete code refactoring based on the ${principle} principle, addressing the issue: ${issue},
    taking into account previously suggested recommendations: ${recommendation}

    Current code:
    \`\`\`${fileLanguage}
    ${codeToFix}
    \`\`\`

    Refactoring requirements:
    1. Focus ONLY on the current class
    2. DO NOT rewrite existing dependencies
    3. Create necessary abstractions and interfaces
    4. Minimize coupling
    5. Maximize extensibility
    6. Ensure clean architecture

    Response format:
    {
        "refactoredClasses": [
            {
                "fileName": "file_name.${fileLanguage}",
                "fullCode": "complete class code",
                "purpose": "purpose of the class"
            }
        ],
        "architectureDescription": "Description of the new architecture",
        "migrationSteps": ["Migration steps"]
    }
    Make sure your json response is valid, if there are brackets inside brackets, they should be with \".
    IMPORTANT: Return ONLY the JSON object with no additional text before or after it. Do not include any explanations, markdown formatting, or code blocks outside the JSON structure.
    `;

function getPrompt(prompts, languageId) {
    return prompts[languageId] || prompts.default;
}

module.exports = { getPrompt, documentationPrompts, refactoringPrompts, explanationPrompts, generationPrompts, testingPrompts, SolidPrinciples, getSolidRecommendationPrompt, getSolidFixPrompt };