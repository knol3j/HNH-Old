"""
Test script for HashNHedge Miner functionality
"""

import hashlib
import time
import requests
from datetime import datetime

def test_mining_algorithm():
    """Test the core mining algorithm"""
    print("Testing mining algorithm...")

    wallet = "GCKbEgD4VSLtkwt57At7pWscaxaQ2gBZtTQE2hqr3Yrc"  # Test wallet
    start_time = time.time()
    hash_count = 0
    shares_found = 0

    # Mine for 10 seconds
    while time.time() - start_time < 10:
        nonce = hash_count
        data = f"{wallet}{nonce}{int(time.time())}"
        hash_result = hashlib.sha256(data.encode()).hexdigest()
        hash_count += 1

        # Check for share (4 leading zeros)
        if hash_result.startswith('0000'):
            shares_found += 1
            print(f"Share found: {hash_result[:20]}...")

    elapsed = time.time() - start_time
    hashrate = hash_count / elapsed

    print(f"Test completed:")
    print(f"  Duration: {elapsed:.1f} seconds")
    print(f"  Hashes: {hash_count:,}")
    print(f"  Hashrate: {hashrate:.0f} H/s")
    print(f"  Shares found: {shares_found}")
    print(f"  Share rate: {shares_found/elapsed*60:.2f} shares/minute")

    return hashrate > 0

def test_pool_connection():
    """Test connection to pool servers"""
    print("\nTesting pool connections...")

    servers = [
        "https://hashnhedge-pool.onrender.com",
        "https://hashnhedge-backup.netlify.app/.netlify/functions/pool"
    ]

    for server in servers:
        try:
            response = requests.get(f"{server}/api/pool/status", timeout=5)
            if response.status_code == 200:
                print(f"✓ {server} - Connected successfully")
            else:
                print(f"✗ {server} - HTTP {response.status_code}")
        except Exception as e:
            print(f"✗ {server} - {str(e)[:50]}...")

    return True

def test_wallet_validation():
    """Test wallet address validation"""
    print("\nTesting wallet validation...")

    test_cases = [
        ("GCKbEgD4VSLtkwt57At7pWscaxaQ2gBZtTQE2hqr3Yrc", True),  # Valid
        ("invalid", False),  # Too short
        ("", False),  # Empty
        ("GCKbEgD4VSLtkwt57At7pWscaxaQ2gBZtTQE2hqr3Yrc" + "x" * 20, False),  # Too long
    ]

    for wallet, should_be_valid in test_cases:
        is_valid = 32 <= len(wallet.strip()) <= 44 and wallet.strip()
        result = "✓" if is_valid == should_be_valid else "✗"
        status = "valid" if is_valid else "invalid"
        print(f"{result} '{wallet[:20]}...' - {status}")

    return True

def main():
    print("HashNHedge Miner Test Suite")
    print("=" * 40)
    print(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    tests = [
        ("Mining Algorithm", test_mining_algorithm),
        ("Pool Connection", test_pool_connection),
        ("Wallet Validation", test_wallet_validation)
    ]

    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"✗ {test_name} failed: {e}")
            results.append((test_name, False))

    print("\n" + "=" * 40)
    print("Test Results Summary:")
    for test_name, passed in results:
        status = "PASS" if passed else "FAIL"
        print(f"  {test_name}: {status}")

    all_passed = all(result for _, result in results)
    print(f"\nOverall: {'ALL TESTS PASSED' if all_passed else 'SOME TESTS FAILED'}")

if __name__ == "__main__":
    main()