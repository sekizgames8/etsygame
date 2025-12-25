const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL || 'rediss://default:AZDAAAIncDI4OWFiNjJjYjdlNzU0MDE0OWIyMzU1ZDYzYzljZjIyMHAyMzcwNTY@trusty-insect-37056.upstash.io:6379', {
  maxRetriesPerRequest: null,
});

const codeQueue = new Queue('steam-codes', { 
  connection,
  defaultJobOptions: {
    attempts: 3, // En fazla 3 kere dene
    backoff: {
      type: 'exponential',
      delay: 5000, // İlk hatadan sonra 5sn bekle, sonra katlayarak artır
    },
    removeOnComplete: true, // Başarılı işleri Redis'ten sil (yer kaplamasın)
    removeOnFail: 100, // Sadece son 100 başarısız işi tut
  }
});

module.exports = { codeQueue, connection };

