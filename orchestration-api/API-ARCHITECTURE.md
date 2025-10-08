# HashNHedge Orchestration API Architecture

## Overview
The orchestration API extends beyond basic mining pool metrics to provide comprehensive compute allocation, profitability tracking, and workload management across multiple compute tasks.

## API Endpoints Structure

### 1. Core Platform Stats
**Endpoint:** `/api/v1/platform/stats`

**Response:**
```json
{
  "timestamp": "2025-10-06T14:32:18Z",
  "uptime_seconds": 2847392,
  "total_compute_units": 12470,
  "platform_efficiency": 94.2,
  "status": "operational"
}
```

### 2. Mining Metrics (Extended)
**Endpoint:** `/api/v1/mining/stats`

**Response:**
```json
{
  "overview": {
    "active_miners": 1247,
    "total_hashrate": 8400000000000,
    "total_shares_24h": 45782,
    "hnh_distributed_24h": 12450
  },
  "by_currency": {
    "BTC": {
      "algorithm": "SHA256",
      "hashrate": 5200000000000,
      "miners": 834,
      "difficulty": 68912345678,
      "estimated_revenue_24h": 5823.45,
      "pool_fee": 0.03
    },
    "ETH": {
      "algorithm": "Ethash",
      "hashrate": 2100000000000,
      "miners": 312,
      "difficulty": 15234567890,
      "estimated_revenue_24h": 1892.21,
      "pool_fee": 0.03
    },
    "XMR": {
      "algorithm": "RandomX",
      "hashrate": 1100000000000,
      "miners": 101,
      "difficulty": 345678901,
      "estimated_revenue_24h": 736.66,
      "pool_fee": 0.03
    }
  },
  "profitability_rankings": [
    {"currency": "BTC", "score": 98.5, "trend": "up"},
    {"currency": "ETH", "score": 87.2, "trend": "stable"},
    {"currency": "XMR", "score": 73.8, "trend": "down"}
  ]
}
```

### 3. Orchestration Metrics (NEW)
**Endpoint:** `/api/v1/orchestration/stats`

**Response:**
```json
{
  "current_allocation": {
    "mining": {
      "compute_units": 8542,
      "percentage": 68.5,
      "revenue_24h": 8452.32
    },
    "ai_training": {
      "compute_units": 2270,
      "percentage": 18.2,
      "revenue_24h": 2128.45,
      "active_jobs": 23
    },
    "rendering": {
      "compute_units": 1034,
      "percentage": 8.3,
      "revenue_24h": 892.10,
      "active_jobs": 7
    },
    "video_encoding": {
      "compute_units": 412,
      "percentage": 3.3,
      "revenue_24h": 156.34,
      "active_jobs": 12
    },
    "simulation": {
      "compute_units": 212,
      "percentage": 1.7,
      "revenue_24h": 98.20,
      "active_jobs": 3
    }
  },
  "task_queue": {
    "pending": 147,
    "processing": 45,
    "completed_24h": 892
  },
  "switching_metrics": {
    "total_switches_24h": 234,
    "avg_switch_time_ms": 2300,
    "failed_switches": 3,
    "efficiency_loss": 0.8
  }
}
```

### 4. Profitability Analysis
**Endpoint:** `/api/v1/profitability/realtime`

**Response:**
```json
{
  "timestamp": "2025-10-06T14:32:18Z",
  "total_revenue_24h": 11727.41,
  "total_costs_24h": 1453.22,
  "net_profit_24h": 10274.19,
  "by_task_type": [
    {
      "type": "mining",
      "revenue": 8452.32,
      "cost": 1098.45,
      "profit": 7353.87,
      "roi": 670.1,
      "trend_7d": "up"
    },
    {
      "type": "ai_training",
      "revenue": 2128.45,
      "cost": 234.56,
      "profit": 1893.89,
      "roi": 807.1,
      "trend_7d": "up"
    },
    {
      "type": "rendering",
      "revenue": 892.10,
      "cost": 89.21,
      "profit": 802.89,
      "roi": 900.0,
      "trend_7d": "stable"
    }
  ],
  "optimal_allocation": {
    "mining": 45.2,
    "ai_training": 38.5,
    "rendering": 12.3,
    "other": 4.0
  }
}
```

### 5. Hardware Metrics
**Endpoint:** `/api/v1/hardware/status`

**Response:**
```json
{
  "total_devices": 1247,
  "by_type": {
    "gpu": {
      "count": 834,
      "models": {
        "RTX_4090": 234,
        "RTX_3090": 412,
        "RX_6900XT": 188
      },
      "avg_utilization": 94.2,
      "avg_temperature": 68.5,
      "power_consumption_kw": 892.3
    },
    "cpu": {
      "count": 312,
      "avg_utilization": 76.8,
      "power_consumption_kw": 156.7
    },
    "asic": {
      "count": 101,
      "avg_hashrate": 110000000000,
      "power_consumption_kw": 445.2
    }
  },
  "health": {
    "healthy": 1198,
    "warning": 42,
    "critical": 7,
    "offline": 0
  }
}
```

### 6. Historical Data
**Endpoint:** `/api/v1/analytics/history`

**Query Parameters:**
- `metric`: hashrate, revenue, allocation, etc.
- `period`: 1h, 24h, 7d, 30d
- `granularity`: minute, hour, day

**Response:**
```json
{
  "metric": "revenue",
  "period": "24h",
  "granularity": "hour",
  "data_points": [
    {"timestamp": "2025-10-06T00:00:00Z", "value": 456.32},
    {"timestamp": "2025-10-06T01:00:00Z", "value": 478.91},
    {"timestamp": "2025-10-06T02:00:00Z", "value": 492.15}
  ],
  "summary": {
    "min": 456.32,
    "max": 542.87,
    "avg": 488.64,
    "trend": "up"
  }
}
```

### 7. Miner-Specific Data
**Endpoint:** `/api/v1/miners/{wallet_address}`

**Response:**
```json
{
  "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "active": true,
  "joined_date": "2025-03-15T08:23:11Z",
  "mining_stats": {
    "current_hashrate": 125000000,
    "avg_hashrate_24h": 118234567,
    "shares_submitted": 8934,
    "shares_accepted": 8912,
    "shares_rejected": 22,
    "efficiency": 99.75
  },
  "earnings": {
    "total": 1247.89,
    "pending": 12.34,
    "paid": 1235.55,
    "last_payout": "2025-10-05T12:00:00Z"
  },
  "compute_allocation": {
    "mining": 85.2,
    "ai_training": 14.8,
    "opt_in_other_tasks": true
  },
  "hardware": {
    "devices": 4,
    "primary_gpu": "RTX_4090",
    "avg_temperature": 67.3,
    "power_limit": 350
  }
}
```

## Data Sources

### Mining Data Sources
1. **Stratum Server**: Real-time share submissions, miner connections
2. **Blockchain APIs**: Network difficulty, block rewards, exchange rates
3. **Pool Database**: Historical performance, earnings, payouts

### Orchestration Data Sources
1. **Task Queue System**: Pending jobs, active workloads, completions
2. **Compute Scheduler**: Resource allocation decisions, switching events
3. **Profitability Calculator**: Real-time pricing from marketplaces

### External Integrations
1. **CoinGecko/CoinMarketCap**: Crypto prices
2. **WhatToMine API**: Mining profitability data
3. **Vast.ai/RunPod APIs**: GPU compute marketplace pricing
4. **AWS/Azure Pricing APIs**: Cloud compute benchmarks

## Database Schema (PostgreSQL)

### Tables

**miners**
- wallet_address (PK)
- joined_date
- total_shares
- total_earnings
- last_seen
- status

**mining_sessions**
- session_id (PK)
- wallet_address (FK)
- start_time
- end_time
- hashrate
- shares_submitted
- shares_accepted
- currency

**compute_allocations**
- allocation_id (PK)
- timestamp
- task_type (mining, ai_training, rendering, etc.)
- compute_units
- revenue
- cost
- duration_seconds

**profitability_snapshots**
- snapshot_id (PK)
- timestamp
- task_type
- revenue_rate
- cost_rate
- network_difficulty (for mining)
- market_price

**hardware_telemetry**
- telemetry_id (PK)
- wallet_address (FK)
- timestamp
- device_type
- utilization
- temperature
- power_consumption

**orchestration_events**
- event_id (PK)
- timestamp
- event_type (switch, allocation, failure)
- from_task
- to_task
- reason
- duration_ms
- success

## Implementation Priority

### Phase 1: Core Metrics (Week 1-2)
- [ ] Extend mining stats with per-currency breakdown
- [ ] Add basic orchestration allocation tracking
- [ ] Implement profitability calculations

### Phase 2: Hardware & Health (Week 3-4)
- [ ] Hardware telemetry collection
- [ ] Device health monitoring
- [ ] Alert system for issues

### Phase 3: Historical & Analytics (Week 5-6)
- [ ] Time-series data storage
- [ ] Historical query endpoints
- [ ] Trend analysis

### Phase 4: Advanced Features (Week 7-8)
- [ ] Predictive profitability modeling
- [ ] Automated allocation recommendations
- [ ] Machine learning for optimization
