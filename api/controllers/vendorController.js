const prisma = require('../../lib/prisma');

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

    if (!termsAccepted) {
      return res.status(400).json({
        success: false,
        error: 'You must accept the terms and conditions'
      });
    }

    // Check if company or email already exists
    const existingVendor = await prisma.vendor.findFirst({
      where: {
        OR: [
          { companyName },
          { contactEmail }
        ]
      }
    });

    if (existingVendor) {
      return res.status(409).json({
        success: false,
        error: existingVendor.companyName === companyName
          ? 'Company name already registered'
          : 'Contact email already in use'
      });
    }

    // Create new vendor
    const vendor = await prisma.vendor.create({
      data: {
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
        integrationInterest: integrationInterest || [],
        expectedVolume,
        termsAccepted,
        termsAcceptedAt: new Date(),
        stackUserId,
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
