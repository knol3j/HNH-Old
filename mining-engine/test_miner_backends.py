#!/usr/bin/env python3
"""
Unit tests for miner backends and validation
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
import subprocess
import threading
import time
from miner_backends import (
    InputValidator,
    ValidationError,
    MinerBackend,
    EthminerBackend,
    XMRigBackend,
    TRexBackend,
    LolMinerBackend,
    MinerManager
)


class TestInputValidator(unittest.TestCase):
    """Test input validation functionality"""

    def test_valid_ethereum_address(self):
        """Test validation of valid Ethereum addresses"""
        valid_addresses = [
            '0x0000000000000000000000000000000000000000',
            '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
            '0xABCDEF1234567890ABCDEF1234567890ABCDEF12'
        ]
        for address in valid_addresses:
            with self.subTest(address=address):
                self.assertTrue(InputValidator.validate_ethereum_address(address))

    def test_invalid_ethereum_address(self):
        """Test validation rejects invalid Ethereum addresses"""
        invalid_addresses = [
            '',                                              # Empty
            '0x123',                                         # Too short
            '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1ZZ',  # Non-hex characters
            '742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',     # Missing 0x prefix
            '0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',  # Invalid hex
        ]
        for address in invalid_addresses:
            with self.subTest(address=address):
                with self.assertRaises(ValidationError):
                    InputValidator.validate_ethereum_address(address)

    def test_valid_pool_url(self):
        """Test validation of valid pool URLs"""
        valid_urls = [
            'pool.example.com:3333',
            'localhost:3333',
            '192.168.1.1:3333',
            'mining-pool.hashnhedge.com:4000',
            'pool.etc.mine.com:8008'
        ]
        for url in valid_urls:
            with self.subTest(url=url):
                self.assertTrue(InputValidator.validate_pool_url(url))

    def test_invalid_pool_url(self):
        """Test validation rejects invalid pool URLs"""
        invalid_urls = [
            '',                           # Empty
            'pool.example.com',           # Missing port
            'pool.example.com:99999',     # Invalid port
            'pool.example.com:0',         # Port 0
            'http://pool.example.com:3333',  # Has protocol
            'pool:3333:extra',            # Extra colon
        ]
        for url in invalid_urls:
            with self.subTest(url=url):
                with self.assertRaises(ValidationError):
                    InputValidator.validate_pool_url(url)

    def test_valid_worker_name(self):
        """Test validation of valid worker names"""
        valid_names = [
            'worker1',
            'test-rig',
            'my_worker',
            'RIG-123',
            'a1b2c3',
        ]
        for name in valid_names:
            with self.subTest(name=name):
                self.assertTrue(InputValidator.validate_worker_name(name))

    def test_invalid_worker_name(self):
        """Test validation rejects invalid worker names"""
        invalid_names = [
            '',                    # Empty
            'worker with spaces',  # Spaces
            'worker@123',          # Special characters
            'x' * 65,              # Too long (>64 chars)
            'worker.name',         # Dots not allowed
        ]
        for name in invalid_names:
            with self.subTest(name=name):
                with self.assertRaises(ValidationError):
                    InputValidator.validate_worker_name(name)


class TestMinerBackend(unittest.TestCase):
    """Test MinerBackend base class functionality"""

    def setUp(self):
        """Set up test fixtures"""
        self.valid_pool = 'pool.example.com:3333'
        self.valid_wallet = '0x0000000000000000000000000000000000000000'
        self.valid_worker = 'test-worker'

    @patch('miner_backends.EthminerBackend._find_executable')
    def test_backend_initialization_validates_inputs(self, mock_find):
        """Test that backend validates inputs during initialization"""
        mock_find.return_value = 'ethminer'

        # Valid inputs should work
        backend = EthminerBackend(self.valid_pool, self.valid_wallet, self.valid_worker)
        self.assertEqual(backend.pool_url, self.valid_pool)
        self.assertEqual(backend.wallet, self.valid_wallet)
        self.assertEqual(backend.worker, self.valid_worker)

        # Invalid wallet should raise ValidationError
        with self.assertRaises(ValidationError):
            EthminerBackend(self.valid_pool, 'invalid-wallet', self.valid_worker)

        # Invalid pool URL should raise ValidationError
        with self.assertRaises(ValidationError):
            EthminerBackend('invalid-pool', self.valid_wallet, self.valid_worker)

        # Invalid worker name should raise ValidationError
        with self.assertRaises(ValidationError):
            EthminerBackend(self.valid_pool, self.valid_wallet, 'invalid worker!')

    @patch('miner_backends.EthminerBackend._find_executable')
    @patch('subprocess.Popen')
    def test_backend_start_creates_process(self, mock_popen, mock_find):
        """Test that starting backend creates subprocess"""
        mock_find.return_value = 'ethminer'
        mock_process = MagicMock()
        mock_popen.return_value = mock_process

        backend = EthminerBackend(self.valid_pool, self.valid_wallet, self.valid_worker)
        result = backend.start()

        self.assertTrue(result)
        self.assertTrue(backend.running)
        self.assertEqual(backend.process, mock_process)
        mock_popen.assert_called_once()

    @patch('miner_backends.EthminerBackend._find_executable')
    @patch('subprocess.Popen')
    def test_backend_start_handles_file_not_found(self, mock_popen, mock_find):
        """Test that FileNotFoundError is handled gracefully"""
        mock_find.return_value = 'ethminer'
        mock_popen.side_effect = FileNotFoundError("Executable not found")

        backend = EthminerBackend(self.valid_pool, self.valid_wallet, self.valid_worker)
        result = backend.start()

        self.assertFalse(result)
        self.assertFalse(backend.running)

    @patch('miner_backends.EthminerBackend._find_executable')
    @patch('subprocess.Popen')
    def test_backend_stop_terminates_process(self, mock_popen, mock_find):
        """Test that stopping backend terminates subprocess"""
        mock_find.return_value = 'ethminer'
        mock_process = MagicMock()
        mock_popen.return_value = mock_process

        backend = EthminerBackend(self.valid_pool, self.valid_wallet, self.valid_worker)
        backend.start()
        result = backend.stop()

        self.assertTrue(result)
        self.assertFalse(backend.running)
        mock_process.terminate.assert_called_once()
        mock_process.wait.assert_called()

    @patch('miner_backends.EthminerBackend._find_executable')
    @patch('subprocess.Popen')
    def test_backend_stop_handles_timeout(self, mock_popen, mock_find):
        """Test that stop handles timeout and forces kill"""
        mock_find.return_value = 'ethminer'
        mock_process = MagicMock()
        mock_process.wait.side_effect = [subprocess.TimeoutExpired('cmd', 10), None]
        mock_popen.return_value = mock_process

        backend = EthminerBackend(self.valid_pool, self.valid_wallet, self.valid_worker)
        backend.start()
        result = backend.stop()

        self.assertTrue(result)
        mock_process.terminate.assert_called_once()
        mock_process.kill.assert_called_once()

    @patch('miner_backends.EthminerBackend._find_executable')
    def test_backend_stats_use_thread_lock(self, mock_find):
        """Test that stats access is thread-safe"""
        mock_find.return_value = 'ethminer'

        backend = EthminerBackend(self.valid_pool, self.valid_wallet, self.valid_worker)

        # Access stats to ensure lock works
        with backend.stats_lock:
            backend.stats['hashrate'] = 100.0

        self.assertEqual(backend.stats['hashrate'], 100.0)


class TestEthminerBackend(unittest.TestCase):
    """Test Ethminer-specific functionality"""

    @patch('miner_backends.EthminerBackend._find_executable')
    def test_ethminer_build_command(self, mock_find):
        """Test Ethminer command building"""
        mock_find.return_value = '/usr/local/bin/ethminer'

        backend = EthminerBackend(
            'pool.example.com:3333',
            '0x0000000000000000000000000000000000000000',
            'test-rig',
            'ethash'
        )

        cmd = backend.build_command()

        self.assertIn('/usr/local/bin/ethminer', cmd)
        self.assertIn('-P', cmd)
        self.assertIn('-G', cmd)
        # Check stratum URL format
        stratum_url = [arg for arg in cmd if 'stratum+tcp://' in arg][0]
        self.assertIn('0x0000000000000000000000000000000000000000', stratum_url)
        self.assertIn('test-rig', stratum_url)
        self.assertIn('pool.example.com:3333', stratum_url)

    @patch('miner_backends.EthminerBackend._find_executable')
    @patch('requests.get')
    def test_ethminer_get_api_stats(self, mock_get, mock_find):
        """Test Ethminer API stats fetching"""
        mock_find.return_value = 'ethminer'
        mock_response = Mock()
        mock_response.json.return_value = {
            'gpus': [
                {'hashrate': 30000000},  # 30 MH/s in H/s
                {'hashrate': 25000000}   # 25 MH/s in H/s
            ],
            'shares': {'accepted': 100, 'rejected': 2},
            'uptime': 3600
        }
        mock_get.return_value = mock_response

        backend = EthminerBackend('pool.example.com:3333', '0x' + '0' * 40, 'test')
        stats = backend.get_api_stats()

        self.assertAlmostEqual(stats['hashrate'], 55.0, places=1)  # Total 55 MH/s
        self.assertEqual(stats['accepted_shares'], 100)
        self.assertEqual(stats['rejected_shares'], 2)
        self.assertEqual(stats['uptime'], 3600)


class TestMinerManager(unittest.TestCase):
    """Test MinerManager functionality"""

    def setUp(self):
        """Set up test fixtures"""
        self.manager = MinerManager()
        self.valid_pool = 'pool.example.com:3333'
        self.valid_wallet = '0x0000000000000000000000000000000000000000'
        self.valid_worker = 'test-worker'

    def test_manager_lists_available_backends(self):
        """Test that manager lists all available backends"""
        backends = self.manager.get_available_backends()

        self.assertIn('ethminer', backends)
        self.assertIn('xmrig', backends)
        self.assertIn('t-rex', backends)
        self.assertIn('lolminer', backends)

    @patch('miner_backends.EthminerBackend._find_executable')
    @patch('miner_backends.EthminerBackend.start')
    def test_manager_starts_backend(self, mock_start, mock_find):
        """Test that manager can start a backend"""
        mock_find.return_value = 'ethminer'
        mock_start.return_value = True

        result = self.manager.start_miner(
            'ethminer',
            self.valid_pool,
            self.valid_wallet,
            self.valid_worker,
            'ethash'
        )

        self.assertTrue(result)
        self.assertIsNotNone(self.manager.current_backend)
        mock_start.assert_called_once()

    def test_manager_rejects_invalid_backend(self):
        """Test that manager rejects invalid backend names"""
        result = self.manager.start_miner(
            'invalid-backend',
            self.valid_pool,
            self.valid_wallet,
            self.valid_worker
        )

        self.assertFalse(result)
        self.assertIsNone(self.manager.current_backend)

    @patch('miner_backends.EthminerBackend._find_executable')
    @patch('miner_backends.EthminerBackend.start')
    @patch('miner_backends.EthminerBackend.stop')
    def test_manager_stops_backend(self, mock_stop, mock_start, mock_find):
        """Test that manager can stop a backend"""
        mock_find.return_value = 'ethminer'
        mock_start.return_value = True
        mock_stop.return_value = True

        self.manager.start_miner(
            'ethminer',
            self.valid_pool,
            self.valid_wallet,
            self.valid_worker
        )
        result = self.manager.stop_miner()

        self.assertTrue(result)
        self.assertIsNone(self.manager.current_backend)
        mock_stop.assert_called_once()

    @patch('miner_backends.EthminerBackend._find_executable')
    def test_manager_get_stats_with_no_backend(self, mock_find):
        """Test that get_stats returns zero stats when no backend running"""
        stats = self.manager.get_stats()

        self.assertEqual(stats['hashrate'], 0.0)
        self.assertEqual(stats['accepted_shares'], 0)
        self.assertEqual(stats['rejected_shares'], 0)
        self.assertEqual(stats['uptime'], 0)

    @patch('miner_backends.EthminerBackend._find_executable')
    @patch('miner_backends.EthminerBackend.start')
    def test_manager_thread_safety(self, mock_start, mock_find):
        """Test that manager operations are thread-safe"""
        mock_find.return_value = 'ethminer'
        mock_start.return_value = True

        def start_stop():
            self.manager.start_miner('ethminer', self.valid_pool, self.valid_wallet, self.valid_worker)
            time.sleep(0.01)
            self.manager.stop_miner()

        # Run multiple start/stop operations in parallel
        threads = [threading.Thread(target=start_stop) for _ in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # Should complete without errors and end with no backend
        self.assertIsNone(self.manager.current_backend)


class TestCommandBuilding(unittest.TestCase):
    """Test command line building for different miners"""

    @patch('miner_backends.TRexBackend._find_executable')
    def test_trex_command_format(self, mock_find):
        """Test T-Rex command format"""
        mock_find.return_value = 't-rex'

        backend = TRexBackend('pool.example.com:3333', '0x' + '0' * 40, 'worker', 'kawpow')
        cmd = backend.build_command()

        self.assertIn('t-rex', cmd)
        self.assertIn('-a', cmd)
        self.assertIn('kawpow', cmd)
        self.assertIn('-o', cmd)
        self.assertIn('stratum+tcp://pool.example.com:3333', cmd)

    @patch('miner_backends.XMRigBackend._find_executable')
    def test_xmrig_command_format(self, mock_find):
        """Test XMRig command format"""
        mock_find.return_value = 'xmrig'

        backend = XMRigBackend('pool.example.com:3333', '0x' + '0' * 40, 'worker', 'randomx')
        cmd = backend.build_command()

        self.assertIn('xmrig', cmd)
        self.assertIn('-a', cmd)
        self.assertIn('randomx', cmd)
        self.assertIn('-o', cmd)
        self.assertIn('pool.example.com:3333', cmd)

    @patch('miner_backends.LolMinerBackend._find_executable')
    def test_lolminer_command_format(self, mock_find):
        """Test lolMiner command format"""
        mock_find.return_value = 'lolMiner'

        backend = LolMinerBackend('pool.example.com:3333', '0x' + '0' * 40, 'worker', 'ETHASH')
        cmd = backend.build_command()

        self.assertIn('lolMiner', cmd)
        self.assertIn('--algo', cmd)
        self.assertIn('ETHASH', cmd)
        self.assertIn('--pool', cmd)
        self.assertIn('pool.example.com:3333', cmd)


if __name__ == '__main__':
    # Run tests with verbose output
    unittest.main(verbosity=2)
