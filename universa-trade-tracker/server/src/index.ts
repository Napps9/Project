import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import portfolioRoutes from './routes/portfolio';
import marketRoutes from './routes/market';
import indicatorRoutes from './routes/indicators';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/portfolio', portfolioRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/indicators', indicatorRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Universa Trade Tracker API running on http://localhost:${PORT}`);
});
