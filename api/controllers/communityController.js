const prisma = require('../../lib/prisma');
const {
  isValidEmail,
  isValidSolanaAddress,
  sanitizeString,
  validateNumber
} = require('../../utils/validation');

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

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address format'
      });
    }

    // Validate username format (3-30 alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
      return res.status(400).json({
        success: false,
        error: 'Username must be 3-30 alphanumeric characters, hyphens, or underscores'
      });
    }

    // Validate wallet address if provided
    if (walletAddress && !isValidSolanaAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Solana wallet address'
      });
    }

    // Sanitize text inputs to prevent XSS
    const sanitizedFullName = fullName ? sanitizeString(fullName).slice(0, 100) : null;
    const sanitizedBio = bio ? sanitizeString(bio).slice(0, 500) : null;
    const sanitizedCountry = country ? sanitizeString(country).slice(0, 100) : null;
    const sanitizedDiscord = discordUsername ? sanitizeString(discordUsername).slice(0, 50) : null;
    const sanitizedTelegram = telegramUsername ? sanitizeString(telegramUsername).slice(0, 50) : null;
    const sanitizedTwitter = twitterUsername ? sanitizeString(twitterUsername).slice(0, 50) : null;
    const sanitizedGithub = githubUsername ? sanitizeString(githubUsername).slice(0, 50) : null;

    // Check if email or username already exists
    const existingMember = await prisma.communityMember.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase().trim() },
          { username }
        ]
      }
    });

    if (existingMember) {
      return res.status(409).json({
        success: false,
        error: existingMember.email === email.toLowerCase().trim()
          ? 'Email already registered'
          : 'Username already taken'
      });
    }

    // Create new community member with validated and sanitized data
    const member = await prisma.communityMember.create({
      data: {
        email: email.toLowerCase().trim(),
        username: sanitizeString(username),
        fullName: sanitizedFullName,
        walletAddress: walletAddress || null,
        discordUsername: sanitizedDiscord,
        telegramUsername: sanitizedTelegram,
        twitterUsername: sanitizedTwitter,
        githubUsername: sanitizedGithub,
        bio: sanitizedBio,
        country: sanitizedCountry,
        timezone: timezone ? sanitizeString(timezone).slice(0, 50) : null,
        interests: Array.isArray(interests) ? interests.map(i => sanitizeString(i)).slice(0, 20) : [],
        skills: Array.isArray(skills) ? skills.map(s => sanitizeString(s)).slice(0, 20) : [],
        contributionAreas: Array.isArray(contributionAreas) ? contributionAreas.map(c => sanitizeString(c)).slice(0, 10) : [],
        stackUserId: stackUserId || null,
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

    // Validate and sanitize updated fields
    const sanitizedData = {};

    if (updateData.username) {
      if (!/^[a-zA-Z0-9_-]{3,30}$/.test(updateData.username)) {
        return res.status(400).json({
          success: false,
          error: 'Username must be 3-30 alphanumeric characters, hyphens, or underscores'
        });
      }
      sanitizedData.username = sanitizeString(updateData.username);
    }

    if (updateData.fullName !== undefined) {
      sanitizedData.fullName = updateData.fullName ? sanitizeString(updateData.fullName).slice(0, 100) : null;
    }

    if (updateData.bio !== undefined) {
      sanitizedData.bio = updateData.bio ? sanitizeString(updateData.bio).slice(0, 500) : null;
    }

    if (updateData.walletAddress !== undefined) {
      if (updateData.walletAddress && !isValidSolanaAddress(updateData.walletAddress)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Solana wallet address'
        });
      }
      sanitizedData.walletAddress = updateData.walletAddress || null;
    }

    if (updateData.country !== undefined) {
      sanitizedData.country = updateData.country ? sanitizeString(updateData.country).slice(0, 100) : null;
    }

    if (updateData.timezone !== undefined) {
      sanitizedData.timezone = updateData.timezone ? sanitizeString(updateData.timezone).slice(0, 50) : null;
    }

    if (updateData.discordUsername !== undefined) {
      sanitizedData.discordUsername = updateData.discordUsername ? sanitizeString(updateData.discordUsername).slice(0, 50) : null;
    }

    if (updateData.telegramUsername !== undefined) {
      sanitizedData.telegramUsername = updateData.telegramUsername ? sanitizeString(updateData.telegramUsername).slice(0, 50) : null;
    }

    if (updateData.twitterUsername !== undefined) {
      sanitizedData.twitterUsername = updateData.twitterUsername ? sanitizeString(updateData.twitterUsername).slice(0, 50) : null;
    }

    if (updateData.githubUsername !== undefined) {
      sanitizedData.githubUsername = updateData.githubUsername ? sanitizeString(updateData.githubUsername).slice(0, 50) : null;
    }

    if (updateData.interests !== undefined && Array.isArray(updateData.interests)) {
      sanitizedData.interests = updateData.interests.map(i => sanitizeString(i)).slice(0, 20);
    }

    if (updateData.skills !== undefined && Array.isArray(updateData.skills)) {
      sanitizedData.skills = updateData.skills.map(s => sanitizeString(s)).slice(0, 20);
    }

    if (updateData.contributionAreas !== undefined && Array.isArray(updateData.contributionAreas)) {
      sanitizedData.contributionAreas = updateData.contributionAreas.map(c => sanitizeString(c)).slice(0, 10);
    }

    // Copy over other safe fields
    const safeFields = ['avatarUrl', 'status', 'emailVerified', 'walletVerified', 'stackUserId'];
    safeFields.forEach(field => {
      if (updateData[field] !== undefined) {
        sanitizedData[field] = updateData[field];
      }
    });

    const member = await prisma.communityMember.update({
      where: { id },
      data: sanitizedData
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

    // Validate pagination parameters
    let validatedPage, validatedLimit;
    try {
      validatedPage = validateNumber(page, 1, 10000);
      validatedLimit = validateNumber(limit, 1, 100); // Max 100 items per page
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pagination parameters: ' + error.message
      });
    }

    // Validate status parameter
    const validStatuses = ['pending', 'active', 'suspended', 'inactive'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const skip = (validatedPage - 1) * validatedLimit;
    const take = validatedLimit;

    const where = {
      status
    };

    // Sanitize search parameter
    if (search) {
      const sanitizedSearch = sanitizeString(search).slice(0, 100);
      if (sanitizedSearch) {
        where.OR = [
          { username: { contains: sanitizedSearch, mode: 'insensitive' } },
          { fullName: { contains: sanitizedSearch, mode: 'insensitive' } }
        ];
      }
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
        page: validatedPage,
        limit: validatedLimit,
        total,
        pages: Math.ceil(total / validatedLimit)
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
