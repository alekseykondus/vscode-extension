class Task {
  constructor(id, n, d, p = "medium", dl = null) {
    this.id = id; // id
    this.n = n; // name
    this.d = d; // description
    this.p = p; // priority (low, medium, high)
    this.s = "pending"; // status
    this.dl = dl; // deadline
    this.cr = new Date().toISOString(); // created
  }

  getId() { return this.id; }
  getName() { return this.n; }
  getDescription() { return this.d; }
  getPriority() { return this.p; }
  getStatus() { return this.s; }
  getDeadline() { return this.dl; }
  getCreated() { return this.cr; }

  setName(n) { this.n = n; }
  setDescription(d) { this.d = d; }
  setPriority(p) { this.p = p; }
  setStatus(s) { this.s = s; }
  setDeadline(dl) { this.dl = dl; }
}


class TaskManager {
  constructor() {
    // Список задач (id, назва, опис, пріоритет, статус, дедлайн)
    this.t = [];
    // Лічильник для ID
    this.c = 1;
  }
    
  // Додати нову задачу
  add(n, d, p = "medium", dl = null) {
    if (!n) {
      console.log("Task name is required");
      return null;
    }
    
    const task = new Task(this.c++, n, d, p, dl);
    
    this.t.push(task);
    console.log(`Task "${n}" added with ID: ${task.getId()}`);
    return task;
  }
  
  // Отримати всі задачі
  getAll() {
    return this.t;
  }
  
  // Отримати задачу за ID
  get(id) {
    for (let i = 0; i < this.t.length; i++) {
      if (this.t[i].id === id) {
        return this.t[i];
      }
    }
    console.log(`Task with ID ${id} not found`);
    return null;
  }
  
  // Оновити задачу
  update(id, n, d, p, s, dl) {
    for (let i = 0; i < this.t.length; i++) {
      if (this.t[i].id === id) {
        if (n) this.t[i].n = n;
        if (d) this.t[i].d = d;
        if (p) this.t[i].p = p;
        if (s) this.t[i].s = s;
        if (dl) this.t[i].dl = dl;
        
        console.log(`Task with ID ${id} is updated`);
        return this.t[i];
      }
    }
    
    console.log(`Task with ID ${id} not found`);
    return null;
  }
  
  // Видалити задачу
  delete(id) {
    for (let i = 0; i < this.t.length; i++) {
      if (this.t[i].id === id) {
        const deleted = this.t.splice(i, 1);
        console.log(`Task with ID ${id} deleted`);
        return deleted[0];
      }
    }
    
    console.log(`Task with ID ${id} not found`);
    return null;
  }
  
  // Позначити задачу як виконану
  complete(id) {
    for (let i = 0; i < this.t.length; i++) {
      if (this.t[i].id === id) {
        this.t[i].s = "completed";
        console.log(`Task with ID ${id} marked as completed`);
        return this.t[i];
      }
    }
    
    console.log(`Task with ID ${id} not found`);
    return null;
  }
  
  // Отримати задачі за статусом
  getByStatus(status) {
    const result = [];
    for (let i = 0; i < this.t.length; i++) {
      if (this.t[i].s === status) {
        result.push(this.t[i]);
      }
    }
    return result;
  }
  
  // Отримати задачі за пріоритетом
  getByPriority(priority) {
    const result = [];
    for (let i = 0; i < this.t.length; i++) {
      if (this.t[i].p === priority) {
        result.push(this.t[i]);
      }
    }
    return result;
  }
  
  // Отримати прострочені задачі
  getOverdue() {
    const now = new Date();
    const result = [];
    
    for (let i = 0; i < this.t.length; i++) {
      if (this.t[i].dl && this.t[i].s !== "completed") {
        const deadline = new Date(this.t[i].dl);
        if (deadline < now) {
          result.push(this.t[i]);
        }
      }
    }
    
    return result;
  }
}

module.exports = TaskManager;