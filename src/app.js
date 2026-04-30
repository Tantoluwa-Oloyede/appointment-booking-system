import express from 'express';
import 'dotenv/config';
import{json, urlencoded} from 'express';

const app = express();

app.use(json());
app.use(urlencoded({ extended: true }));

app.get('/', (_req, res) => {
  res.status(200).json({ message: 'Appointment and Booking System Active' });
});

// routes(app)

// 404
app.use((_req, res) => {
  res.status(404).json({ status: 'error', message: 'Resource not found' });
});

// 500 — needs 4 params so Express knows it's an error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Ooooops! Something broke somewhere'
  });
});

const port = process.env.PORT;
const host = process.env.HOST || '0.0.0.0';

app.listen(port, host, () => {
  console.log(`Server running on http://${host}:${port}`);
});

export default app;