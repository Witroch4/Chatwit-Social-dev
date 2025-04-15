const express = require('express');
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const Queue = require('bull');

// Create Express server
const app = express();
const PORT = process.env.BULL_BOARD_PORT || 3005;
const SECRET_TOKEN = process.env.BULL_BOARD_SECRET_TOKEN;

// Configure Redis connection
const redisConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_USE_TLS === 'true' ? {} : undefined
  }
};

// Initialize queues
const instagramQueue = new Queue('instagram', redisConfig);
const emailQueue = new Queue('email', redisConfig);

// Set up Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullAdapter(instagramQueue),
    new BullAdapter(emailQueue)
  ],
  serverAdapter
});

// Basic auth middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== SECRET_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

// Apply middleware
app.use('/admin/queues', authMiddleware, serverAdapter.getRouter());

// Start server
app.listen(PORT, () => {
  console.log(`Bull Board is running on port ${PORT}`);
  console.log(`Dashboard available at: http://localhost:${PORT}/admin/queues`);
}); 