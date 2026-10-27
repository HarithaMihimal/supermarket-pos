import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { pool, testDatabaseConnection } from './config/database';

import productRoutes from './routes/productRoutes';
import saleRoutes from './routes/saleRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import settingsRoutes from './routes/settingsRoutes';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import { requestLogger } from './middleware/requestLogger';
import { authenticate } from './middleware/auth';
import { runMigrations } from './config/migrations';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
}));
app.use(express.json());
app.use(requestLogger);

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
app.use('/api/sales', saleRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/settings', authenticate, settingsRoutes);

app.use(errorHandler);

async function start() {
  try {
    await runMigrations();
    await testDatabaseConnection();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start backend:', error);
    process.exit(1);
  }
}


start();