require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { codeQueue, connection } = require('./worker/queue');
const { QueueEvents } = require('bullmq');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const codeRoutes = require('./routes/code');

const app = express();
const server = http.createServer(app);

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

// Apply rate limiting to all requests
app.use(limiter);

// Configure CORS for Express
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://www.sekizgames.com",
    "https://sekizgames.com"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://www.sekizgames.com",
      "https://sekizgames.com"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/code', codeRoutes);

// Socket.IO
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`Socket ${socket.id} joined user_${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Pass IO to request for direct usage if needed, though QueueEvents is better
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Listen to Queue Events
const queueEvents = new QueueEvents('steam-codes', { connection });

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`Job ${jobId} completed! Result: ${JSON.stringify(returnvalue)}`);
  // returnvalue should contain { userId, code, gameId }
  if (returnvalue && returnvalue.userId) {
    io.to(`user_${returnvalue.userId}`).emit('code_status', {
      status: 'DONE',
      code: returnvalue.code,
      gameId: returnvalue.gameId
    });
  }
});

queueEvents.on('progress', ({ jobId, data }) => {
  // data: { status: 'PROCESSING' | 'WAITING_MAIL', userId, gameId }
  if (data && data.userId) {
     io.to(`user_${data.userId}`).emit('code_status', {
       status: data.status,
       gameId: data.gameId
     });
  }
});

queueEvents.on('failed', async ({ jobId, failedReason }) => {
  console.error(`Job ${jobId} failed: ${failedReason}`);

  try {
    // Look up the job to get its data, including userId and gameId
    const job = await codeQueue.getJob(jobId);
    if (job && job.data && job.data.userId) {
      io.to(`user_${job.data.userId}`).emit('code_status', {
        status: 'ERROR',
        gameId: job.data.gameId,
      });
    }
  } catch (err) {
    console.error("Failed to emit failed status for job", jobId, err);
  }
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

