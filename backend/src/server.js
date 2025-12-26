require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const dns = require('dns');
const net = require('net');
const rateLimit = require('express-rate-limit');
const { codeQueue, connection } = require('./worker/queue');
const { QueueEvents } = require('bullmq');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const codeRoutes = require('./routes/code');

const app = express();
const server = http.createServer(app);

function safeLogConnectionInfo() {
  try {
    const dbUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
    if (dbUrl) {
      console.log('[DB]', {
        host: dbUrl.hostname,
        port: dbUrl.port || '5432',
        db: dbUrl.pathname?.replace('/', '') || '<unknown>',
        search: dbUrl.search ? '[set]' : '[empty]',
      });
    } else {
      console.warn('[DB] DATABASE_URL is not set');
    }
  } catch (e) {
    console.warn('[DB] Failed to parse DATABASE_URL');
  }

  try {
    const redisUrl = process.env.REDIS_URL ? new URL(process.env.REDIS_URL) : null;
    if (redisUrl) {
      console.log('[REDIS]', {
        host: redisUrl.hostname,
        port: redisUrl.port || '<unknown>',
        tls: redisUrl.protocol === 'rediss:' ? 'enabled' : 'disabled',
      });
    } else {
      console.warn('[REDIS] REDIS_URL is not set');
    }
  } catch (e) {
    console.warn('[REDIS] Failed to parse REDIS_URL');
  }
}

safeLogConnectionInfo();

// Configure CORS for Express (MUST be before Helmet)
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

// Security headers (AFTER CORS)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Socket.IO needs this
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow CORS
}));

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

// Body parser with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'An error occurred' 
      : err.message 
  });
});

// Health check (DB + Redis connectivity)
app.get('/api/health', async (req, res) => {
  const out = {
    ok: true,
    db: { ok: false },
    redis: { ok: false },
    time: new Date().toISOString(),
  };

  // DNS check for DB host (helps distinguish DNS/network issues)
  try {
    const dbUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
    if (dbUrl?.hostname) {
      const lookup = await dns.promises.lookup(dbUrl.hostname);
      out.db.dns = { ok: true, address: lookup.address, family: lookup.family, host: dbUrl.hostname };
    } else {
      out.db.dns = { ok: false, error: 'DATABASE_URL_NOT_SET' };
    }
  } catch (e) {
    out.ok = false;
    out.db.dns = {
      ok: false,
      error: e?.code || e?.name || 'DNS_LOOKUP_FAILED',
    };
  }

  // TCP connectivity check to DB host:port (helps distinguish reachability vs auth/SSL issues)
  try {
    const dbUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
    const host = dbUrl?.hostname;
    const port = Number(dbUrl?.port || 5432);
    if (!host) throw new Error('DATABASE_URL_NOT_SET');

    out.db.tcp = await new Promise((resolve) => {
      const socket = new net.Socket();
      const started = Date.now();
      const timeoutMs = 6000;

      const done = (result) => {
        try { socket.destroy(); } catch (_) {}
        resolve({ ...result, host, port, ms: Date.now() - started });
      };

      socket.setTimeout(timeoutMs);
      socket.once('connect', () => done({ ok: true }));
      socket.once('timeout', () => done({ ok: false, error: 'TIMEOUT' }));
      socket.once('error', (err) => done({ ok: false, error: err?.code || err?.name || 'TCP_ERROR' }));

      socket.connect(port, host);
    });
  } catch (e) {
    out.ok = false;
    out.db.tcp = { ok: false, error: e?.message || e?.code || 'TCP_CHECK_FAILED' };
  }

  try {
    // Lazy import to avoid circular deps; prisma client is a singleton in ../lib/prisma
    const prisma = require('./lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
    out.db.ok = true;
  } catch (e) {
    out.ok = false;
    const msgLines =
      typeof e?.message === 'string'
        ? e.message
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
        : [];
    out.db.error = {
      name: e?.name || 'DB_ERROR',
      code: e?.code || e?.errorCode || undefined,
      // Keep message short and avoid leaking anything sensitive
      message: msgLines.slice(0, 4).join(' | ').slice(0, 500) || (e?.toString?.() || '').slice(0, 500),
    };
    console.error('[HEALTH][DB]', out.db.error);
  }

  try {
    // BullMQ ioredis connection
    await connection.ping();
    out.redis.ok = true;
  } catch (e) {
    out.ok = false;
    out.redis.error = {
      name: e?.name || 'REDIS_ERROR',
      code: e?.code || undefined,
      message: typeof e?.message === 'string' ? e.message.split('\n')[0].slice(0, 300) : undefined,
    };
    console.error('[HEALTH][REDIS]', out.redis.error);
  }

  res.status(out.ok ? 200 : 503).json(out);
});

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

