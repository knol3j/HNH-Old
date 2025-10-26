const prisma = require('../../lib/prisma');
const {
  isValidEmail,
  isValidSolanaAddress,
  sanitizeString,
  validateNumber
} = require('../../utils/validation');

/**
 * Register a new vendor
 * POST /api/vendor/register
 */
async function registerVendor(req, res) {
  try {
    const {
      companyName,
      legalName,
      registrationNumber,
      taxId,
      contactEmail,
      contactPhone,
      websiteUrl,
      contactPersonName,
      contactPersonTitle,
      contactPersonEmail,
      businessType,
      industrySector,
      companySize,
      establishedYear,
      addressLine1,
      addressLine2,
      city,
      stateProvince,
      postalCode,
      country,
      paymentWalletAddress,
      partnershipType,
      productsServices,
      integrationInterest,
      expectedVolume,
      termsAccepted,
      stackUserId
    } = req.body;

    // Validate required fields
    if (!companyName || !contactEmail || !contactPersonName) {
      return res.status(400).json({
        success: false,
        error: 'Company name, contact email, and contact person name are required'
      });
    }

    // Validate email format
    if (!isValidEmail(contactEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid contact email format'
      });
    }

    // Validate contact person email if provided
    if (contactPersonEmail && !isValidEmail(contactPersonEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid contact person email format'
      });
    }

    // Validate payment wallet address if provided
    if (paymentWalletAddress && !isValidSolanaAddress(paymentWalletAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Solana payment wallet address'
      });
    }

    // Validate website URL format if provided
    if (websiteUrl && !websiteUrl.match(/^https?:\/\/.+\..+/i)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid website URL format'
      });
    }

    // Validate established year if provided
    if (establishedYear) {
      try {
        validateNumber(establishedYear, 1800, new Date().getFullYear());
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid established year'
        });
      }
    }

    if (!termsAccepted) {
      return res.status(400).json({
        success: false,
        error: 'You must accept the terms and conditions'
      });
    }

    // Sanitize text inputs
    const sanitizedData = {
      companyName: sanitizeString(companyName).slice(0, 200),
      legalName: legalName ? sanitizeString(legalName).slice(0, 200) : null,
      registrationNumber: registrationNumber ? sanitizeString(registrationNumber).slice(0, 100) : null,
      taxId: taxId ? sanitizeString(taxId).slice(0, 100) : null,
      contactEmail: contactEmail.toLowerCase().trim(),
      contactPhone: contactPhone ? sanitizeString(contactPhone).slice(0, 50) : null,
      websiteUrl: websiteUrl ? sanitizeString(websiteUrl).slice(0, 200) : null,
      contactPersonName: sanitizeString(contactPersonName).slice(0, 200),
      contactPersonTitle: contactPersonTitle ? sanitizeString(contactPersonTitle).slice(0, 100) : null,
      contactPersonEmail: contactPersonEmail ? contactPersonEmail.toLowerCase().trim() : null,
      businessType: businessType ? sanitizeString(businessType).slice(0, 100) : null,
      industrySector: industrySector ? sanitizeString(industrySector).slice(0, 100) : null,
      companySize: companySize ? sanitizeString(companySize).slice(0, 50) : null,
      establishedYear: establishedYear ? parseInt(establishedYear) : null,
      addressLine1: addressLine1 ? sanitizeString(addressLine1).slice(0, 200) : null,
      addressLine2: addressLine2 ? sanitizeString(addressLine2).slice(0, 200) : null,
      city: city ? sanitizeString(city).slice(0, 100) : null,
      stateProvince: stateProvince ? sanitizeString(stateProvince).slice(0, 100) : null,
      postalCode: postalCode ? sanitizeString(postalCode).slice(0, 20) : null,
      country: country ? sanitizeString(country).slice(0, 100) : null,
      paymentWalletAddress: paymentWalletAddress || null,
      partnershipType: partnershipType ? sanitizeString(partnershipType).slice(0, 100) : null,
      productsServices: productsServices ? sanitizeString(productsServices).slice(0, 1000) : null,
      integrationInterest: Array.isArray(integrationInterest) ? integrationInterest.map(i => sanitizeString(i)).slice(0, 10) : [],
      expectedVolume: expectedVolume ? sanitizeString(expectedVolume).slice(0, 100) : null,
      termsAccepted: Boolean(termsAccepted),
      termsAcceptedAt: new Date(),
      stackUserId: stackUserId || null
    };

    // Check if company or email already exists
    const existingVendor = await prisma.vendor.findFirst({
      where: {
        OR: [
          { companyName: sanitizedData.companyName },
          { contactEmail: sanitizedData.contactEmail }
        ]
      }
    });

    if (existingVendor) {
      return res.status(409).json({
        success: false,
        error: existingVendor.companyName === sanitizedData.companyName
          ? 'Company name already registered'
          : 'Contact email already in use'
      });
    }

    // Create new vendor with validated and sanitized data
    const vendor = await prisma.vendor.create({
      data: {
        ...sanitizedData,
        status: 'pending'
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: vendor.id,
        companyName: vendor.companyName,
        contactEmail: vendor.contactEmail,
        status: vendor.status,
        createdAt: vendor.createdAt
      },
      message: 'Vendor registration submitted successfully. Our team will review your application and contact you soon.'
    });

  } catch (error) {
    console.error('Vendor registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register vendor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Get vendor profile
 * GET /api/vendor/profile/:id
 */
async function getVendor(req, res) {
  try {
    const { id } = req.params;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        offerings: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' }
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      });
    }

    res.json({
      success: true,
      data: vendor
    });

  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve vendor'
    });
  }
}

/**
 * Update vendor profile
 * PUT /api/vendor/profile/:id
 */
async function updateVendor(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be directly updated
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.status;
    delete updateData.approvedBy;
    delete updateData.approvedAt;
    delete updateData.totalTransactions;
    delete updateData.totalVolume;
    delete updateData.rating;

    const vendor = await prisma.vendor.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      data: vendor,
      message: 'Vendor profile updated successfully'
    });

  } catch (error) {
    console.error('Update vendor error:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update vendor profile'
    });
  }
}

/**
 * List vendors with pagination
 * GET /api/vendor/list
 */
async function listVendors(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      status = 'active',
      businessType,
      partnershipType,
      search
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      status
    };

    if (businessType) {
      where.businessType = businessType;
    }

    if (partnershipType) {
      where.partnershipType = partnershipType;
    }

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { productsServices: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          companyName: true,
          businessType: true,
          partnershipType: true,
          websiteUrl: true,
          productsServices: true,
          rating: true,
          totalTransactions: true,
          kybVerified: true,
          createdAt: true
        }
      }),
      prisma.vendor.count({ where })
    ]);

    res.json({
      success: true,
      data: vendors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('List vendors error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve vendors'
    });
  }
}

/**
 * Add vendor offering
 * POST /api/vendor/:vendorId/offering
 */
async function addVendorOffering(req, res) {
  try {
    const { vendorId } = req.params;
    const {
      offeringType,
      name,
      description,
      category,
      pricingModel,
      basePrice,
      currency,
      documentationUrl,
      demoUrl,
      purchaseUrl
    } = req.body;

    if (!offeringType || !name) {
      return res.status(400).json({
        success: false,
        error: 'Offering type and name are required'
      });
    }

    const offering = await prisma.vendorOffering.create({
      data: {
        vendorId,
        offeringType,
        name,
        description,
        category,
        pricingModel,
        basePrice,
        currency: currency || 'USD',
        documentationUrl,
        demoUrl,
        purchaseUrl,
        isActive: true
      }
    });

    res.status(201).json({
      success: true,
      data: offering,
      message: 'Offering added successfully'
    });

  } catch (error) {
    console.error('Add vendor offering error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add offering'
    });
  }
}

module.exports = {
  registerVendor,
  getVendor,
  updateVendor,
  listVendors,
  addVendorOffering
};
