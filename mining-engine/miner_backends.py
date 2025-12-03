#!/usr/bin/env python3
"""
FOSS Mining Backend Wrappers
Supports multiple open-source miners: ethminer, xmrig, t-rex, etc.
"""

import subprocess
import threading
import json
import os
import time
import requests
import logging
import re
from typing import Optional, Dict, List
from abc import ABC, abstractmethod
from collections import deque

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import CREATE_NO_WINDOW for Windows
if os.name == 'nt':
    import subprocess
    CREATE_NO_WINDOW = subprocess.CREATE_NO_WINDOW
else:
    CREATE_NO_WINDOW = 0


class ValidationError(Exception):
    """Raised when input validation fails"""
    pass


class InputValidator:
    """Validates user inputs for security"""

    # Ethereum address format: 0x followed by 40 hex characters
    ETH_ADDRESS_PATTERN = re.compile(r'^0x[a-fA-F0-9]{40}$')

    # Pool URL format: hostname:port or ip:port
    POOL_URL_PATTERN = re.compile(
        r'^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}:\d+$|'
        r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$|'
        r'^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?:\d+$'
    )

    # Worker name: alphanumeric, dashes, underscores
    WORKER_NAME_PATTERN = re.compile(r'^[a-zA-Z0-9_\-]{1,64}$')

    @staticmethod
    def validate_ethereum_address(address: str) -> bool:
        """Validate Ethereum address format"""
        if not address:
            raise ValidationError("Wallet address cannot be empty")

        if not InputValidator.ETH_ADDRESS_PATTERN.match(address):
            raise ValidationError(
                f"Invalid Ethereum address format: {address}. "
                "Expected format: 0x followed by 40 hex characters"
            )
        return True

    @staticmethod
    def validate_pool_url(pool_url: str) -> bool:
        """Validate pool URL format"""
        if not pool_url:
            raise ValidationError("Pool URL cannot be empty")

        if not InputValidator.POOL_URL_PATTERN.match(pool_url):
            raise ValidationError(
                f"Invalid pool URL format: {pool_url}. "
                "Expected format: hostname:port or ip:port"
            )

        # Extract and validate port range
        try:
            port = int(pool_url.split(':')[-1])
            if not (1 <= port <= 65535):
                raise ValidationError(f"Port number must be between 1 and 65535, got {port}")
        except (ValueError, IndexError) as e:
            raise ValidationError(f"Failed to parse port from pool URL: {pool_url}") from e

        return True

    @staticmethod
    def validate_worker_name(worker: str) -> bool:
        """Validate worker name format"""
        if not worker:
            raise ValidationError("Worker name cannot be empty")

        if not InputValidator.WORKER_NAME_PATTERN.match(worker):
            raise ValidationError(
                f"Invalid worker name: {worker}. "
                "Only alphanumeric characters, dashes, and underscores allowed (max 64 chars)"
            )
        return True


class MinerBackend(ABC):
    """Abstract base class for miner backends"""

    def __init__(self, pool_url: str, wallet: str, worker: str):
        # Validate inputs
        InputValidator.validate_pool_url(pool_url)
        InputValidator.validate_ethereum_address(wallet)
        InputValidator.validate_worker_name(worker)

        self.pool_url = pool_url
        self.wallet = wallet
        self.worker = worker
        self.process: Optional[subprocess.Popen] = None
        self.running = False
        self.stats_lock = threading.Lock()
        self.stats = {
            'hashrate': 0.0,
            'accepted_shares': 0,
            'rejected_shares': 0,
            'uptime': 0
        }

    @abstractmethod
    def build_command(self) -> List[str]:
        """Build the command line for the miner"""
        pass

    @abstractmethod
    def get_api_stats(self) -> Dict:
        """Fetch stats from miner's API"""
        pass

    def start(self) -> bool:
        """Start the mining process"""
        if self.running:
            logger.warning("Miner is already running")
            return False

        cmd = self.build_command()
        try:
            logger.info(f"Starting miner with command: {' '.join(cmd[:3])}...")
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=CREATE_NO_WINDOW
            )
            self.running = True
            logger.info("Miner started successfully")
            return True
        except FileNotFoundError as e:
            logger.error(f"Miner executable not found: {e}")
            return False
        except PermissionError as e:
            logger.error(f"Permission denied when starting miner: {e}")
            return False
        except OSError as e:
            logger.error(f"OS error when starting miner: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error starting miner: {e}", exc_info=True)
            return False

    def stop(self) -> bool:
        """Stop the mining process"""
        if not self.running or not self.process:
            logger.warning("No miner process to stop")
            return False

        try:
            logger.info("Terminating miner process...")
            self.process.terminate()

            try:
                self.process.wait(timeout=10)
                logger.info("Miner terminated gracefully")
            except subprocess.TimeoutExpired:
                logger.warning("Miner did not terminate gracefully, forcing kill...")
                self.process.kill()
                try:
                    self.process.wait(timeout=5)
                    logger.info("Miner killed successfully")
                except subprocess.TimeoutExpired:
                    logger.error("Failed to kill miner process")
                    return False

            self.running = False
            return True
        except ProcessLookupError:
            logger.warning("Process already terminated")
            self.running = False
            return True
        except PermissionError as e:
            logger.error(f"Permission denied when stopping miner: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error stopping miner: {e}", exc_info=True)
            return False

    def update_stats(self):
        """Update statistics from miner API"""
        if self.running:
            try:
                new_stats = self.get_api_stats()
                with self.stats_lock:
                    self.stats = new_stats
                logger.debug(f"Stats updated: {new_stats}")
            except requests.RequestException as e:
                logger.warning(f"Failed to fetch stats from miner API: {e}")
            except (ValueError, KeyError, TypeError) as e:
                logger.warning(f"Failed to parse stats from miner API: {e}")
            except Exception as e:
                logger.error(f"Unexpected error updating stats: {e}", exc_info=True)


class EthminerBackend(MinerBackend):
    """Ethminer (FOSS) - Ethash/Etchash mining"""

    def __init__(self, pool_url: str, wallet: str, worker: str, algorithm: str = "ethash"):
        super().__init__(pool_url, wallet, worker)
        self.algorithm = algorithm
        self.api_port = 3333
        self.executable = self._find_executable()

    def _find_executable(self) -> str:
        """Find ethminer executable"""
        if os.name == 'nt':
            paths = [
                'ethminer.exe',
                './miners/ethminer/ethminer.exe',
                'C:/Program Files/ethminer/ethminer.exe'
            ]
        else:
            paths = [
                'ethminer',
                './miners/ethminer/ethminer',
                '/usr/local/bin/ethminer'
            ]

        for path in paths:
            if os.path.exists(path):
                logger.info(f"Found ethminer at: {path}")
                return path

        logger.info("Using ethminer from PATH")
        return 'ethminer'  # Hope it's in PATH

    def build_command(self) -> List[str]:
        """Build ethminer command"""
        return [
            self.executable,
            '-P', f'stratum+tcp://{self.wallet}.{self.worker}@{self.pool_url}',
            '--HWMON', '1',  # Enable hardware monitoring
            '--api-port', str(self.api_port),
            '-G'  # Use OpenCL (or -U for CUDA)
        ]

    def get_api_stats(self) -> Dict:
        """Fetch stats from ethminer API"""
        try:
            response = requests.get(f'http://127.0.0.1:{self.api_port}/api/v1/status', timeout=2)
            response.raise_for_status()
            data = response.json()
            return {
                'hashrate': sum([gpu.get('hashrate', 0) for gpu in data.get('gpus', [])]) / 1000000,  # Convert to MH/s
                'accepted_shares': data.get('shares', {}).get('accepted', 0),
                'rejected_shares': data.get('shares', {}).get('rejected', 0),
                'uptime': data.get('uptime', 0)
            }
        except (requests.RequestException, ValueError, KeyError, TypeError):
            with self.stats_lock:
                return self.stats.copy()


class XMRigBackend(MinerBackend):
    """XMRig (FOSS) - RandomX, KawPow, and other algorithms"""

    def __init__(self, pool_url: str, wallet: str, worker: str, algorithm: str = "randomx"):
        super().__init__(pool_url, wallet, worker)
        self.algorithm = algorithm
        self.api_port = 8080
        self.executable = self._find_executable()

    def _find_executable(self) -> str:
        """Find xmrig executable"""
        if os.name == 'nt':
            paths = [
                'xmrig.exe',
                './miners/xmrig/xmrig.exe',
                'C:/Program Files/xmrig/xmrig.exe'
            ]
        else:
            paths = [
                'xmrig',
                './miners/xmrig/xmrig',
                '/usr/local/bin/xmrig'
            ]

        for path in paths:
            if os.path.exists(path):
                logger.info(f"Found xmrig at: {path}")
                return path

        logger.info("Using xmrig from PATH")
        return 'xmrig'

    def build_command(self) -> List[str]:
        """Build xmrig command"""
        return [
            self.executable,
            '-o', self.pool_url,
            '-u', f'{self.wallet}.{self.worker}',
            '-p', 'x',
            '-a', self.algorithm,
            '--http-port', str(self.api_port),
            '--http-enabled'
        ]

    def get_api_stats(self) -> Dict:
        """Fetch stats from XMRig API"""
        try:
            response = requests.get(f'http://127.0.0.1:{self.api_port}/1/summary', timeout=2)
            response.raise_for_status()
            data = response.json()
            return {
                'hashrate': data.get('hashrate', {}).get('total', [0])[0] / 1000,  # Convert to KH/s
                'accepted_shares': data.get('results', {}).get('shares_good', 0),
                'rejected_shares': data.get('results', {}).get('shares_bad', 0),
                'uptime': data.get('uptime', 0)
            }
        except (requests.RequestException, ValueError, KeyError, TypeError):
            with self.stats_lock:
                return self.stats.copy()


class TRexBackend(MinerBackend):
    """T-Rex (Source-available) - Multi-algo NVIDIA miner"""

    def __init__(self, pool_url: str, wallet: str, worker: str, algorithm: str = "ethash"):
        super().__init__(pool_url, wallet, worker)
        self.algorithm = algorithm
        self.api_port = 4067
        self.executable = self._find_executable()

    def _find_executable(self) -> str:
        """Find t-rex executable"""
        if os.name == 'nt':
            paths = [
                't-rex.exe',
                './hybrid-pool/t-rex-0.26.8-win/t-rex.exe',
                './miners/t-rex/t-rex.exe'
            ]
        else:
            paths = [
                't-rex',
                './miners/t-rex/t-rex'
            ]

        for path in paths:
            if os.path.exists(path):
                logger.info(f"Found t-rex at: {path}")
                return path

        logger.info("Using t-rex from PATH")
        return 't-rex'

    def build_command(self) -> List[str]:
        """Build t-rex command"""
        return [
            self.executable,
            '-a', self.algorithm,
            '-o', f'stratum+tcp://{self.pool_url}',
            '-u', f'{self.wallet}.{self.worker}',
            '-p', 'x',
            '--api-bind-http', f'127.0.0.1:{self.api_port}'
        ]

    def get_api_stats(self) -> Dict:
        """Fetch stats from T-Rex API"""
        try:
            response = requests.get(f'http://127.0.0.1:{self.api_port}/summary', timeout=2)
            response.raise_for_status()
            data = response.json()

            total_hashrate = sum([gpu.get('hashrate', 0) for gpu in data.get('gpus', [])])

            return {
                'hashrate': total_hashrate / 1000000,  # Convert to MH/s
                'accepted_shares': data.get('accepted_count', 0),
                'rejected_shares': data.get('rejected_count', 0),
                'uptime': data.get('uptime', 0)
            }
        except (requests.RequestException, ValueError, KeyError, TypeError):
            with self.stats_lock:
                return self.stats.copy()


class LolMinerBackend(MinerBackend):
    """lolMiner (Source-available) - AMD/NVIDIA multi-algo"""

    def __init__(self, pool_url: str, wallet: str, worker: str, algorithm: str = "ETHASH"):
        super().__init__(pool_url, wallet, worker)
        self.algorithm = algorithm
        self.api_port = 8080
        self.executable = self._find_executable()

    def _find_executable(self) -> str:
        """Find lolMiner executable"""
        if os.name == 'nt':
            paths = [
                'lolMiner.exe',
                './miners/lolminer/lolMiner.exe'
            ]
        else:
            paths = [
                'lolMiner',
                './miners/lolminer/lolMiner'
            ]

        for path in paths:
            if os.path.exists(path):
                logger.info(f"Found lolMiner at: {path}")
                return path

        logger.info("Using lolMiner from PATH")
        return 'lolMiner'

    def build_command(self) -> List[str]:
        """Build lolMiner command"""
        return [
            self.executable,
            '--algo', self.algorithm,
            '--pool', self.pool_url,
            '--user', f'{self.wallet}.{self.worker}',
            '--apiport', str(self.api_port)
        ]

    def get_api_stats(self) -> Dict:
        """Fetch stats from lolMiner API"""
        try:
            response = requests.get(f'http://127.0.0.1:{self.api_port}', timeout=2)
            response.raise_for_status()
            data = response.json()

            gpus = data.get('GPUs', [])
            total_hashrate = sum([gpu.get('Performance', 0) for gpu in gpus])

            return {
                'hashrate': total_hashrate,
                'accepted_shares': data.get('Session', {}).get('Accepted', 0),
                'rejected_shares': data.get('Session', {}).get('Rejected', 0),
                'uptime': data.get('Session', {}).get('Uptime', 0)
            }
        except (requests.RequestException, ValueError, KeyError, TypeError):
            with self.stats_lock:
                return self.stats.copy()


class MinerManager:
    """Manages multiple miner backends and handles switching"""

    def __init__(self):
        self.backends = {
            'ethminer': EthminerBackend,
            'xmrig': XMRigBackend,
            't-rex': TRexBackend,
            'lolminer': LolMinerBackend
        }
        self.current_backend: Optional[MinerBackend] = None
        self.backend_lock = threading.Lock()
        self.stats_thread: Optional[threading.Thread] = None
        self.stats_running = False

    def start_miner(self, backend_name: str, pool_url: str, wallet: str,
                    worker: str, algorithm: str = None) -> bool:
        """Start a specific miner backend"""

        # Validate backend name
        if backend_name not in self.backends:
            logger.error(f"Unknown backend: {backend_name}")
            return False

        # Stop current miner if running
        with self.backend_lock:
            if self.current_backend:
                self.stop_miner()

            # Get backend class
            backend_class = self.backends[backend_name]

            # Create and start backend
            try:
                if algorithm:
                    self.current_backend = backend_class(pool_url, wallet, worker, algorithm)
                else:
                    self.current_backend = backend_class(pool_url, wallet, worker)

                if self.current_backend.start():
                    # Start stats update thread
                    self.stats_running = True
                    self.stats_thread = threading.Thread(target=self._update_stats_loop, daemon=True)
                    self.stats_thread.start()
                    logger.info(f"Started {backend_name} backend successfully")
                    return True
                else:
                    self.current_backend = None
                    return False
            except ValidationError as e:
                logger.error(f"Validation error: {e}")
                self.current_backend = None
                return False
            except Exception as e:
                logger.error(f"Failed to start backend {backend_name}: {e}", exc_info=True)
                self.current_backend = None
                return False

    def stop_miner(self) -> bool:
        """Stop current miner"""
        with self.backend_lock:
            if not self.current_backend:
                logger.info("No miner to stop")
                return False

            # Stop stats thread
            self.stats_running = False
            if self.stats_thread:
                self.stats_thread.join(timeout=2)

            # Stop miner
            result = self.current_backend.stop()
            self.current_backend = None
            return result

    def get_stats(self) -> Dict:
        """Get current miner statistics"""
        with self.backend_lock:
            if self.current_backend:
                with self.current_backend.stats_lock:
                    return self.current_backend.stats.copy()

        return {
            'hashrate': 0.0,
            'accepted_shares': 0,
            'rejected_shares': 0,
            'uptime': 0
        }

    def _update_stats_loop(self):
        """Background thread to update stats"""
        while self.stats_running:
            try:
                with self.backend_lock:
                    current = self.current_backend

                if current:
                    current.update_stats()

                time.sleep(5)  # Update every 5 seconds
            except Exception as e:
                logger.error(f"Stats update error: {e}", exc_info=True)
                time.sleep(5)

    def switch_algorithm(self, algorithm: str) -> bool:
        """Switch to a different algorithm with current backend"""
        with self.backend_lock:
            if not self.current_backend:
                logger.error("No active backend to switch algorithm")
                return False

            # Save current config
            backend_name = self.current_backend.__class__.__name__.replace('Backend', '').lower()
            pool_url = self.current_backend.pool_url
            wallet = self.current_backend.wallet
            worker = self.current_backend.worker

        # Restart with new algorithm (release lock before restart)
        return self.start_miner(backend_name, pool_url, wallet, worker, algorithm)

    def get_available_backends(self) -> List[str]:
        """Get list of available backend names"""
        return list(self.backends.keys())


# Example usage
if __name__ == "__main__":
    # Configure logging for example
    logging.basicConfig(level=logging.DEBUG)

    manager = MinerManager()

    # Start ethminer with placeholder address (for testing only)
    success = manager.start_miner(
        backend_name='ethminer',
        pool_url='pool.example.com:3333',
        wallet='0x0000000000000000000000000000000000000000',
        worker='test-rig',
        algorithm='ethash'
    )

    if success:
        logger.info("Miner started successfully!")

        # Monitor for 30 seconds
        for i in range(6):
            time.sleep(5)
            stats = manager.get_stats()
            logger.info(f"Hashrate: {stats['hashrate']:.2f} MH/s, "
                       f"Shares: {stats['accepted_shares']}/{stats['rejected_shares']}")

        # Stop miner
        manager.stop_miner()
        logger.info("Miner stopped")
