const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const verifyToken = require('../middleware/auth');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid email or password.' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid email or password.' });

    if (user.isActive === false) {
      return res.status(403).json({ error: 'Hesabınız pasif durumda. Lütfen yönetici ile iletişime geçin.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'supersecretkey',
      { expiresIn: '1d' }
    );

    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true } 
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

