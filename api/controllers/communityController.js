const prisma = require('../../lib/prisma');

/**
 * Register a new community member
 * POST /api/community/register
 */
async function registerCommunityMember(req, res) {
  try {
    const {
      email,
      username,
      fullName,
      walletAddress,
      discordUsername,
      telegramUsername,
      twitterUsername,
      githubUsername,
      bio,
      country,
      timezone,
      interests,
      skills,
      contributionAreas,
      stackUserId
    } = req.body;

    // Validate required fields
    if (!email || !username) {
      return res.status(400).json({
        success: false,
        error: 'Email and username are required'
      });
    }

    // Check if email or username already exists
    const existingMember = await prisma.communityMember.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingMember) {
      return res.status(409).json({
        success: false,
        error: existingMember.email === email
          ? 'Email already registered'
          : 'Username already taken'
      });
    }

    // Create new community member
    const member = await prisma.communityMember.create({
      data: {
        email,
        username,
        fullName,
        walletAddress,
        discordUsername,
        telegramUsername,
        twitterUsername,
        githubUsername,
        bio,
        country,
        timezone,
        interests: interests || [],
        skills: skills || [],
        contributionAreas: contributionAreas || [],
        stackUserId,
        status: 'pending',
        emailVerified: false,
        walletVerified: false
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: member.id,
        email: member.email,
        username: member.username,
        status: member.status,
        createdAt: member.createdAt
      },
      message: 'Community member registered successfully. Please check your email for verification.'
    });

  } catch (error) {
    console.error('Community registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register community member',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Get community member profile
 * GET /api/community/profile/:id
 */
async function getCommunityMember(req, res) {
  try {
    const { id } = req.params;

    const member = await prisma.communityMember.findUnique({
      where: { id },
      include: {
        contributions: {
          where: { status: 'approved' },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        organizedEvents: {
          orderBy: { startTime: 'desc' },
          take: 5
        },
        eventRegistrations: {
          include: {
            event: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Community member not found'
      });
    }

    res.json({
      success: true,
      data: member
    });

  } catch (error) {
    console.error('Get community member error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve community member'
    });
  }
}

/**
 * Update community member profile
 * PUT /api/community/profile/:id
 */
async function updateCommunityMember(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be directly updated
    delete updateData.id;
    delete updateData.email;
    delete updateData.createdAt;
    delete updateData.reputationScore;
    delete updateData.contributionsCount;

    const member = await prisma.communityMember.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      data: member,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Update community member error:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Community member not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
}

/**
 * List all community members with pagination
 * GET /api/community/members
 */
async function listCommunityMembers(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      status = 'active',
      search
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      status
    };

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [members, total] = await Promise.all([
      prisma.communityMember.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
          bio: true,
          country: true,
          reputationScore: true,
          contributionsCount: true,
          createdAt: true,
          interests: true,
          skills: true
        }
      }),
      prisma.communityMember.count({ where })
    ]);

    res.json({
      success: true,
      data: members,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('List community members error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve community members'
    });
  }
}

module.exports = {
  registerCommunityMember,
  getCommunityMember,
  updateCommunityMember,
  listCommunityMembers
};
