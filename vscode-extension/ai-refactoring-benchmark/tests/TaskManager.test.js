const TaskManager = require('./../TaskManager');

global.console = {
  log: jest.fn(),
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug
};

describe('TaskManager', () => {
  let taskManager;

  beforeEach(() => {
    taskManager = new TaskManager();
    console.log.mockClear();
  });

  describe('Task Creation', () => {
    test('should create a task with correct properties', () => {
      const task = taskManager.add('Test Task', 'Task description', 'high', '2025-05-20');
      
      expect(task.getId()).toBe(1);
      expect(task.getName()).toBe('Test Task');
      expect(task.getDescription()).toBe('Task description');
      expect(task.getPriority()).toBe('high');
      expect(task.getStatus()).toBe('pending');
      expect(task.getDeadline()).toBe('2025-05-20');
      expect(task.getCreated()).toBeDefined();
    });

    test('should increment task ID for each new task', () => {
      const task1 = taskManager.add('Task 1', 'First task');
      const task2 = taskManager.add('Task 2', 'Second task');
      const task3 = taskManager.add('Task 3', 'Third task');
      
      expect(task1.getId()).toBe(1);
      expect(task2.getId()).toBe(2);
      expect(task3.getId()).toBe(3);
    });

    test('should not create a task without a name', () => {
      const task = taskManager.add('', 'Description');
      
      expect(task).toBeNull();
      expect(console.log).toHaveBeenCalledWith('Task name is required');
    });

    test('should set default priority to medium when not specified', () => {
      const task = taskManager.add('Task', 'Description');
      
      expect(task.getPriority()).toBe('medium');
    });

    test('should set null deadline when not specified', () => {
      const task = taskManager.add('Task', 'Description');
      
      expect(task.getDeadline()).toBeNull();
    });
  });

  describe('Getting Tasks', () => {
    test('getAll should return all tasks', () => {
      taskManager.add('Task 1', 'First');
      taskManager.add('Task 2', 'Second');
      
      const tasks = taskManager.getAll();
      
      expect(tasks.length).toBe(2);
      expect(tasks[0].getName()).toBe('Task 1');
      expect(tasks[1].getName()).toBe('Task 2');
    });

    test('get should return task by ID', () => {
      taskManager.add('Task 1', 'First');
      const task2 = taskManager.add('Task 2', 'Second');
      
      const retrieved = taskManager.get(2);
      
      expect(retrieved).toBe(task2);
      expect(retrieved.getName()).toBe('Task 2');
    });

    test('get should return null for non-existent ID', () => {
      taskManager.add('Task 1', 'First');
      
      const result = taskManager.get(99);
      
      expect(result).toBeNull();
      expect(console.log).toHaveBeenCalledWith('Task with ID 99 not found');
    });
  });

  describe('Updating Tasks', () => {
    test('should update task properties', () => {
      taskManager.add('Original Task', 'Original description', 'low');
      
      const updated = taskManager.update(1, 'Updated Task', 'Updated description', 'high', 'in-progress', '2025-06-01');
      
      expect(updated.getName()).toBe('Updated Task');
      expect(updated.getDescription()).toBe('Updated description');
      expect(updated.getPriority()).toBe('high');
      expect(updated.getStatus()).toBe('in-progress');
      expect(updated.getDeadline()).toBe('2025-06-01');
    });

    test('should only update provided properties', () => {
      const task = taskManager.add('Original Task', 'Original description', 'low');
      
      taskManager.update(1, 'Updated Task', null, null, null, null);
      
      expect(task.getName()).toBe('Updated Task');
      expect(task.getDescription()).toBe('Original description');
      expect(task.getPriority()).toBe('low');
      expect(task.getStatus()).toBe('pending');
      expect(task.getDeadline()).toBeNull();
    });

    test('should return null when updating non-existent task', () => {
      const result = taskManager.update(99, 'Updated Task');
      
      expect(result).toBeNull();
      expect(console.log).toHaveBeenCalledWith('Task with ID 99 not found');
    });
  });

  describe('Deleting Tasks', () => {
    test('should delete task by ID', () => {
      taskManager.add('Task 1', 'Description 1');
      taskManager.add('Task 2', 'Description 2');
      
      const deleted = taskManager.delete(1);
      const tasks = taskManager.getAll();
      
      expect(deleted.getName()).toBe('Task 1');
      expect(tasks.length).toBe(1);
      expect(tasks[0].getName()).toBe('Task 2');
    });

    test('should return null when deleting non-existent task', () => {
      const result = taskManager.delete(99);
      
      expect(result).toBeNull();
      expect(console.log).toHaveBeenCalledWith('Task with ID 99 not found');
    });
  });

  describe('Completing Tasks', () => {
    test('should mark task as completed', () => {
      taskManager.add('Task 1', 'Description');
      
      const completed = taskManager.complete(1);
      
      expect(completed.getStatus()).toBe('completed');
    });

    test('should return null when completing non-existent task', () => {
      const result = taskManager.complete(99);
      
      expect(result).toBeNull();
      expect(console.log).toHaveBeenCalledWith('Task with ID 99 not found');
    });
  });

  describe('Filtering Tasks', () => {
    beforeEach(() => {
      taskManager.add('Task 1', 'Description 1', 'high');
      taskManager.add('Task 2', 'Description 2', 'medium');
      taskManager.add('Task 3', 'Description 3', 'low');
      taskManager.complete(2);
    });

    test('should filter tasks by status', () => {
      const pendingTasks = taskManager.getByStatus('pending');
      const completedTasks = taskManager.getByStatus('completed');
      
      expect(pendingTasks.length).toBe(2);
      expect(pendingTasks[0].getName()).toBe('Task 1');
      expect(pendingTasks[1].getName()).toBe('Task 3');
      
      expect(completedTasks.length).toBe(1);
      expect(completedTasks[0].getName()).toBe('Task 2');
    });

    test('should filter tasks by priority', () => {
      const highPriorityTasks = taskManager.getByPriority('high');
      const mediumPriorityTasks = taskManager.getByPriority('medium');
      const lowPriorityTasks = taskManager.getByPriority('low');
      
      expect(highPriorityTasks.length).toBe(1);
      expect(highPriorityTasks[0].getName()).toBe('Task 1');
      
      expect(mediumPriorityTasks.length).toBe(1);
      expect(mediumPriorityTasks[0].getName()).toBe('Task 2');
      
      expect(lowPriorityTasks.length).toBe(1);
      expect(lowPriorityTasks[0].getName()).toBe('Task 3');
    });
  });

  describe('Task Class', () => {
    test('should set and get task properties correctly', () => {
      const task = taskManager.add('Original Task', 'Original description');
      
      task.setName('Updated Task');
      task.setDescription('Updated description');
      task.setPriority('high');
      task.setStatus('in-progress');
      task.setDeadline('2025-05-01');
      
      expect(task.getName()).toBe('Updated Task');
      expect(task.getDescription()).toBe('Updated description');
      expect(task.getPriority()).toBe('high');
      expect(task.getStatus()).toBe('in-progress');
      expect(task.getDeadline()).toBe('2025-05-01');
    });
  });
  

  describe('Overdue Tasks', () => {
    let OriginalDate;
    
    beforeEach(() => {
        OriginalDate = global.Date;
    });
    
    afterEach(() => {
        global.Date = OriginalDate;
    });

    test('should identify overdue tasks', () => {
      const realDateNow = Date.now;
      const mockDate = new Date('2025-05-01T12:00:00Z');
      global.Date = class extends OriginalDate {
        constructor(...args) {
          if (args.length === 0) {
            return new OriginalDate(mockDate);
          }
          return new OriginalDate(...args);
        }
  
        static now() {
          return mockDate.getTime();
        }
      };

      taskManager.add('Past Task', 'Overdue', 'high', '2025-04-01');
      taskManager.add('Future Task', 'Not overdue', 'medium', '2025-06-01');
      taskManager.add('Completed Task', 'Completed but overdue', 'low', '2025-04-15');
      taskManager.complete(3);
      
      const overdueTasks = taskManager.getOverdue();
      
      expect(overdueTasks.length).toBe(1);
      expect(overdueTasks[0].getName()).toBe('Past Task');
      
      global.Date = realDateNow;
    });
    
    test('should not include tasks without deadlines', () => {
      taskManager.add('No Deadline Task', 'No deadline set');
      
      const overdueTasks = taskManager.getOverdue();
      
      expect(overdueTasks.length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty task list gracefully', () => {
      expect(taskManager.getAll().length).toBe(0);
      expect(taskManager.getByStatus('pending').length).toBe(0);
      expect(taskManager.getByPriority('high').length).toBe(0);
      expect(taskManager.getOverdue().length).toBe(0);
    });
  
    test('should validate priority values', () => {
      const validTask = taskManager.add('Valid Task', 'Description', 'high');
      const invalidTask = taskManager.add('Invalid Priority', 'Description', 'invalid-priority');
      
      expect(validTask.getPriority()).toBe('high');
      // Should default to medium for invalid priorities
      expect(invalidTask.getPriority()).toBe('invalid-priority');
    });
  
    test('should handle null and undefined parameters correctly', () => {
      const task = taskManager.add('Task', null);
      
      expect(task.getDescription()).toBeNull();
      
      taskManager.update(task.getId(), undefined, 'Updated description');
      expect(task.getName()).toBe('Task'); // Name shouldn't change
      expect(task.getDescription()).toBe('Updated description');
    });
  });
  
  describe('Multiple Operations', () => {
    test('should handle adding and deleting multiple tasks', () => {
      for (let i = 1; i <= 5; i++) {
        taskManager.add(`Task ${i}`, `Description ${i}`);
      }
      
      expect(taskManager.getAll().length).toBe(5);
      
      taskManager.delete(2);
      taskManager.delete(4);
      
      expect(taskManager.getAll().length).toBe(3);
      expect(taskManager.get(2)).toBeNull();
      expect(taskManager.get(4)).toBeNull();
      expect(taskManager.get(1)).not.toBeNull();
      expect(taskManager.get(3)).not.toBeNull();
      expect(taskManager.get(5)).not.toBeNull();
    });
  
    test('should handle updating a task multiple times', () => {
      const task = taskManager.add('Original', 'Original desc');
      
      taskManager.update(task.getId(), 'First update');
      expect(task.getName()).toBe('First update');
      
      taskManager.update(task.getId(), 'Second update');
      expect(task.getName()).toBe('Second update');
      
      taskManager.update(task.getId(), null, 'Updated desc', 'high');
      expect(task.getName()).toBe('Second update');
      expect(task.getDescription()).toBe('Updated desc');
      expect(task.getPriority()).toBe('high');
    });
  });
  
  describe('Task Lifecycle', () => {
    test('should track complete lifecycle of a task', () => {
      // Create
      const task = taskManager.add('Lifecycle Task', 'Test the full lifecycle');
      expect(task.getStatus()).toBe('pending');
      
      // Update
      taskManager.update(task.getId(), 'Updated Lifecycle Task', 'Updated description', 'high', 'in-progress');
      expect(task.getName()).toBe('Updated Lifecycle Task');
      expect(task.getStatus()).toBe('in-progress');
      
      // Complete
      taskManager.complete(task.getId());
      expect(task.getStatus()).toBe('completed');
      
      // Verify it doesn't show in overdue even if deadline is past
      task.setDeadline('2020-01-01');
      const overdueTasks = taskManager.getOverdue();
      expect(overdueTasks.findIndex(t => t.getId() === task.getId())).toBe(-1);
      
      // Delete
      const deleted = taskManager.delete(task.getId());
      expect(deleted.getId()).toBe(task.getId());
      expect(taskManager.get(task.getId())).toBeNull();
    });
  });
  
  describe('Update Method Behavior', () => {
    test('should not change values when null values are provided for update', () => {
      const task = taskManager.add('Original Name', 'Original Description', 'low', '2025-12-31');
      
      taskManager.update(task.getId(), null, null, null, null, null);
      
      expect(task.getName()).toBe('Original Name');
      expect(task.getDescription()).toBe('Original Description');
      expect(task.getPriority()).toBe('low');
      expect(task.getStatus()).toBe('pending');
      expect(task.getDeadline()).toBe('2025-12-31');
    });
    
    test('should update only specific properties', () => {
      const task = taskManager.add('Original Name', 'Original Description', 'low', '2025-12-31');
      
      // Update only name and status
      taskManager.update(task.getId(), 'New Name', null, null, 'in-progress', null);
      
      expect(task.getName()).toBe('New Name');
      expect(task.getDescription()).toBe('Original Description');
      expect(task.getPriority()).toBe('low');
      expect(task.getStatus()).toBe('in-progress');
      expect(task.getDeadline()).toBe('2025-12-31');
    });
  });
  
  describe('Date Handling', () => {
    test('should properly parse and compare dates for overdue tasks', () => {
      // Mock current date to a fixed point
      const OriginalDate = global.Date;
      const mockDate = new Date('2025-06-15');
      global.Date = class extends OriginalDate {
        constructor(...args) {
          if (args.length === 0) {
            return new OriginalDate(mockDate);
          }
          return new OriginalDate(...args);
        }
        
        static now() {
          return mockDate.getTime();
        }
      };
      
      // Add tasks with different dates
      const pastTask = taskManager.add('Past', 'Past', 'high', '2025-06-10');
      const futureTask = taskManager.add('Future', 'Future', 'high', '2025-06-20');
      const todayTask = taskManager.add('Today', 'Today', 'high', '2025-06-15');
      
      const overdue = taskManager.getOverdue();
      
      expect(overdue.length).toBe(1);
      expect(overdue[0].getId()).toBe(pastTask.getId());
      
      // Restore original Date
      global.Date = OriginalDate;
    });
    
    test('should handle invalid date formats gracefully', () => {
      const task = taskManager.add('Invalid Date', 'Test', 'medium', 'not-a-date');
      
      // Validate storage of invalid date
      expect(task.getDeadline()).toBe('not-a-date');
      
      // Check that it doesn't break getOverdue
      const overdue = taskManager.getOverdue();
      expect(Array.isArray(overdue)).toBe(true);
    });
  });
  
  describe('Getter Methods Behavior', () => {
    test('getByStatus should handle non-existent status', () => {
      taskManager.add('Task 1', 'Description');
      
      const nonExistentStatus = taskManager.getByStatus('non-existent-status');
      
      expect(Array.isArray(nonExistentStatus)).toBe(true);
      expect(nonExistentStatus.length).toBe(0);
    });
    
    test('getByPriority should handle non-existent priority', () => {
      taskManager.add('Task 1', 'Description', 'high');
      
      const nonExistentPriority = taskManager.getByPriority('non-existent-priority');
      
      expect(Array.isArray(nonExistentPriority)).toBe(true);
      expect(nonExistentPriority.length).toBe(0);
    });
  });
});