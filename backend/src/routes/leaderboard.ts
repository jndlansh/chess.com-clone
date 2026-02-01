// backend/src/routes/leaderboard.ts
import express, { type Request, type Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get leaderboard endpoint
router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        rating: true
      },
      orderBy: {
        rating: 'desc'
      }
    });

    // Add rank to each user
    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      name: user.username,
      rating: user.rating
    }));

    res.json({ leaderboard });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;