const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5000;
const TASKS_FILE = path.join(__dirname, 'tasks.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-please-change';

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

// Initialize users file if missing
async function initUsersFile() {
  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, JSON.stringify([]));
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

// Register new user
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if(!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const usersRaw = await fs.readFile(USERS_FILE, 'utf8');
    const users = JSON.parse(usersRaw || '[]');
    if(users.find(u => u.username === username)) return res.status(409).json({ error: 'Username already exists' });

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const newUser = { id: Date.now(), username, passwordHash: hash, createdAt: new Date().toISOString() };
    users.push(newUser);
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, username: newUser.username });
  } catch (err) {
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if(!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const usersRaw = await fs.readFile(USERS_FILE, 'utf8');
    const users = JSON.parse(usersRaw || '[]');
    const user = users.find(u => u.username === username);
    if(!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = bcrypt.compareSync(password, user.passwordHash);
    if(!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user (token)
app.get('/api/me', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
    const token = auth.slice(7);
    const payload = jwt.verify(token, JWT_SECRET);
    res.json({ id: payload.id, username: payload.username });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});