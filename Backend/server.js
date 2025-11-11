const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 5000;
const TASKS_FILE = path.join(__dirname, 'tasks.json');

app.use(cors());
app.use(express.json());

// Initialize tasks file if it doesn't exist
async function initTasksFile() {
  try {
    await fs.access(TASKS_FILE);
  } catch {
    await fs.writeFile(TASKS_FILE, JSON.stringify([]));
  }
}

// Get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const data = await fs.readFile(TASKS_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: 'Failed to read tasks' });
  }
});

// Add new task
app.post('/api/tasks', async (req, res) => {
  try {
    const { text } = req.body;
    const data = await fs.readFile(TASKS_FILE, 'utf8');
    const tasks = JSON.parse(data);
    
    const newTask = {
      id: Date.now(),
      text: text,
      completed: false,
      createdAt: new Date().toISOString()
    };
    
    tasks.push(newTask);
    await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', port: PORT });
});

initTasksFile().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Task API running on port ${PORT}`);
  });
});