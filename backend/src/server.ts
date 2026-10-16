import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { pool, testDatabaseConnection } from './config/database';

import productRoutes from './routes/productRoutes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
}));
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      status: 'OK',
      database: 'connected',
      application: 'Supermarket POS',
    });
  } catch {
    res.status(503).json({
      status: 'ERROR',
      database: 'disconnected',
    });
  }
});

app.use('/api/products', productRoutes);

async function start() {
  try {
    await testDatabaseConnection();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start backend:', error);
    process.exit(1);
  }
}

app.use(errorHandler);

start();