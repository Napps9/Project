import express from 'express';
import cors from 'cors';
import productRoutes from './routes/products';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api', productRoutes);

app.listen(PORT, () => {
  console.log(`Food Scoring API running on http://localhost:${PORT}`);
});
