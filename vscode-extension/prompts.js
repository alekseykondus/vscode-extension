// TODO: добавить поддержку для больше языков программирования
const documentationPrompts = {
    javascript: "Generate detailed documentation for the following JavaScript code without modifying the original code. Add the documentation as JSDoc comments above the relevant functions, classes, or variables. Include a description of the purpose, parameters, return values, and usage examples in JSDoc format. Return only the documented code without any additional text or Markdown wrappers.",
    python: "Generate detailed documentation for the following Python code while keeping the original code unchanged. Use Google-style docstrings and place them directly above the corresponding functions or classes. Each docstring should include a concise description, parameter explanations (Args:), return values (Returns:). Return only the documented code without any additional text or Markdown wrappers.",
    java: "Produce detailed documentation for the following Java code without changing the original code. Add the documentation as Javadoc comments above the relevant classes, methods, or fields. Include descriptions of the class/method purpose, parameters, return types, exceptions, and examples. Return only the documented code without any additional text or Markdown wrappers.",
    default: "Generate detailed documentation for the following code without modifying the original code. Add the documentation as comments above the relevant sections, including a description of its purpose, inputs, outputs, and a simple usage example. Return only the documented code without any additional text or Markdown wrappers."
};

const refactoringPrompts = {
    javascript: "Refactor the following JavaScript code to improve readability, performance, and maintainability. Use modern ES6+ features where applicable and follow best practices. Return only the refactored code without any additional text or Markdown wrappers.",
    python: "Refactor the following Python code to enhance clarity, efficiency, and adherence to PEP 8 style guidelines. Optimize where possible. Return only the refactored code without any additional text or Markdown wrappers.",
    java: "Refactor the following Java code to improve readability and efficiency within its existing structure. Optimize the code without adding new classes or significant structural changes unless explicitly required. Follow Java naming conventions and best practices. Return only the refactored code without any additional text or Markdown wrappers.",
    default: "Refactor the following code to make it more readable, efficient, and maintainable, following best practices for its programming language. Return only the refactored code without any additional text or Markdown wrappers."
};

const explanationPrompts = {
    javascript: "Explain the following JavaScript code line-by-line by adding detailed comments above each line, describing what it does and why. Return only the annotated code without any additional text or Markdown wrappers.",
    python: "Provide a line-by-line explanation of the following Python code by adding clear, concise comments above each line, detailing its functionality. Return only the annotated code without any additional text or Markdown wrappers.",
    java: "Annotate the following Java code with detailed comments above each line, explaining its purpose and behavior in the context of the program. Return only the annotated code without any additional text or Markdown wrappers.",
    default: "Add detailed comments above each line of the following code, explaining what each line does and its role in the overall logic. Return only the annotated code without any additional text or Markdown wrappers."
};

module.exports = { documentationPrompts, refactoringPrompts, explanationPrompts };