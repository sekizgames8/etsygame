const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const { encrypt, decrypt } = require('../lib/crypto');
const verifyToken = require('../middleware/auth');
const isAdmin = require('../middleware/admin');

router.use(verifyToken);
router.use(isAdmin);

// Create User
router.post('/users', async (req, res) => {
  const { email, password, name, role, isActive } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { 
        email, 
        password: hashedPassword, 
        name, 
        role: role || 'USER',
        isActive: typeof isActive === 'boolean' ? isActive : true,
      }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Game
router.post('/games', async (req, res) => {
  const { title, coverImage } = req.body;
  try {
    const game = await prisma.game.create({
      data: { title, coverImage }
    });
    res.json(game);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Game
router.put('/games/:id', async (req, res) => {
  const { id } = req.params;
  const { title, coverImage } = req.body;
  try {
    const game = await prisma.game.update({
      where: { id },
      data: { title, coverImage },
    });
    res.json(game);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Game (and related steam accounts + assignments)
router.delete('/games/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const accounts = await prisma.steamAccount.findMany({
      where: { gameId: id },
      select: { id: true },
    });

    const accountIds = accounts.map((a) => a.id);

    if (accountIds.length > 0) {
      await prisma.assignment.deleteMany({
        where: { steamAccountId: { in: accountIds } },
      });

      await prisma.steamAccount.deleteMany({
        where: { id: { in: accountIds } },
      });
    }

    await prisma.game.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Steam Account
router.post('/accounts', async (req, res) => {
  const { username, password, gmailEmail, gmailRefreshToken, gameId } = req.body;
  try {
    const encryptedPassword = encrypt(password);
    const encryptedToken = encrypt(gmailRefreshToken);
    
    const account = await prisma.steamAccount.create({
      data: {
        username,
        password: encryptedPassword,
        gmailEmail,
        gmailRefreshToken: encryptedToken,
        gameId
      }
    });
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Steam Account
router.put('/accounts/:id', async (req, res) => {
  const { id } = req.params;
  const { username, password, gmailEmail, gmailRefreshToken, gameId } = req.body;

  try {
    const data = {};

    if (typeof username === 'string') data.username = username;
    if (typeof gmailEmail === 'string') data.gmailEmail = gmailEmail;
    if (typeof gameId === 'string') data.gameId = gameId;

    if (typeof password === 'string' && password.length > 0) {
      data.password = encrypt(password);
    }

    if (typeof gmailRefreshToken === 'string' && gmailRefreshToken.length > 0) {
      data.gmailRefreshToken = encrypt(gmailRefreshToken);
    }

    const account = await prisma.steamAccount.update({
      where: { id },
      data,
    });

    res.json(account);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Steam Account (and related assignments)
router.delete('/accounts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Önce bu hesaba bağlı kullanıcı atamalarını sil
    await prisma.assignment.deleteMany({
      where: { steamAccountId: id },
    });

    // Ardından steam hesabını sil
    await prisma.steamAccount.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign Game to User
router.post('/assign', async (req, res) => {
  const { userId, steamAccountId } = req.body;
  try {
    const assignment = await prisma.assignment.create({
      data: { userId, steamAccountId }
    });
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle / update user active status
router.patch('/users/:id/active', async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { isActive: Boolean(isActive) },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Data (Simplified for dashboard)
router.get('/dashboard-data', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    const games = await prisma.game.findMany();
    const accounts = await prisma.steamAccount.findMany({ include: { game: true } });
    const assignments = await prisma.assignment.findMany({
      include: {
        user: true,
        steamAccount: { include: { game: true } },
      },
    });
    res.json({ users, games, accounts, assignments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Steam accounts detailed list for admin (with decrypted password)
router.get('/steam-accounts-detail', async (req, res) => {
  try {
    const accounts = await prisma.steamAccount.findMany({
      include: { game: true },
      orderBy: { createdAt: 'desc' },
    });

    const safeAccounts = accounts.map((acc) => ({
      id: acc.id,
      username: acc.username,
      gmailEmail: acc.gmailEmail,
      gameTitle: acc.game?.title || "Bilinmiyor",
      password: (() => {
        try {
          return decrypt(acc.password);
        } catch (e) {
          return "***";
        }
      })(),
    }));

    res.json(safeAccounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get users who own a specific game (through assignments)
router.get('/games/:id/users', async (req, res) => {
  const { id } = req.params;
  try {
    const assignments = await prisma.assignment.findMany({
      where: {
        steamAccount: {
          gameId: id,
        },
      },
      include: {
        user: true,
        steamAccount: true,
      },
    });

    const users = assignments.map((a) => ({
      id: a.user.id,
      email: a.user.email,
      name: a.user.name,
      role: a.user.role,
      isActive: a.user.isActive,
      steamUsername: a.steamAccount.username,
    }));

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

