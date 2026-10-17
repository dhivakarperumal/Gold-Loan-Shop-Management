require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./src/config/db');
const { initializeAuthModule } = require('./src/modules/authModule');
const { initializeCategoryModule } = require('./src/modules/categoryModule');
const { initializeMetalModule } = require('./src/modules/metalModule');
const apiRouter = require('./src/router');

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

app.get('/', (req, res) => {
  res.json({ message: 'Gold Shop Management Backend is running' });
});

app.use('/api', apiRouter);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((error, req, res, next) => {
  console.error('Request failed:', error);
  res.status(500).json({ message: 'Internal server error' });
});

async function startServer() {
  await initializeDatabase();
  await initializeAuthModule();
  await initializeCategoryModule();
  await initializeMetalModule();
  const server = app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
  });

  server.on('error', (error) => {
    console.error(`Backend failed to listen on port ${PORT}: ${error.message}`);
    process.exit(1);
  });
}

startServer().catch((error) => {
  console.error('Backend failed to start:', error);
  process.exitCode = 1;
});