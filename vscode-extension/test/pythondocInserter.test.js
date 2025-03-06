const { extractDocstringsFromProcessed, insertDocstringsUsingAST } = require("../pythondocInserter");

describe("Python Docstring Inserter Tests", () => {
    const originalCode = `
class Solver:
    def __init__(self, workers=None, input_file_name=None, output_file_name=None):
        self.input_file_name = input_file_name
        self.output_file_name = output_file_name
        self.workers = workers

    def solve(self):
        start_time = time.time()
        
        print("Job Started")
        print("Workers %d" % len(self.workers))
        amount_of_points = self.read_input()
        step = amount_of_points / len(self.workers)

        mapped = []
        lastWorker = len(self.workers) - 1

        for i in range(0, lastWorker):
            mapped.append(self.workers[i].mymap(i * step, i * step + step))
        mapped.append(self.workers[lastWorker].mymap(lastWorker * step, amount_of_points))
        print('Map finished: ', mapped)

        reduced = self.myreduce(mapped, amount_of_points)
        print("Reduce finished: " + str(reduced))

        total_time = time.time() - start_time
        print("Job Finished in {:.3f} seconds".format(total_time))

        self.write_output(reduced, total_time)

    @staticmethod
    @expose
    def mymap(a, b):
        points_in_circle = 0
        for i in range(a, b):
            points_in_circle += Solver.hits_count()
        return points_in_circle

    @staticmethod
    @expose
    def myreduce(mapped, total_points):
        points_in_circle = 0
        for x in mapped:
            points_in_circle += x.value
        return 4.0 * float(points_in_circle) / float(total_points)

    def read_input(self):
        with open(self.input_file_name, 'r') as f:
            line = f.readline()
        return int(line)

    def write_output(self, output, time_elapsed):
        with open(self.output_file_name, 'w') as f:
            f.write("Result: {}\n".format(output))
            f.write("Execution Time: {:.3f} seconds\n".format(time_elapsed))

    @staticmethod
    def hits_count():
        x = random.uniform(0.0, 1.0)
        y = random.uniform(0.0, 1.0)
        if (pow(x, 2) + pow(y, 2)) <= 1.0:
            return 1
        return 0
`;

    const processedCode = `
class Solver:
    """
    A class to estimate the value of π using the Monte Carlo method with parallel workers.

    Attributes:
        workers (list): A list of worker instances that perform mapping tasks.
        input_file_name (str): The name of the input file containing the number of points.
        output_file_name (str): The name of the output file where results will be written.
    """

    def __init__(self, workers=None, input_file_name=None, output_file_name=None):
        """
        Initializes the Solver with optional workers, input file, and output file.

        Args:
            workers (list, optional): A list of worker instances. Defaults to None.
            input_file_name (str, optional): The name of the input file. Defaults to None.
            output_file_name (str, optional): The name of the output file. Defaults to None.
        """
        self.input_file_name = input_file_name
        self.output_file_name = output_file_name
        self.workers = workers

    def solve(self):
        """
        Runs the Monte Carlo simulation to estimate π.

        This method reads the number of points from the input file, distributes the work
        among the workers, applies the map-reduce pattern, and writes the results to the output file.
        """
        start_time = time.time()

        print("Job Started")
        print("Workers %d" % len(self.workers))
        amount_of_points = self.read_input()
        step = amount_of_points / len(self.workers)

        mapped = []
        lastWorker = len(self.workers) - 1

        for i in range(0, lastWorker):
            mapped.append(self.workers[i].mymap(i * step, i * step + step))
        mapped.append(self.workers[lastWorker].mymap(lastWorker * step, amount_of_points))
        print('Map finished: ', mapped)

        reduced = self.myreduce(mapped, amount_of_points)
        print("Reduce finished: " + str(reduced))

        total_time = time.time() - start_time
        print("Job Finished in {:.3f} seconds".format(total_time))

        self.write_output(reduced, total_time)

    @staticmethod
    @expose
    def mymap(a, b):
        """
        Maps a range of points to their corresponding hits within a quarter-circle.

        Args:
            a (int): The starting index of points.
            b (int): The ending index of points.

        Returns:
            int: The number of points that fall inside the quarter-circle.
        """
        points_in_circle = 0
        for i in range(a, b):
            points_in_circle += Solver.hits_count()
        return points_in_circle

    @staticmethod
    @expose
    def myreduce(mapped, total_points):
        """
        Reduces the mapped results to compute the estimation of π.

        Args:
            mapped (list): A list of results from the mapping function.
            total_points (int): The total number of points used in the simulation.

        Returns:
            float: The estimated value of π.
        """
        points_in_circle = 0
        for x in mapped:
            points_in_circle += x.value
        return 4.0 * float(points_in_circle) / float(total_points)

    def read_input(self):
        """
        Reads the number of points from the input file.

        Returns:
            int: The number of points to be used in the simulation.
        """
        with open(self.input_file_name, 'r') as f:
            line = f.readline()
        return int(line)

    def write_output(self, output, time_elapsed):
        """
        Writes the computed π estimation and execution time to the output file.

        Args:
            output (float): The estimated value of π.
            time_elapsed (float): The execution time in seconds.
        """
        with open(self.output_file_name, 'w') as f:
            f.write("Result: {}\n".format(output))
            f.write("Execution Time: {:.3f} seconds\n".format(time_elapsed))

    @staticmethod
    def hits_count():
        """
        Generates a random point and checks whether it falls inside the unit quarter-circle.

        Returns:
            int: 1 if the point is inside the quarter-circle, otherwise 0.
        """
        x = random.uniform(0.0, 1.0)
        y = random.uniform(0.0, 1.0)
        if (pow(x, 2) + pow(y, 2)) <= 1.0:
            return 1
        return 0
`;

    const expectedDocstrings = {
        module: null,
        "class_Solver": `"""
    A class to estimate the value of π using the Monte Carlo method with parallel workers.

    Attributes:
        workers (list): A list of worker instances that perform mapping tasks.
        input_file_name (str): The name of the input file containing the number of points.
        output_file_name (str): The name of the output file where results will be written.
    """`,
        "function___init__": `"""
        Initializes the Solver with optional workers, input file, and output file.

        Args:
            workers (list, optional): A list of worker instances. Defaults to None.
            input_file_name (str, optional): The name of the input file. Defaults to None.
            output_file_name (str, optional): The name of the output file. Defaults to None.
        """`,
        "function_solve": `"""
        Runs the Monte Carlo simulation to estimate π.

        This method reads the number of points from the input file, distributes the work
        among the workers, applies the map-reduce pattern, and writes the results to the output file.
        """`,
        "function_mymap": `"""
        Maps a range of points to their corresponding hits within a quarter-circle.

        Args:
            a (int): The starting index of points.
            b (int): The ending index of points.

        Returns:
            int: The number of points that fall inside the quarter-circle.
        """`,
        "function_myreduce": `"""
        Reduces the mapped results to compute the estimation of π.

        Args:
            mapped (list): A list of results from the mapping function.
            total_points (int): The total number of points used in the simulation.

        Returns:
            float: The estimated value of π.
        """`,
        "function_read_input": `"""
        Reads the number of points from the input file.

        Returns:
            int: The number of points to be used in the simulation.
        """`,
        "function_write_output": `"""
        Writes the computed π estimation and execution time to the output file.

        Args:
            output (float): The estimated value of π.
            time_elapsed (float): The execution time in seconds.
        """`,
        "function_hits_count": `"""
        Generates a random point and checks whether it falls inside the unit quarter-circle.

        Returns:
            int: 1 if the point is inside the quarter-circle, otherwise 0.
        """`
    };

    test("extractDocstringsFromProcessed should extract docstrings correctly", () => {
        const docstrings = extractDocstringsFromProcessed(processedCode);
        expect(docstrings).toEqual(expectedDocstrings);
    });

    test("insertDocstringsUsingAST should insert docstrings correctly", () => {
        const docstrings = extractDocstringsFromProcessed(processedCode);
        const updatedCode = insertDocstringsUsingAST(originalCode, docstrings);

        // Перевірка наявності docstring для класу (всередині класу, після оголошення)
        expect(updatedCode).toContain("A class to estimate the value of π using the Monte Carlo method");
        expect(updatedCode.indexOf("A class to estimate the value of π")).toBeGreaterThan(updatedCode.indexOf("class Solver:"));
        expect(updatedCode.indexOf("A class to estimate the value of π")).toBeLessThan(updatedCode.indexOf("def __init__(self, workers=None"));

        // Перевірка наявності docstring для методу __init__
        expect(updatedCode).toContain("Initializes the Solver with optional workers");
        expect(updatedCode.indexOf("Initializes the Solver with optional workers")).toBeGreaterThan(updatedCode.indexOf("def __init__(self, workers=None"));
        expect(updatedCode.indexOf("Initializes the Solver with optional workers")).toBeLessThan(updatedCode.indexOf("self.input_file_name = input_file_name"));

        // Перевірка наявності docstring для методу solve
        expect(updatedCode).toContain("Runs the Monte Carlo simulation to estimate π");
        expect(updatedCode.indexOf("Runs the Monte Carlo simulation to estimate π")).toBeGreaterThan(updatedCode.indexOf("def solve(self):"));
        expect(updatedCode.indexOf("Runs the Monte Carlo simulation to estimate π")).toBeLessThan(updatedCode.indexOf("start_time = time.time()"));

        // Перевірка наявності docstring для методу mymap
        expect(updatedCode).toContain("Maps a range of points to their corresponding hits");
        expect(updatedCode.indexOf("Maps a range of points to their corresponding hits")).toBeGreaterThan(updatedCode.indexOf("def mymap(a, b):"));
        expect(updatedCode.indexOf("Maps a range of points to their corresponding hits")).toBeLessThan(updatedCode.indexOf("points_in_circle = 0"));

        // Перевірка наявності docstring для методу myreduce
        expect(updatedCode).toContain("Reduces the mapped results to compute the estimation of π");
        expect(updatedCode.indexOf("Reduces the mapped results to compute the estimation of π")).toBeGreaterThan(updatedCode.indexOf("def myreduce(mapped, total_points):"));

        // Перевірка наявності docstring для методу read_input
        expect(updatedCode).toContain("Reads the number of points from the input file");
        expect(updatedCode.indexOf("Reads the number of points from the input file")).toBeGreaterThan(updatedCode.indexOf("def read_input(self):"));
        expect(updatedCode.indexOf("Reads the number of points from the input file")).toBeLessThan(updatedCode.indexOf("with open(self.input_file_name"));

        // Перевірка наявності docstring для методу write_output
        expect(updatedCode).toContain("Writes the computed π estimation and execution time");
        expect(updatedCode.indexOf("Writes the computed π estimation and execution time")).toBeGreaterThan(updatedCode.indexOf("def write_output(self, output, time_elapsed):"));
        expect(updatedCode.indexOf("Writes the computed π estimation and execution time")).toBeLessThan(updatedCode.indexOf("with open(self.output_file_name"));

        // Перевірка наявності docstring для методу hits_count
        expect(updatedCode).toContain("Generates a random point and checks whether it falls");
        expect(updatedCode.indexOf("Generates a random point and checks whether it falls")).toBeGreaterThan(updatedCode.indexOf("def hits_count():"));
        expect(updatedCode.indexOf("Generates a random point and checks whether it falls")).toBeLessThan(updatedCode.indexOf("x = random.uniform(0.0, 1.0)"));
    });
});



describe("Python Docstring Inserter Tests - Simple Function", () => {
    const originalCode = `
def calculate_sum(a, b):
    result = a + b
    return result
`;

    const processedCode = `
def calculate_sum(a, b):
    """
    Calculates the sum of two numbers.

    Args:
        a (int): The first number.
        b (int): The second number.

    Returns:
        int: The sum of a and b.
    """
    result = a + b
    return result
`;

    const expectedDocstrings = {
        module: null,
        "function_calculate_sum": `"""
    Calculates the sum of two numbers.

    Args:
        a (int): The first number.
        b (int): The second number.

    Returns:
        int: The sum of a and b.
    """`
    };

    test("extractDocstringsFromProcessed should extract docstring correctly for a single function", () => {
        const docstrings = extractDocstringsFromProcessed(processedCode);
        expect(docstrings).toEqual(expectedDocstrings);
    });

    test("insertDocstringsUsingAST should insert docstring correctly for a single function", () => {
        const docstrings = extractDocstringsFromProcessed(processedCode);
        const updatedCode = insertDocstringsUsingAST(originalCode, docstrings);

        // Перевірка наявності docstring
        expect(updatedCode).toContain("Calculates the sum of two numbers");

        // Перевірка позиціонування: docstring між "def" і тілом функції
        expect(updatedCode.indexOf("Calculates the sum of two numbers")).toBeGreaterThan(updatedCode.indexOf("def calculate_sum(a, b):"));
        expect(updatedCode.indexOf("Calculates the sum of two numbers")).toBeLessThan(updatedCode.indexOf("result = a + b"));
    });
});