const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const verifyToken = require('../middleware/auth');
const { codeQueue } = require('../worker/queue');
const { decrypt } = require('../lib/crypto');

router.post('/request', verifyToken, async (req, res) => {
  const { gameId } = req.body;
  const userId = req.user.id;

  try {
    // 0. Haftalık limit kontrolü (her kullanıcı, her oyun için 7 günde 1 istek)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const lastRequest = await prisma.codeRequest.findFirst({
      where: {
        userId: userId,
        gameId: gameId,
        createdAt: {
          gte: oneWeekAgo
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (lastRequest) {
      return res.status(429).json({
        error: 'Bu oyun için haftada yalnızca bir kez Steam Guard kodu isteyebilirsiniz.'
      });
    }

    // 1. Find Assignment
    // We need to find an assignment that links this user to this game.
    // Assignment links User -> SteamAccount -> Game
    const assignment = await prisma.assignment.findFirst({
      where: {
        userId: userId,
        steamAccount: {
          gameId: gameId
        }
      },
      include: {
        steamAccount: true
      }
    });

    if (!assignment) {
      return res.status(403).json({ error: 'You do not own this game.' });
    }

    const steamAccount = assignment.steamAccount;

    // 2. İstek kaydını oluştur (limit kontrolünden sonra)
    await prisma.codeRequest.create({
      data: {
        userId,
        gameId
      }
    });

    // 3. Add to Queue
    const job = await codeQueue.add('fetch-code', {
      userId,
      gameId,
      steamAccountId: steamAccount.id,
      username: steamAccount.username,
      // We don't send password/token here if we can avoid it, or we send encrypted 
      // and let worker decrypt. It's safer to read from DB in worker, 
      // but passing IDs is fine.
      encryptedPassword: steamAccount.password,
      encryptedGmailToken: steamAccount.gmailRefreshToken,
      gmailEmail: steamAccount.gmailEmail
    });

    res.json({ status: 'QUEUED', jobId: job.id });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get games for user
router.get('/my-games', verifyToken, async (req, res) => {
  try {
    const assignments = await prisma.assignment.findMany({
      where: { userId: req.user.id },
      include: {
        steamAccount: {
          include: {
            game: true
          }
        }
      }
    });

    // Transform to list of unique games or accounts
    const games = assignments.map(a => {
      let password = null;
      try {
        password = decrypt(a.steamAccount.password);
      } catch (e) {
        password = null;
      }

      return {
        gameId: a.steamAccount.game.id,
        title: a.steamAccount.game.title,
        coverImage: a.steamAccount.game.coverImage,
        steamUsername: a.steamAccount.username,
        steamPassword: password,
      };
    });

    res.json(games);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

