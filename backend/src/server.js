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

app.set('trust proxy', 1);

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

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  skip: (req) => {
    return req.path === '/api/health';
  },
  handler: (req, res, next, options) => {
    console.warn(`RATE LIMIT EXCEEDED: IP=${req.ip} Path=${req.path} Method=${req.method}`);
    res.status(options.statusCode).json(options.message);
  },
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  }
});

const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait 5 minutes.' },
  handler: (req, res, next, options) => {
    console.warn(`STRICT RATE LIMIT: IP=${req.ip} Path=${req.path}`);
    res.status(options.statusCode).json(options.message);
  },
  keyGenerator: (req) => req.ip || 'unknown'
});

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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'An error occurred' 
      : err.message 
  });
});

app.get('/api/health', async (req, res) => {
  const out = {
    ok: true,
    db: { ok: false },
    redis: { ok: false },
    time: new Date().toISOString(),
  };

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
      message: msgLines.slice(0, 4).join(' | ').slice(0, 500) || (e?.toString?.() || '').slice(0, 500),
    };
    console.error('[HEALTH][DB]', out.db.error);
  }

  try {
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

app.use('/api/auth', strictLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/code', strictLimiter, codeRoutes);

io.on('connection', (socket) => {
  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
  });
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

const queueEvents = new QueueEvents('steam-codes', { connection });

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  if (returnvalue && returnvalue.userId) {
    io.to(`user_${returnvalue.userId}`).emit('code_status', {
      status: 'DONE',
      code: returnvalue.code,
      gameId: returnvalue.gameId
    });
  }
});

queueEvents.on('progress', ({ jobId, data }) => {
  if (data && data.userId) {
     io.to(`user_${data.userId}`).emit('code_status', {
       status: data.status,
       gameId: data.gameId
     });
  }
});

queueEvents.on('failed', async ({ jobId, failedReason }) => {
  try {
    const job = await codeQueue.getJob(jobId);
    if (job && job.data && job.data.userId) {
      let status = 'ERROR';
      if (failedReason?.includes('SECURITY_BLOCK:AUTHENTICATOR_ATTEMPT')) {
        status = 'SECURITY_BLOCK';
      } else if (failedReason?.includes('SECURITY_BLOCK:UNKNOWN_EMAIL_TYPE')) {
        status = 'SECURITY_UNKNOWN';
      }
      
      io.to(`user_${job.data.userId}`).emit('code_status', {
        status,
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
