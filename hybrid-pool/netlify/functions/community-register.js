/**
 * Netlify Function for Community Member Registration
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
        const { email, username, full_name } = data;
        if (!email || !username) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email and username are required' })
            };
        }

        // Insert community member
        const query = `
            INSERT INTO community_members (
                email,
                username,
                full_name,
                wallet_address,
                discord_username,
                telegram_username,
                twitter_username,
                github_username,
                bio,
                country,
                interests,
                skills,
                contribution_areas,
                metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id, email, username, created_at, status
        `;

        const values = [
            data.email,
            data.username,
            data.full_name || null,
            data.wallet_address || null,
            data.discord_username || null,
            data.telegram_username || null,
            data.twitter_username || null,
            data.github_username || null,
            data.bio || null,
            data.country || null,
            data.interests || [],
            data.skills || [],
            data.contribution_areas || [],
            data.metadata || {}
        ];

        const result = await pool.query(query, values);
        const member = result.rows[0];

        // TODO: Send verification email via SendGrid

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Registration successful! Please check your email to verify your account.',
                member: {
                    id: member.id,
                    email: member.email,
                    username: member.username,
                    created_at: member.created_at,
                    status: member.status
                }
            })
        };

    } catch (error) {
        console.error('Community registration error:', error);

        // Handle duplicate email/username
        if (error.code === '23505') { // PostgreSQL unique violation
            return {
                statusCode: 409,
                headers,
                body: JSON.stringify({
                    error: 'Email or username already registered'
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
