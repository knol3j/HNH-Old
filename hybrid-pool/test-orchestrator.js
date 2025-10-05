/**
 * Test the orchestrator logic without Stratum protocol
 */

const JobOrchestrator = require('./orchestrator');

console.log('🧪 Testing JobOrchestrator...\n');

const orchestrator = new JobOrchestrator({
    aiJobCheckInterval: 2000,
    maxJobSwitchPerHour: 20
});

// Listen to events
orchestrator.on('worker:registered', workerId => {
    console.log(`✅ Event: Worker registered - ${workerId}`);
});

orchestrator.on('job:assigned', ({ workerId, job, jobType }) => {
    console.log(`✅ Event: Job assigned - ${jobType} job ${job.id} → ${workerId}`);
});

orchestrator.on('job:completed', ({ workerId, job, type, duration }) => {
    console.log(`✅ Event: Job completed - ${type} job ${job.id} by ${workerId} (${duration}ms)`);
});

// Test scenario
console.log('📋 Test Scenario: 2 workers, AI jobs appear, workers switch from mining to AI\n');

// Step 1: Register workers
console.log('STEP 1: Registering 2 workers...');
orchestrator.registerWorker('worker-1', {
    gpu: 'RTX 4060',
    hashrate: 25,
    vram: 8,
    capabilities: ['cuda', 'tensor']
});

orchestrator.registerWorker('worker-2', {
    gpu: 'RTX 3070',
    hashrate: 60,
    vram: 8,
    capabilities: ['cuda']
});

console.log('');

// Step 2: Add mining jobs (fallback)
setTimeout(() => {
    console.log('STEP 2: Adding mining jobs (fallback)...');
    orchestrator.addMiningJob({
        algorithm: 'ethash',
        pool: 'ethermine'
    });
    console.log('');
}, 1000);

// Step 3: Add AI job (should pull worker from mining)
setTimeout(() => {
    console.log('STEP 3: Adding high-priority AI job...');
    orchestrator.addAIJob({
        task: 'inference',
        model: 'llama-3-8b',
        requirements: {
            minVRAM: 6,
            capabilities: ['cuda']
        },
        reward: 0.50,
        priority: 9
    });
    console.log('');
}, 3000);

// Step 4: Add another AI job
setTimeout(() => {
    console.log('STEP 4: Adding another AI job...');
    orchestrator.addAIJob({
        task: 'training',
        model: 'stable-diffusion',
        requirements: {
            minVRAM: 8,
            capabilities: ['tensor']
        },
        reward: 1.20,
        priority: 7
    });
    console.log('');
}, 5000);

// Step 5: Complete jobs and show stats
setTimeout(() => {
    console.log('STEP 5: Simulating job completions...');

    orchestrator.completeJob('worker-1', {
        revenue: 0.50
    });

    orchestrator.completeJob('worker-2', {
        revenue: 1.20
    });

    console.log('');
}, 7000);

// Step 6: Show final stats
setTimeout(() => {
    console.log('STEP 6: Final statistics...');
    const stats = orchestrator.getStats();
    console.log(JSON.stringify(stats, null, 2));
    console.log('');
    console.log('✅ Test complete!');
    process.exit(0);
}, 9000);
