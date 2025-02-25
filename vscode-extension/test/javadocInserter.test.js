const { extractJavadocsFromProcessed, insertJavadocsUsingAST } = require("./../javadocInserter");

describe("Javadoc Inserter Tests - 1", () => {
    const originalCode = `
    private final EmployeeService employeeService;

    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    @GetMapping
    public String listManufacturers(Model model, EmployeeFilter filter, @RequestParam(defaultValue = "0") int page) {
        Pageable pageable = PageRequest.of(page, 3);
        Page<EmployeeResponseDTO> employeePage = employeeService.getAllEmployeesByFilter(filter, pageable);
        model.addAttribute("employees", PageResponse.of(employeePage));
        model.addAttribute("filter", filter);
        model.addAttribute("page", page);
        model.addAttribute("totalPages", employeePage.getTotalPages());
        return "employee/employees";
    }

    @GetMapping("/add")
    public String showAddEmployeeForm(Model model) {
        model.addAttribute("employee", new Employee());
        return "employee/newEmployee";
    }

    @PostMapping("/add-employee")
    public String addEmployee(@Valid @ModelAttribute("employee") EmployeeRequestDTO employeeRequestDTO, BindingResult bindingResult, Model model) {
        if (bindingResult.hasErrors()) {
            return "employee/newEmployee";
        }
        employeeService.createEmployee(employeeRequestDTO);
        return "redirect:/employees";
    }

    @GetMapping("/{id}/edit")
    public String showEditEmployeeForm(@PathVariable Long id, Model model) {
        EmployeeResponseDTO employee = employeeService.getEmployeeById(id);
        model.addAttribute("employee", employee);
        return "employee/editEmployee";
    }

    @PostMapping("/{id}/update")
    public String updateEmployee(@PathVariable Long id, @Valid @ModelAttribute("employee") EmployeeUpdateDTO employeeUpdateDTO, BindingResult bindingResult, Model model) {
        if (bindingResult.hasErrors()) {
            model.addAttribute("id", id);
            return "employee/editEmployee";
        }
        employeeService.updateEmployee(id, employeeUpdateDTO);
        return "redirect:/employees";
    }

    @PostMapping("/{id}/delete")
    public String deleteEmployee(@PathVariable Long id) {
        employeeService.deleteEmployee(id);
        return "redirect:/employees";
    }
    `;

    const processedCode = `
    /**
     * EmployeeService instance used for handling employee-related business logic.
     */
    private final EmployeeService employeeService;

    /**
     * Constructor for EmployeeController.
     * @param employeeService EmployeeService instance
     */
    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    /**
     * Retrieves a paginated list of employees based on the provided filter criteria.
     * @param model Model object for storing attributes
     * @param filter EmployeeFilter object for filtering employees
     * @param page Page number for pagination
     * @return View name for displaying the list of employees
     */
    @GetMapping
    public String listManufacturers(Model model, EmployeeFilter filter, @RequestParam(defaultValue = "0") int page) {
        Pageable pageable = PageRequest.of(page, 3);
        Page<EmployeeResponseDTO> employeePage = employeeService.getAllEmployeesByFilter(filter, pageable);
        model.addAttribute("employees", PageResponse.of(employeePage));
        model.addAttribute("filter", filter);
        model.addAttribute("page", page);
        model.addAttribute("totalPages", employeePage.getTotalPages());
        return "employee/employees";
    }

    /**
     * Displays the form for adding a new employee.
     * @param model Model object for storing attributes
     * @return View name for displaying the form
     */
    @GetMapping("/add")
    public String showAddEmployeeForm(Model model) {
        model.addAttribute("employee", new Employee());
        return "employee/newEmployee";
    }

    /**
     * Adds a new employee to the system.
     * @param employeeRequestDTO EmployeeRequestDTO object containing employee details
     * @param bindingResult BindingResult object for validation results
     * @param model Model object for storing attributes
     * @return Redirect to the list of employees view
     */
    @PostMapping("/add-employee")
    public String addEmployee(@Valid @ModelAttribute("employee") EmployeeRequestDTO employeeRequestDTO, BindingResult bindingResult, Model model) {
        if (bindingResult.hasErrors()) {
            return "employee/newEmployee";
        }
        employeeService.createEmployee(employeeRequestDTO);
        return "redirect:/employees";
    }

    /**
     * Displays the form for editing an existing employee.
     * @param id Employee ID
     * @param model Model object for storing attributes
     * @return View name for displaying the form
     */
    @GetMapping("/{id}/edit")
    public String showEditEmployeeForm(@PathVariable Long id, Model model) {
        EmployeeResponseDTO employee = employeeService.getEmployeeById(id);
        model.addAttribute("employee", employee);
        return "employee/editEmployee";
    }

    /**
     * Updates an existing employee in the system.
     * @param id Employee ID
     * @param employeeUpdateDTO EmployeeUpdateDTO object containing updated employee details
     * @param bindingResult BindingResult object for validation results
     * @param model Model object for storing attributes
     * @return Redirect to the list of employees view
     */
    @PostMapping("/{id}/update")
    public String updateEmployee(@PathVariable Long id, @Valid @ModelAttribute("employee") EmployeeUpdateDTO employeeUpdateDTO, BindingResult bindingResult, Model model) {
        if (bindingResult.hasErrors()) {
            model.addAttribute("id", id);
            return "employee/editEmployee";
        }
        employeeService.updateEmployee(id, employeeUpdateDTO);
        return "redirect:/employees";
    }

    /**
     * Deletes an employee from the system.
     * @param id Employee ID
     * @return Redirect to the list of employees view
     */
    @PostMapping("/{id}/delete")
    public String deleteEmployee(@PathVariable Long id) {
        employeeService.deleteEmployee(id);
        return "redirect:/employees";
    }
    `;

    const expectedJavadocs = {
        class: null,
        "field_employeeService": "/**\n     * EmployeeService instance used for handling employee-related business logic.\n     */",
        "constructor_EmployeeController": "/**\n     * Constructor for EmployeeController.\n     * @param employeeService EmployeeService instance\n     */",
        "listManufacturers": "/**\n     * Retrieves a paginated list of employees based on the provided filter criteria.\n     * @param model Model object for storing attributes\n     * @param filter EmployeeFilter object for filtering employees\n     * @param page Page number for pagination\n     * @return View name for displaying the list of employees\n     */",
        "showAddEmployeeForm": "/**\n     * Displays the form for adding a new employee.\n     * @param model Model object for storing attributes\n     * @return View name for displaying the form\n     */",
        "addEmployee": "/**\n     * Adds a new employee to the system.\n     * @param employeeRequestDTO EmployeeRequestDTO object containing employee details\n     * @param bindingResult BindingResult object for validation results\n     * @param model Model object for storing attributes\n     * @return Redirect to the list of employees view\n     */",
        "showEditEmployeeForm": "/**\n     * Displays the form for editing an existing employee.\n     * @param id Employee ID\n     * @param model Model object for storing attributes\n     * @return View name for displaying the form\n     */",
        "updateEmployee": "/**\n     * Updates an existing employee in the system.\n     * @param id Employee ID\n     * @param employeeUpdateDTO EmployeeUpdateDTO object containing updated employee details\n     * @param bindingResult BindingResult object for validation results\n     * @param model Model object for storing attributes\n     * @return Redirect to the list of employees view\n     */",
        "deleteEmployee": "/**\n     * Deletes an employee from the system.\n     * @param id Employee ID\n     * @return Redirect to the list of employees view\n     */",
    };

    test("extractJavadocsFromProcessed should extract Javadocs correctly", () => {
        const javadocs = extractJavadocsFromProcessed(processedCode);
        expect(javadocs).toEqual(expectedJavadocs);
    });

    test("insertJavadocsUsingAST should insert Javadocs correctly", () => {
        const javadocs = extractJavadocsFromProcessed(processedCode);
        const updatedCode = insertJavadocsUsingAST(originalCode, javadocs);

        // Перевірка наявності Javadoc для поля
        expect(updatedCode).toContain("EmployeeService instance used for handling employee-related business logic");
        expect(updatedCode.indexOf("EmployeeService instance used")).toBeLessThan(updatedCode.indexOf("private final EmployeeService employeeService"));

        // Перевірка наявності Javadoc для конструктора
        expect(updatedCode).toContain("Constructor for EmployeeController");
        expect(updatedCode.indexOf("Constructor for EmployeeController")).toBeLessThan(updatedCode.indexOf("public EmployeeController(EmployeeService employeeService)"));

        // Перевірка наявності Javadoc для методів
        expect(updatedCode).toContain("Retrieves a paginated list of employees based on the provided filter criteria");
        expect(updatedCode.indexOf("Retrieves a paginated list")).toBeLessThan(updatedCode.indexOf("@GetMapping"));

        expect(updatedCode).toContain("Displays the form for adding a new employee");
        expect(updatedCode.indexOf("Displays the form for adding")).toBeLessThan(updatedCode.indexOf('@GetMapping("/add")'));

        expect(updatedCode).toContain("Adds a new employee to the system");
        expect(updatedCode.indexOf("Adds a new employee")).toBeLessThan(updatedCode.indexOf('@PostMapping("/add-employee")'));

        expect(updatedCode).toContain("Displays the form for editing an existing employee");
        expect(updatedCode.indexOf("Displays the form for editing")).toBeLessThan(updatedCode.indexOf('@GetMapping("/{id}/edit")'));

        expect(updatedCode).toContain("Updates an existing employee in the system");
        expect(updatedCode.indexOf("Updates an existing employee")).toBeLessThan(updatedCode.indexOf('@PostMapping("/{id}/update")'));

        expect(updatedCode).toContain("Deletes an employee from the system");
        expect(updatedCode.indexOf("Deletes an employee")).toBeLessThan(updatedCode.indexOf('@PostMapping("/{id}/delete")'));
    });
});



describe("Javadoc Inserter Tests - 2", () => {
    const originalCode = `
@Controller
@RequestMapping("/employees")
public class EmployeeController {

    private final EmployeeService employeeService;

    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    @GetMapping
    public String listManufacturers(Model model, EmployeeFilter filter, @RequestParam(defaultValue = "0") int page) {
        Pageable pageable = PageRequest.of(page, 3);
        Page<EmployeeResponseDTO> employeePage = employeeService.getAllEmployeesByFilter(filter, pageable);
        model.addAttribute("employees", PageResponse.of(employeePage));
        model.addAttribute("filter", filter);
        model.addAttribute("page", page);
        model.addAttribute("totalPages", employeePage.getTotalPages());
        return "employee/employees";
    }

    @PostMapping("/add-employee")
    public String addEmployee(@Valid @ModelAttribute("employee") EmployeeRequestDTO employeeRequestDTO, BindingResult bindingResult, Model model) {
        if (bindingResult.hasErrors()) {
            return "employee/newEmployee";
        }
        employeeService.createEmployee(employeeRequestDTO);
        return "redirect:/employees";
    }
`;

    const processedCode = `
/**
 * Controller class for handling employee-related requests.
 */
@Controller
@RequestMapping("/employees")
public class EmployeeController {

    /**
     * EmployeeService instance used for handling employee-related business logic.
     */
    private final EmployeeService employeeService;

    /**
     * Constructor for EmployeeController.
     * @param employeeService EmployeeService instance
     */
    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    /**
     * Retrieves a paginated list of employees based on the provided filter criteria.
     * @param model Model object for storing attributes
     * @param filter EmployeeFilter object for filtering employees
     * @param page Page number for pagination
     * @return View name for displaying the list of employees
     */
    @GetMapping
    public String listManufacturers(Model model, EmployeeFilter filter, @RequestParam(defaultValue = "0") int page) {
        Pageable pageable = PageRequest.of(page, 3);
        Page<EmployeeResponseDTO> employeePage = employeeService.getAllEmployeesByFilter(filter, pageable);
        model.addAttribute("employees", PageResponse.of(employeePage));
        model.addAttribute("filter", filter);
        model.addAttribute("page", page);
        model.addAttribute("totalPages", employeePage.getTotalPages());
        return "employee/employees";
    }

    /**
     * Adds a new employee to the system.
     * @param employeeRequestDTO EmployeeRequestDTO object containing employee details
     * @param bindingResult BindingResult object for validation results
     * @param model Model object for storing attributes
     * @return Redirect to the list of employees view
     */
    @PostMapping("/add-employee")
    public String addEmployee(@Valid @ModelAttribute("employee") EmployeeRequestDTO employeeRequestDTO, BindingResult bindingResult, Model model) {
        if (bindingResult.hasErrors()) {
            return "employee/newEmployee";
        }
        employeeService.createEmployee(employeeRequestDTO);
        return "redirect:/employees";
    }
}
`;

    const expectedJavadocs = {
        class: "/**\n * Controller class for handling employee-related requests.\n */",
        "field_employeeService": "/**\n     * EmployeeService instance used for handling employee-related business logic.\n     */",
        "constructor_EmployeeController": "/**\n     * Constructor for EmployeeController.\n     * @param employeeService EmployeeService instance\n     */",
        "listManufacturers": "/**\n     * Retrieves a paginated list of employees based on the provided filter criteria.\n     * @param model Model object for storing attributes\n     * @param filter EmployeeFilter object for filtering employees\n     * @param page Page number for pagination\n     * @return View name for displaying the list of employees\n     */",
        "addEmployee": "/**\n     * Adds a new employee to the system.\n     * @param employeeRequestDTO EmployeeRequestDTO object containing employee details\n     * @param bindingResult BindingResult object for validation results\n     * @param model Model object for storing attributes\n     * @return Redirect to the list of employees view\n     */",
    };

    test("extractJavadocsFromProcessed should extract Javadocs correctly", () => {
        const javadocs = extractJavadocsFromProcessed(processedCode);
        expect(javadocs).toEqual(expectedJavadocs);
    });

    test("insertJavadocsUsingAST should insert Javadocs correctly", () => {
        const javadocs = extractJavadocsFromProcessed(processedCode);
        const updatedCode = insertJavadocsUsingAST(originalCode, javadocs);

        // Перевірка Javadoc для класу
        expect(updatedCode).toContain("Controller class for handling employee-related requests");
        expect(updatedCode.indexOf("Controller class for handling")).toBeLessThan(updatedCode.indexOf("@Controller"));

        // Перевірка Javadoc для поля
        expect(updatedCode).toContain("EmployeeService instance used for handling employee-related business logic");
        expect(updatedCode.indexOf("EmployeeService instance used")).toBeLessThan(updatedCode.indexOf("private final EmployeeService employeeService"));

        // Перевірка Javadoc для конструктора
        expect(updatedCode).toContain("Constructor for EmployeeController");
        expect(updatedCode.indexOf("Constructor for EmployeeController")).toBeLessThan(updatedCode.indexOf("public EmployeeController(EmployeeService employeeService)"));

        // Перевірка Javadoc для методів
        expect(updatedCode).toContain("Retrieves a paginated list of employees based on the provided filter criteria");
        expect(updatedCode.indexOf("Retrieves a paginated list")).toBeLessThan(updatedCode.indexOf("@GetMapping"));

        expect(updatedCode).toContain("Adds a new employee to the system");
        expect(updatedCode.indexOf("Adds a new employee")).toBeLessThan(updatedCode.indexOf('@PostMapping("/add-employee")'));
    });
});


describe("Javadoc Inserter Tests - 3", () => {
    const originalCode = `
    @PostMapping("/add-employee")
    public String addEmployee(@Valid @ModelAttribute("employee") EmployeeRequestDTO employeeRequestDTO, BindingResult bindingResult, Model model) {
        if (bindingResult.hasErrors()) {
            return "employee/newEmployee";
        }
        employeeService.createEmployee(employeeRequestDTO);
        return "redirect:/employees";
    }
}
`;

    const processedCode = `
    /**
     * Adds a new employee to the system.
     * @param employeeRequestDTO EmployeeRequestDTO object containing employee details
     * @param bindingResult BindingResult object for validation results
     * @param model Model object for storing attributes
     * @return Redirect to the list of employees view
     */
    @PostMapping("/add-employee")
    public String addEmployee(@Valid @ModelAttribute("employee") EmployeeRequestDTO employeeRequestDTO, BindingResult bindingResult, Model model) {
        if (bindingResult.hasErrors()) {
            return "employee/newEmployee";
        }
        employeeService.createEmployee(employeeRequestDTO);
        return "redirect:/employees";
    }
}
`;

    const expectedJavadocs = {
        class: null,
        "addEmployee": "/**\n     * Adds a new employee to the system.\n     * @param employeeRequestDTO EmployeeRequestDTO object containing employee details\n     * @param bindingResult BindingResult object for validation results\n     * @param model Model object for storing attributes\n     * @return Redirect to the list of employees view\n     */"
    };

    test("extractJavadocsFromProcessed should extract Javadocs correctly for single method", () => {
        const javadocs = extractJavadocsFromProcessed(processedCode);
        expect(javadocs).toEqual(expectedJavadocs);
    });

    test("insertJavadocsUsingAST should insert Javadocs correctly for single method", () => {
        const javadocs = extractJavadocsFromProcessed(processedCode);
        const updatedCode = insertJavadocsUsingAST(originalCode, javadocs);

        // Перевірка наявності Javadoc для методу
        expect(updatedCode).toContain("Adds a new employee to the system");
        expect(updatedCode.indexOf("Adds a new employee")).toBeLessThan(updatedCode.indexOf('@PostMapping("/add-employee")'));
    });
});