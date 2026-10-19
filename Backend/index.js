require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('node:path');
const { initializeDatabase } = require('./src/config/db');
const { initializeAuthModule } = require('./src/modules/authModule');
const { initializeCategoryModule } = require('./src/modules/categoryModule');
const { initializeMetalModule } = require('./src/modules/metalModule');
const { initializeProductModule } = require('./src/modules/productModule');
const { initializeLoanCustomerModule } = require('./src/modules/loanCustomerModule');
const { initializeLoanModule } = require('./src/modules/loanModule');
const { initializeBannerModule } = require('./src/modules/bannerModule');
const { initializeGoldRateModule } = require('./src/modules/goldRateModule');
const { initializeVideoModule } = require('./src/modules/videoModule');
const { initializeReviewModule } = require('./src/modules/reviewModule');
const { initializeDealerModule } = require('./src/modules/dealerModule');
const { initializeStoreModule } = require('./src/modules/storeModule');
const apiRouter = require('./src/router');
const { pool } = require('./src/config/db');

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.json({ message: 'Gold Shop Management Backend is running' });
});

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  return next();
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
  await initializeProductModule();
  await initializeLoanCustomerModule();
  await initializeLoanModule();
  await initializeBannerModule();
  await initializeGoldRateModule();
  await initializeVideoModule();
  await initializeReviewModule();
  await initializeDealerModule();
  await initializeStoreModule();
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