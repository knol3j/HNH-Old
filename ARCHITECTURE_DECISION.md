# HashNHedge Pool Architecture Decision

**Date:** October 4, 2025
**Decision:** Hybrid approach - Custom MVP → Fork for production

---

## Research Summary

### Option 1: Fork Existing Pool ✅
**Winner: Foundation v2 Server**
- **GitHub:** https://github.com/blinkhash/foundation-v2-server
- **Stars:** 17 | **License:** GPL-3.0 | **Language:** Node.js
- **Status:** Actively maintained (2024+)
- **Pros:** Battle-tested, modular, multi-coin, production-ready
- **Cons:** GPL license (must open-source), 3-4 week integration

**Runners-up:**
- Node-Stratum-Pool (430⭐) - Unmaintained, dated
- Open-Ethereum-Pool (1.4k⭐) - Archived, Go language

### Option 2: Custom Lightweight Pool ✅
**Built:** `hybrid-pool/` directory
- **Files:** orchestrator.js, stratum-server.js, index.js
- **Features:** AI job priority, mining fallback, Stratum protocol
- **Pros:** Full control, MIT license, built-in AI routing, 1-2 week development
- **Cons:** Needs production hardening, limited multi-coin support

---

## Architecture Comparison

| Feature | Foundation v2 (Fork) | Custom (Built) |
|---------|---------------------|----------------|
| **Dev Time** | 3-4 weeks | 1-2 weeks ✅ |
| **Production Ready** | ✅ Yes | ⚠️ Needs testing |
| **AI Job Routing** | Must add | ✅ Built-in |
| **Multi-coin** | ✅ Yes | ⚠️ Basic |
| **License** | GPL-3.0 | MIT ✅ |
| **Code Ownership** | ⚠️ Fork | ✅ Full |
| **Modularity** | 9/10 | 10/10 ✅ |
| **Learning Curve** | Medium | Low ✅ |

---

## Final Decision: Phased Approach

### Phase 1: Custom MVP (NOW - Week 1-2)
**Use custom `hybrid-pool/` for:**
- ✅ Rapid prototyping
- ✅ Testing with your RTX 4060
- ✅ Validating AI job routing logic
- ✅ Recruiting first 10-50 miners
- ✅ Proving business model

**Timeline:** This weekend → 2 weeks

### Phase 2: Foundation v2 Fork (Month 2)
**Switch to forked Foundation v2 for:**
- Production scale (100+ miners)
- Multi-coin support
- Battle-tested share validation
- Payment processing
- Security hardening

**Timeline:** After MVP proves demand

---

## Why This Approach Wins

### Custom Pool Advantages (MVP)
1. **Speed:** Built in 1 day vs 3-4 weeks integration
2. **Learning:** You understand every line of code
3. **Flexibility:** Modify AI routing without touching legacy code
4. **License:** MIT = full ownership, no GPL restrictions

### Foundation v2 Advantages (Production)
1. **Reliability:** Battle-tested with real mining pools
2. **Features:** Payment processor, multi-coin, VarDiff
3. **Security:** Years of bug fixes and hardening
4. **Community:** Active Discord support

### Why Not Start with Fork?
- ❌ 3-4 weeks to understand codebase
- ❌ Must modify core routing (risky)
- ❌ GPL license complicates IP
- ❌ Overkill for MVP testing

---

## Implementation Plan

### This Weekend (Custom MVP)
```bash
cd hybrid-pool
npm install
npm test              # Test orchestrator logic
npm start             # Start pool on :3333

# Connect your RTX 4060
t-rex -a ethash -o stratum+tcp://localhost:3333 -u YOUR_WALLET.worker1 -p x
```

**Goals:**
- ✅ Prove Stratum protocol works
- ✅ Validate AI job routing
- ✅ Test with your laptop GPU

### Week 2 (Deploy + Recruit)
1. Deploy to DigitalOcean ($10/month)
2. Make pool public: `stratum+tcp://hashnhedge.com:3333`
3. Post in r/gpumining, r/EtherMining
4. Get 10-50 beta miners

**Success Metric:** 50+ miners connected

### Month 2 (Fork Foundation v2)
**Only if MVP succeeds:**
1. Fork Foundation v2 Server
2. Port AI routing logic from custom pool
3. Add as module: `foundation-v2-server/lib/ai-router.js`
4. Migrate miners to production pool
5. Add multi-coin support

**Success Metric:** 100+ miners, $100+/day revenue

---

## Migration Strategy (Custom → Fork)

When you switch to Foundation v2:

### Step 1: Preserve Your Logic
```javascript
// Your custom orchestrator.js becomes:
foundation-v2-server/lib/ai-router.js

// Your routing decisions stay identical
// Just wrap in Foundation's module interface
```

### Step 2: Gradual Migration
1. Run both pools simultaneously
2. New miners → Foundation v2
3. Old miners → Custom (deprecated)
4. Sunset custom after 2 weeks

### Step 3: Keep What Works
- ✅ Job priority logic (AI > Mining)
- ✅ Capability matching
- ✅ Anti-thrashing (switch limits)
- ❌ Basic share validation (use Foundation's)
- ❌ Payment processor (use Foundation's)

---

## Risk Analysis

### Custom Pool Risks
| Risk | Mitigation |
|------|------------|
| Share validation bugs | Start with low difficulty, manual audits |
| Payment errors | Test with small amounts first |
| Security holes | Limit beta to trusted miners |
| Scalability issues | Monitor performance, set max 50 miners |

### Foundation v2 Risks
| Risk | Mitigation |
|------|------------|
| GPL compliance | Keep modifications private OR open-source |
| Integration complexity | Start with clean fork, minimal changes |
| Learning curve | Use Discord support, read docs thoroughly |

---

## Technical Specs: Custom Pool

### Core Components
```
hybrid-pool/
├── orchestrator.js      # AI/Mining job routing brain
├── stratum-server.js    # Stratum protocol handler
├── index.js             # Main entry + API
├── test-orchestrator.js # Unit tests
└── package.json
```

### Key Algorithms

**Job Priority:**
```javascript
if (aiJobAvailable && workerCapable) {
  assignAIJob()  // 30% fee
} else {
  assignMining() // 3% fee
}
```

**Anti-Thrashing:**
```javascript
maxSwitchesPerHour = 12
if (timeSinceLastSwitch < 60min/maxSwitches) {
  skipReassignment()
}
```

**Capability Matching:**
```javascript
if (job.requirements.minVRAM > worker.vram) reject()
if (job.requirements.gpuType not in worker.gpu) reject()
if (job.requirements.capabilities not subset worker.capabilities) reject()
```

### Stratum Protocol Support
- ✅ mining.subscribe
- ✅ mining.authorize
- ✅ mining.notify
- ✅ mining.submit
- ✅ mining.set_difficulty
- ⚠️ ai.job (custom extension)

---

## Economics

### Revenue Model (Custom Pool)
```
AI Job:     $10 revenue → $3 pool fee (30%) → $7 to miner
Mining:     $10 revenue → $0.30 pool fee (3%) → $9.70 to miner

Break-even: ~10 miners mining = $2-3/day pool revenue
Target:     50 miners with 20% AI utilization = $50-100/day
```

### Cost Analysis
| Item | Custom | Foundation v2 |
|------|--------|---------------|
| Development | 1 week (free) | 3-4 weeks (free) |
| Hosting | $10/month VPS | $20/month VPS |
| Maintenance | High (DIY) | Low (community) |
| **Total Month 1** | **$10** | **$20** |

---

## Success Metrics

### Custom MVP (Week 1-2)
- [ ] Pool runs 24/7 without crashes
- [ ] 10+ miners connected
- [ ] AI job routing works (test with simulated jobs)
- [ ] $5-10/day revenue

### Foundation v2 (Month 2)
- [ ] 100+ miners connected
- [ ] Multi-coin support (ETH, RVN, etc.)
- [ ] $100+/day revenue
- [ ] Payment processor handles $1000+/month

---

## Recommendation

### ✅ Start with Custom Pool
**Reasons:**
1. **Speed:** Live this weekend vs month-long integration
2. **Validation:** Prove concept before investing in fork
3. **Learning:** Build deep understanding of mining protocols
4. **Flexibility:** Iterate on AI routing without legacy constraints

### ✅ Upgrade to Foundation v2 Later
**Triggers:**
- 50+ miners using custom pool
- $50+/day revenue sustained
- Need multi-coin support
- Security/scale concerns

### ⚠️ Don't Mix Approaches
- Don't try to fork Foundation v2 AND build custom
- Pick one, execute fully, then migrate if needed

---

## Next Actions

**Today:**
1. ✅ Review custom pool code
2. ⏳ Run `cd hybrid-pool && npm test`
3. ⏳ Fix any bugs
4. ⏳ Start pool: `npm start`

**Tonight:**
1. ⏳ Connect RTX 4060 to pool
2. ⏳ Validate shares accepted
3. ⏳ Test AI job simulation

**This Weekend:**
1. ⏳ Deploy to DigitalOcean
2. ⏳ Write miner connection guide
3. ⏳ Post in Reddit/Discord for beta testers

**Next Week:**
1. ⏳ Get 10 external miners
2. ⏳ Monitor performance
3. ⏳ Add real AI job integration

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Oct 4, 2025 | Build custom MVP first | Speed + learning + flexibility |
| Oct 4, 2025 | Selected Foundation v2 as future fork | Active maintenance + Node.js + modular |
| TBD | Migrate to Foundation v2 | After 50+ miners prove demand |

---

**Approved By:** HashNHedge Team
**Status:** ✅ Decided - Proceed with custom MVP

---

## Appendix: Foundation v2 Integration Preview

When you're ready to migrate, here's the modification plan:

### File: `foundation-v2-server/lib/ai-router.js` (NEW)
```javascript
// Port your orchestrator.js logic here
const JobRouter = {
  routeJob(worker, aiJobs, miningJobs) {
    // Your existing logic
    if (aiJob && capable) return aiJob;
    return miningJob;
  }
};
```

### File: `foundation-v2-server/server/stratum.js` (MODIFY)
```javascript
// Before broadcasting job:
const job = JobRouter.routeJob(worker, aiQueue, miningQueue);
this.broadcastJob(worker, job);
```

**Estimated Integration:** 1-2 weeks after understanding Foundation v2 codebase

---

**Next Step:** Test custom pool → `cd hybrid-pool && npm test` 🚀
