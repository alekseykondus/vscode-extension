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
        console.log("Назва задачі обов'язкова");
        return null;
      }
      
      const task = {
        id: this.c++,
        n: n,         // name
        d: d,         // description
        p: p,         // priority (low, medium, high)
        s: "pending", // status
        dl: dl,       // deadline
        cr: new Date().toISOString() // created
      };
      
      this.t.push(task);
      console.log(`Задача "${n}" додана з ID: ${task.id}`);
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
      console.log(`Задачу з ID ${id} не знайдено`);
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
          
          console.log(`Задачу з ID ${id} оновлено`);
          return this.t[i];
        }
      }
      
      console.log(`Задачу з ID ${id} не знайдено`);
      return null;
    }
    
    // Видалити задачу
    delete(id) {
      for (let i = 0; i < this.t.length; i++) {
        if (this.t[i].id === id) {
          const deleted = this.t.splice(i, 1);
          console.log(`Задачу з ID ${id} видалено`);
          return deleted[0];
        }
      }
      
      console.log(`Задачу з ID ${id} не знайдено`);
      return null;
    }
    
    // Позначити задачу як виконану
    complete(id) {
      for (let i = 0; i < this.t.length; i++) {
        if (this.t[i].id === id) {
          this.t[i].s = "completed";
          console.log(`Задачу з ID ${id} позначено як виконану`);
          return this.t[i];
        }
      }
      
      console.log(`Задачу з ID ${id} не знайдено`);
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

module.exports = TaskMgr;