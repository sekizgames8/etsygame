const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL || 'rediss://default:AZDAAAIncDI4OWFiNjJjYjdlNzU0MDE0OWIyMzU1ZDYzYzljZjIyMHAyMzcwNTY@trusty-insect-37056.upstash.io:6379', {
  maxRetriesPerRequest: null,
});

const codeQueue = new Queue('steam-codes', { connection });

module.exports = { codeQueue, connection };

