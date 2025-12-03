# HashNHedge Smart Miner v3.0

A multi-backend GPU mining application with a modern GUI, supporting multiple FOSS (Free and Open Source Software) mining engines.

## Features

- **Multi-Backend Support**: T-Rex, ethminer, XMRig, lolMiner
- **Modern GUI**: Built with Tkinter
- **Real-time Monitoring**: Hashrate, shares, GPU stats
- **Input Validation**: Security-focused with comprehensive validation
- **Thread-Safe**: Proper locking and process management
- **Logging**: Comprehensive error tracking and debugging
- **Cross-Platform**: Works on Windows and Linux

## Quick Start

### Linux

```bash
chmod +x hashnhedge-miner.sh
./hashnhedge-miner.sh
```

### Windows

Double-click `hashnhedge-miner.bat` or run:
```batch
hashnhedge-miner.bat
```

## Supported Mining Backends

| Backend | Algorithms | Platform | License |
|---------|-----------|----------|---------|
| **T-Rex** | Ethash, KawPow, Autolykos2, Firopow | NVIDIA | Source-available |
| **ethminer** | Ethash, Etchash | AMD/NVIDIA | GPL-3.0 |
| **XMRig** | RandomX, KawPow | CPU/GPU | GPL-3.0 |
| **lolMiner** | Ethash, Autolykos2, TON | AMD/NVIDIA | Mixed |

## Requirements

- Python 3.8 or later
- GPU (NVIDIA or AMD)
- Python packages: `tkinter`, `requests`, `psutil`

## Installation

### Method 1: Use Launcher Scripts (Recommended)

The launcher scripts automatically handle dependencies.

**Linux:**
```bash
./hashnhedge-miner.sh
```

**Windows:**
```batch
hashnhedge-miner.bat
```

### Method 2: Manual Installation

```bash
# Install dependencies
pip install requests psutil

# Run the miner
python hnh_miner_gui_enhanced.py
```

## Building Executables

See [BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md) for detailed build instructions.

### Windows Executable

```batch
pip install pyinstaller
python build-windows-exe.py
```

Output: `dist/HashNHedgeMiner.exe` (standalone, no Python required)

## Configuration

On first run, configure:

1. **Wallet Address**: Your cryptocurrency wallet address
2. **Pool URL**: Mining pool address (default: pool.hashnhedge.com:3333)
3. **Worker Name**: Identifier for your rig
4. **Backend**: Choose mining software (t-rex, ethminer, etc.)
5. **Algorithm**: Mining algorithm (ethash, kawpow, etc.)

Configuration is saved to `~/.hashnhedge/miner_config.json`

## Security Features

- **Input Validation**: Regex validation for wallet addresses and URLs
- **No Hardcoded Credentials**: Uses environment variables
- **Secure Logging**: Sensitive data not logged
- **Process Isolation**: Miners run in separate processes
- **Thread Safety**: Proper locking mechanisms

## Architecture

```
mining-engine/
├── hnh_miner_gui_enhanced.py    # Main GUI application
├── miner_backends.py             # Backend abstraction layer
├── test_miner_backends.py        # Unit tests
├── hashnhedge-miner.sh          # Linux launcher
├── hashnhedge-miner.bat         # Windows launcher
├── build-windows-exe.py         # Executable build script
├── BUILD_INSTRUCTIONS.md        # Detailed build guide
└── example_configs/             # Example configurations
    └── miningcore_hnh.json      # MiningCore config
```

## Development

### Running Tests

```bash
python -m unittest test_miner_backends.py -v
```

Test coverage includes:
- Input validation (Ethereum addresses, URLs, worker names)
- Backend initialization and lifecycle
- Process management and termination
- Thread safety
- API stats fetching
- Command building for all backends

### Code Quality

- **Type Hints**: Full typing support
- **Logging**: Structured logging throughout
- **Exception Handling**: Specific exception types
- **Documentation**: Comprehensive docstrings
- **Testing**: 20+ unit tests

## Troubleshooting

### "Miner executable not found"

Download the mining software separately:
- T-Rex: https://github.com/trexminer/T-Rex/releases
- ethminer: https://github.com/ethereum-mining/ethminer/releases
- XMRig: https://github.com/xmrig/xmrig/releases
- lolMiner: https://github.com/Lolliedieb/lolMiner-releases/releases

Extract to `miners/` folder or add to system PATH.

### "Invalid wallet address"

Ensure your wallet address:
- Starts with `0x`
- Contains exactly 40 hexadecimal characters
- Example: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1`

### GPU Not Detected

1. Install GPU drivers (NVIDIA/AMD)
2. Install nvidia-smi (NVIDIA) or rocm-smi (AMD)
3. Verify GPU is visible: `nvidia-smi` or `rocm-smi`

## Performance

- **GUI Polling**: 3-second intervals
- **Stats Update**: 5-second intervals
- **Memory**: Efficient deque for history tracking
- **Thread Safety**: Lock-based concurrency control

## License

MIT License - See LICENSE file for details

## Support

- **GitHub Issues**: https://github.com/knol3j/HNH/issues
- **Website**: https://hashnhedge.com
- **Documentation**: See BUILD_INSTRUCTIONS.md

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

## Changelog

### v3.0 (2025-10-25)

- Added comprehensive input validation
- Implemented proper logging framework
- Added thread safety with locks
- Replaced bare exceptions with specific types
- Optimized with deque data structure
- Added 20+ unit tests
- Created launcher scripts for Linux/Windows
- Added PyInstaller build support
- Security fixes for PR review

### v2.0

- Multi-backend support
- Enhanced GUI design
- Real-time GPU monitoring

### v1.0

- Initial release
- Basic mining functionality

---

**Version**: 3.0
**Last Updated**: 2025-10-25
**Author**: HashNHedge Team

🤖 Generated with [Claude Code](https://claude.com/claude-code)
