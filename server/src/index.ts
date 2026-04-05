import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDb } from './db/connection.js';
import categoriesRouter from './routes/categories.js';
import itemsRouter from './routes/items.js';
import skillsRouter from './routes/skills.js';
import sessionsRouter from './routes/sessions.js';
import dashboardRouter from './routes/dashboard.js';
import dataRouter from './routes/data.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API routes
app.use('/api/v1/categories', categoriesRouter);
app.use('/api/v1', itemsRouter);
app.use('/api/v1', skillsRouter);
app.use('/api/v1', sessionsRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/data', dataRouter);

// Serve static files in production
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);
