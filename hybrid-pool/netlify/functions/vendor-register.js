/**
 * Netlify Function for Vendor Registration
 */

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const data = JSON.parse(event.body);

        // Validate required fields
        const { company_name, contact_email, contact_person_name, business_type } = data;
        if (!company_name || !contact_email || !contact_person_name) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Company name, contact email, and contact person name are required'
                })
            };
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contact_email)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid email format' })
            };
        }

        // Insert vendor
        const query = `
            INSERT INTO vendors (
                company_name,
                legal_name,
                registration_number,
                tax_id,
                contact_email,
                contact_phone,
                website_url,
                contact_person_name,
                contact_person_title,
                contact_person_email,
                business_type,
                industry_sector,
                company_size,
                established_year,
                address_line1,
                address_line2,
                city,
                state_province,
                postal_code,
                country,
                payment_wallet_address,
                partnership_type,
                products_services,
                integration_interest,
                expected_volume,
                terms_accepted,
                terms_accepted_at,
                metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
            RETURNING id, company_name, contact_email, created_at, status
        `;

        const values = [
            data.company_name,
            data.legal_name || null,
            data.registration_number || null,
            data.tax_id || null,
            data.contact_email,
            data.contact_phone || null,
            data.website_url || null,
            data.contact_person_name,
            data.contact_person_title || null,
            data.contact_person_email || data.contact_email,
            data.business_type || 'other',
            data.industry_sector || null,
            data.company_size || null,
            data.established_year || null,
            data.address_line1 || null,
            data.address_line2 || null,
            data.city || null,
            data.state_province || null,
            data.postal_code || null,
            data.country || null,
            data.payment_wallet_address || null,
            data.partnership_type || null,
            data.products_services || null,
            data.integration_interest || [],
            data.expected_volume || null,
            data.terms_accepted || false,
            data.terms_accepted ? new Date() : null,
            data.metadata || {}
        ];

        const result = await pool.query(query, values);
        const vendor = result.rows[0];

        // TODO: Send notification email to admin
        // TODO: Send confirmation email to vendor

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Vendor registration submitted successfully! Our team will review your application and contact you within 2-3 business days.',
                vendor: {
                    id: vendor.id,
                    company_name: vendor.company_name,
                    contact_email: vendor.contact_email,
                    created_at: vendor.created_at,
                    status: vendor.status
                }
            })
        };

    } catch (error) {
        console.error('Vendor registration error:', error);

        // Handle duplicate company/email
        if (error.code === '23505') { // PostgreSQL unique violation
            return {
                statusCode: 409,
                headers,
                body: JSON.stringify({
                    error: 'Company name or email already registered'
                })
            };
        }

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};
