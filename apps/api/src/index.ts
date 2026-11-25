import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import installmentRoutes from './routes/installment.routes';
import cors from 'cors';
import helmet from 'helmet';
import connectDB from './config/db';
import { corsOptions } from './config/cors';
import { setupSwagger } from './swagger';
import { errorHandler } from './middleware/error.middleware';

dotenv.config();
connectDB();

const app = express();
// Render puts one proxy in front of the API; without this, every user
// would share the proxy's IP address and one rate limit.
app.set('trust proxy', 1);
// Standard security headers; also removes X-Powered-By.
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
// Express 5 leaves req.body undefined when there is no JSON body; the
// validators expect an object (as in Express 4), so they can answer 400.
app.use((req, _res, next) => {
  req.body ??= {};
  next();
});

setupSwagger(app);

app.get('/', (req, res) => {
  res.send('PayFlow API is running!');
});
app.use('/api/auth', authRoutes);
app.use('/api/installments', installmentRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
