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
from typing import Optional, Dict, List
from abc import ABC, abstractmethod


class MinerBackend(ABC):
    """Abstract base class for miner backends"""

    def __init__(self, pool_url: str, wallet: str, worker: str):
        self.pool_url = pool_url
        self.wallet = wallet
        self.worker = worker
        self.process: Optional[subprocess.Popen] = None
        self.running = False
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
            return False

        cmd = self.build_command()
        try:
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            )
            self.running = True
            return True
        except Exception as e:
            print(f"Failed to start miner: {e}")
            return False

    def stop(self) -> bool:
        """Stop the mining process"""
        if not self.running or not self.process:
            return False

        try:
            self.process.terminate()
            self.process.wait(timeout=10)
            self.running = False
            return True
        except Exception as e:
            print(f"Failed to stop miner: {e}")
            return False

    def update_stats(self):
        """Update statistics from miner API"""
        if self.running:
            try:
                self.stats = self.get_api_stats()
            except Exception as e:
                print(f"Failed to update stats: {e}")


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
                return path

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
            data = response.json()
            return {
                'hashrate': sum([gpu.get('hashrate', 0) for gpu in data.get('gpus', [])]) / 1000000,  # Convert to MH/s
                'accepted_shares': data.get('shares', {}).get('accepted', 0),
                'rejected_shares': data.get('shares', {}).get('rejected', 0),
                'uptime': data.get('uptime', 0)
            }
        except:
            return self.stats


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
                return path

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
            data = response.json()
            return {
                'hashrate': data.get('hashrate', {}).get('total', [0])[0] / 1000,  # Convert to KH/s
                'accepted_shares': data.get('results', {}).get('shares_good', 0),
                'rejected_shares': data.get('results', {}).get('shares_bad', 0),
                'uptime': data.get('uptime', 0)
            }
        except:
            return self.stats


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
                return path

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
            data = response.json()

            total_hashrate = sum([gpu.get('hashrate', 0) for gpu in data.get('gpus', [])])

            return {
                'hashrate': total_hashrate / 1000000,  # Convert to MH/s
                'accepted_shares': data.get('accepted_count', 0),
                'rejected_shares': data.get('rejected_count', 0),
                'uptime': data.get('uptime', 0)
            }
        except:
            return self.stats


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
                return path

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
            data = response.json()

            gpus = data.get('GPUs', [])
            total_hashrate = sum([gpu.get('Performance', 0) for gpu in gpus])

            return {
                'hashrate': total_hashrate,
                'accepted_shares': data.get('Session', {}).get('Accepted', 0),
                'rejected_shares': data.get('Session', {}).get('Rejected', 0),
                'uptime': data.get('Session', {}).get('Uptime', 0)
            }
        except:
            return self.stats


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
        self.stats_thread: Optional[threading.Thread] = None
        self.stats_running = False

    def start_miner(self, backend_name: str, pool_url: str, wallet: str,
                    worker: str, algorithm: str = None) -> bool:
        """Start a specific miner backend"""

        # Stop current miner if running
        if self.current_backend:
            self.stop_miner()

        # Get backend class
        backend_class = self.backends.get(backend_name)
        if not backend_class:
            print(f"Unknown backend: {backend_name}")
            return False

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
                return True
            else:
                return False
        except Exception as e:
            print(f"Failed to start backend {backend_name}: {e}")
            return False

    def stop_miner(self) -> bool:
        """Stop current miner"""
        if not self.current_backend:
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
        if self.current_backend:
            return self.current_backend.stats
        return {
            'hashrate': 0.0,
            'accepted_shares': 0,
            'rejected_shares': 0,
            'uptime': 0
        }

    def _update_stats_loop(self):
        """Background thread to update stats"""
        while self.stats_running and self.current_backend:
            try:
                self.current_backend.update_stats()
                time.sleep(5)  # Update every 5 seconds
            except Exception as e:
                print(f"Stats update error: {e}")
                time.sleep(5)

    def switch_algorithm(self, algorithm: str) -> bool:
        """Switch to a different algorithm with current backend"""
        if not self.current_backend:
            return False

        # Save current config
        backend_name = self.current_backend.__class__.__name__.replace('Backend', '').lower()
        pool_url = self.current_backend.pool_url
        wallet = self.current_backend.wallet
        worker = self.current_backend.worker

        # Restart with new algorithm
        return self.start_miner(backend_name, pool_url, wallet, worker, algorithm)

    def get_available_backends(self) -> List[str]:
        """Get list of available backend names"""
        return list(self.backends.keys())


# Example usage
if __name__ == "__main__":
    manager = MinerManager()

    # Start ethminer
    success = manager.start_miner(
        backend_name='ethminer',
        pool_url='pool.hashnhedge.com:3333',
        wallet='0x0924EF9ecBcC1287047cAFd2EAD3A133313eE6A2',
        worker='test-rig',
        algorithm='ethash'
    )

    if success:
        print("Miner started successfully!")

        # Monitor for 30 seconds
        for i in range(6):
            time.sleep(5)
            stats = manager.get_stats()
            print(f"Hashrate: {stats['hashrate']:.2f} MH/s, "
                  f"Shares: {stats['accepted_shares']}/{stats['rejected_shares']}")

        # Stop miner
        manager.stop_miner()
        print("Miner stopped")
