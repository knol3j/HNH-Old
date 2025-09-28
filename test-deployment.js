#!/usr/bin/env node

// Deployment Health Check Script for HashNHedge
const https = require('https');
const http = require('http');

const PRODUCTION_URLS = {
    phoneproof_pool: 'https://phoneproof-pool.onrender.com',
    netlify_site: 'https://hashnhedge.netlify.app',
    // Add your custom domain here if you have one
    // custom_domain: 'https://yourdomain.com'
};

const ENDPOINTS_TO_TEST = [
    {
        name: 'PhoneProof Pool Health',
        url: `${PRODUCTION_URLS.phoneproof_pool}/health`,
        expectedStatus: 200,
        expectedContent: 'healthy'
    },
    {
        name: 'PhoneProof Pool Stats',
        url: `${PRODUCTION_URLS.phoneproof_pool}/api/stats`,
        expectedStatus: 200,
        expectedContent: 'success'
    },
    {
        name: 'PhoneProof Pool Info',
        url: `${PRODUCTION_URLS.phoneproof_pool}/api/pool-info`,
        expectedStatus: 200,
        expectedContent: 'PhoneProof'
    },
    {
        name: 'Netlify Main Site',
        url: PRODUCTION_URLS.netlify_site,
        expectedStatus: 200,
        expectedContent: 'HashNHedge'
    },
    {
        name: 'PhoneProof Dashboard',
        url: `${PRODUCTION_URLS.netlify_site}/armageddon/pool/phoneproof-dashboard.html`,
        expectedStatus: 200,
        expectedContent: 'PhoneProof Pool'
    },
    {
        name: 'Mobile Downloads',
        url: `${PRODUCTION_URLS.netlify_site}/downloads/mobile.html`,
        expectedStatus: 200,
        expectedContent: 'ARMgeddon Mobile Miner'
    },
    {
        name: 'ARMgeddon Hub',
        url: `${PRODUCTION_URLS.netlify_site}/armageddon/index.html`,
        expectedStatus: 200,
        expectedContent: 'ARMgeddon'
    }
];

console.log('🔍 HashNHedge Deployment Health Check');
console.log('=====================================\n');

async function testEndpoint(endpoint) {
    return new Promise((resolve) => {
        const url = new URL(endpoint.url);
        const protocol = url.protocol === 'https:' ? https : http;

        const req = protocol.get(endpoint.url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'HashNHedge-HealthCheck/1.0'
            }
        }, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                const statusMatch = res.statusCode === endpoint.expectedStatus;
                const contentMatch = data.includes(endpoint.expectedContent);

                resolve({
                    name: endpoint.name,
                    url: endpoint.url,
                    status: res.statusCode,
                    statusMatch,
                    contentMatch,
                    success: statusMatch && contentMatch,
                    responseTime: Date.now() - startTime,
                    error: null
                });
            });
        });

        req.on('error', (error) => {
            resolve({
                name: endpoint.name,
                url: endpoint.url,
                status: null,
                statusMatch: false,
                contentMatch: false,
                success: false,
                responseTime: Date.now() - startTime,
                error: error.message
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                name: endpoint.name,
                url: endpoint.url,
                status: null,
                statusMatch: false,
                contentMatch: false,
                success: false,
                responseTime: Date.now() - startTime,
                error: 'Request timeout'
            });
        });

        const startTime = Date.now();
        req.end();
    });
}

async function runHealthCheck() {
    const results = [];
    let successCount = 0;

    console.log('Testing endpoints...\n');

    for (const endpoint of ENDPOINTS_TO_TEST) {
        process.stdout.write(`Testing ${endpoint.name}... `);

        const result = await testEndpoint(endpoint);
        results.push(result);

        if (result.success) {
            successCount++;
            console.log(`✅ OK (${result.responseTime}ms)`);
        } else {
            console.log(`❌ FAILED`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            } else {
                console.log(`   Status: ${result.status}, Content check: ${result.contentMatch ? 'OK' : 'FAILED'}`);
            }
        }
    }

    console.log('\n=====================================');
    console.log('Health Check Summary');
    console.log('=====================================\n');

    console.log(`✅ Successful: ${successCount}/${ENDPOINTS_TO_TEST.length}`);
    console.log(`❌ Failed: ${ENDPOINTS_TO_TEST.length - successCount}/${ENDPOINTS_TO_TEST.length}`);
    console.log(`📊 Success Rate: ${Math.round((successCount / ENDPOINTS_TO_TEST.length) * 100)}%\n`);

    if (successCount === ENDPOINTS_TO_TEST.length) {
        console.log('🎉 All endpoints are healthy!');
        console.log('Your HashNHedge deployment is ready for production.\n');
    } else {
        console.log('⚠️  Some endpoints failed health checks.');
        console.log('Please check the failed endpoints and retry.\n');
    }

    // Detailed results
    console.log('Detailed Results:');
    console.log('-'.repeat(80));
    results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${result.name}`);
        console.log(`   URL: ${result.url}`);
        if (result.success) {
            console.log(`   Response Time: ${result.responseTime}ms`);
        } else {
            console.log(`   Status: ${result.status || 'N/A'}`);
            console.log(`   Error: ${result.error || 'Content validation failed'}`);
        }
        console.log('');
    });

    // Production URLs
    console.log('Production URLs:');
    console.log('-'.repeat(80));
    console.log(`🏠 Main Site: ${PRODUCTION_URLS.netlify_site}`);
    console.log(`📱 PhoneProof Pool: ${PRODUCTION_URLS.phoneproof_pool}`);
    console.log(`📊 Pool Dashboard: ${PRODUCTION_URLS.netlify_site}/armageddon/pool/phoneproof-dashboard.html`);
    console.log(`📲 Mobile Downloads: ${PRODUCTION_URLS.netlify_site}/downloads/mobile.html`);
    console.log(`🔥 ARMgeddon Hub: ${PRODUCTION_URLS.netlify_site}/armageddon/index.html`);
    console.log('');

    process.exit(successCount === ENDPOINTS_TO_TEST.length ? 0 : 1);
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('HashNHedge Deployment Health Check\n');
    console.log('Usage: node test-deployment.js [options]\n');
    console.log('Options:');
    console.log('  --help, -h    Show this help message');
    console.log('  --verbose, -v Show verbose output');
    console.log('');
    console.log('This script tests all critical endpoints to verify deployment health.');
    process.exit(0);
}

// Run the health check
runHealthCheck().catch(error => {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
});