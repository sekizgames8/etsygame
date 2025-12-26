const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const { encrypt, decrypt } = require('../lib/crypto');
const verifyToken = require('../middleware/auth');
const isAdmin = require('../middleware/admin');

router.use(verifyToken);
router.use(isAdmin);

const { connection } = require('../worker/queue');

// System Status Endpoint
router.get('/system-status', async (req, res) => {
  try {
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    
    // DB Check
    const startDb = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - startDb;

    // Redis Check
    const startRedis = Date.now();
    await connection.ping();
    const redisLatency = Date.now() - startRedis;
    
    res.json({
      uptime,
      memory,
      dbLatency,
      redisLatency,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request History Endpoint (Admin)
router.get('/history', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  try {
    const total = await prisma.codeRequest.count();
    const requests = await prisma.codeRequest.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true }
        },
        game: {
          select: { title: true }
        }
      }
    });

    res.json({
      requests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create User
router.post('/users', async (req, res) => {
  const { email, password, name, role, isActive } = req.body;
  
  // Input validation
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }
  
  if (password.length < 6 || password.length > 128) {
    return res.status(400).json({ error: 'Password must be between 6 and 128 characters.' });
  }
  
  if (role && !['USER', 'ADMIN'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be USER or ADMIN.' });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { 
        email: email.toLowerCase().trim(), 
        password: hashedPassword, 
        name: name?.trim() || null, 
        role: role || 'USER',
        isActive: typeof isActive === 'boolean' ? isActive : true,
      }
    });
    // Don't send password back
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'User with this email already exists.' });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// Delete User
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Delete code requests
    await prisma.codeRequest.deleteMany({ where: { userId: id } });
    
    // 2. Delete assignments
    await prisma.assignment.deleteMany({ where: { userId: id } });
    
    // 3. Delete user
    await prisma.user.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// Create Game
router.post('/games', async (req, res) => {
  const { title, coverImage, listingUrl } = req.body;
  
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'Title is required and must be a non-empty string.' });
  }
  
  if (title.length > 200) {
    return res.status(400).json({ error: 'Title must be less than 200 characters.' });
  }
  
  try {
    const game = await prisma.game.create({
      data: { 
        title: title.trim(), 
        coverImage: coverImage?.trim() || `https://placehold.co/300x450?text=${encodeURIComponent(title.trim())}`,
        listingUrl: listingUrl?.trim() || null
      }
    });
    res.json(game);
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Failed to create game.' });
  }
});

// Update Game
router.put('/games/:id', async (req, res) => {
  const { id } = req.params;
  const { title, coverImage, listingUrl } = req.body;
  try {
    const game = await prisma.game.update({
      where: { id },
      data: { 
        title, 
        coverImage,
        listingUrl: listingUrl || null
      },
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

