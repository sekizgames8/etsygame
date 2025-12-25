const { Queue } = require('bullmq');
const IORedis = require('ioredis');

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL environment variable is required');
}

const connection = new IORedis(process.env.REDIS_URL, {
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

