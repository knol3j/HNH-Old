"""
PhoneProof Mining Algorithm
ARM-optimized proof-of-work algorithm for mobile mining
"""

import hashlib
from typing import Tuple


class PhoneProof:
    """
    PhoneProof hash algorithm optimized for ARM processors.
    Features:
    - ARX (Addition-Rotation-XOR) primitives for ARM NEON optimization
    - Memory-hard with 64KB scratchpad
    - Data-dependent branches (GPU/x86 resistant)
    - Variable rotations for irregularity
    """

    SCRATCH_SIZE = 16384  # 16K words = 64KB
    DEFAULT_ROUNDS = 1000

    def __init__(self, rounds: int = DEFAULT_ROUNDS):
        self.rounds = rounds

    @staticmethod
    def _arx(a: int, b: int, c: int, rot: int) -> Tuple[int, int]:
        """ARX round function (Add-Rotate-XOR)"""
        a = (a + b) % (1 << 32)
        c ^= a
        c = ((c << rot) | (c >> (32 - rot))) % (1 << 32)
        return a, c

    def phoneproof_hash(self, block: bytes, nonce: int, rounds: int = None) -> int:
        """
        Compute PhoneProof hash

        Args:
            block: Block header as bytes
            nonce: Mining nonce
            rounds: Number of iterations (difficulty)

        Returns:
            256-bit hash as integer
        """
        if rounds is None:
            rounds = self.rounds

        # Chaotic initialization
        init_data = block + nonce.to_bytes(8, 'big')
        h = int.from_bytes(hashlib.blake2b(init_data, digest_size=32).digest()[:4], 'big')

        # Initialize state (8 x 32-bit words)
        state = [0] * 8
        state[0] = h
        state[1] = len(init_data) % (1 << 32)

        # LFSR-like expansion for chaos
        for i in range(2, 8):
            state[i] = (state[i-1] ^ (state[i-2] << 5) ^ state[0]) % (1 << 32)

        # Memory-hard scratchpad
        scratch = [0] * self.SCRATCH_SIZE

        # Initialize scratchpad
        for i in range(min(8, self.SCRATCH_SIZE)):
            scratch[i] = state[i]

        # Fill scratchpad pseudorandomly
        for i in range(8, self.SCRATCH_SIZE):
            scratch[i] = (scratch[i-1] ^ (i * 0x9e3779b9)) % (1 << 32)

        # Core mixing loop with memory touches
        for rnd in range(rounds):
            rot_base = 7 + (nonce % 5)

            for i in range(0, 8, 2):
                # Data-dependent branching (GPU killer)
                if state[i] & 1:
                    rot = (rot_base + i) % 32
                    idx = (i * 2048 + (state[(i+1) % 8] % 256)) % self.SCRATCH_SIZE
                    state[i] ^= scratch[idx]
                else:
                    rot = (rot_base + (i+1)) % 32
                    idx = ((i+1) * 2048 + rnd % 256) % self.SCRATCH_SIZE
                    state[(i+1) % 8] ^= scratch[idx]

                # ARX transformation
                state[i], state[(i + 1) % 8] = self._arx(
                    state[i],
                    state[(i + 1) % 8],
                    state[(i + 2) % 8],
                    rot
                )

            # Periodic scratchpad shuffle (bandwidth hit for GPUs)
            if rnd % 10 == 0:
                for j in range(0, self.SCRATCH_SIZE, 16):
                    if scratch[j] % 2:
                        idx_next = (j + 1) % self.SCRATCH_SIZE
                        scratch[j], scratch[idx_next] = scratch[idx_next], scratch[j]

        # Update scratchpad with final state
        for i in range(8):
            scratch[i] = state[i]

        # Fold state to 256-bit hash
        final = 0
        for s in state:
            final = (final * 31 + s) % (1 << 256)

        # Mix in scratchpad sum
        scratch_sum = sum(scratch) % (1 << 32)
        final = (final ^ (scratch_sum << 128)) % (1 << 256)

        return final

    def verify_hash(self, block: bytes, nonce: int, target: int, rounds: int = None) -> bool:
        """Verify if hash meets target difficulty"""
        h = self.phoneproof_hash(block, nonce, rounds)
        return h < target

    def mine_block(self, block: bytes, difficulty_bits: int, max_nonces: int = 1000000) -> Tuple[int, int]:
        """
        Mine a block

        Args:
            block: Block header
            difficulty_bits: Number of leading zero bits required
            max_nonces: Maximum nonces to try

        Returns:
            (nonce, hash) if found, (None, None) if not found
        """
        target = 1 << (256 - difficulty_bits)

        for nonce in range(max_nonces):
            h = self.phoneproof_hash(block, nonce)
            if h < target:
                return nonce, h

        return None, None


def demo_mining():
    """Demo: Mine a test block"""
    import time

    phoneproof = PhoneProof(rounds=1000)
    block = b"ARMgeddon genesis block - mobile mining revolution"
    difficulty = 24  # ~24 leading zero bits

    print("=" * 60)
    print("PhoneProof Mining Demo")
    print("=" * 60)
    print(f"Block: {block.decode()}")
    print(f"Difficulty: {difficulty} bits")
    print(f"Target: < 2^{256 - difficulty}")
    print("-" * 60)

    start = time.time()
    nonce, hash_val = phoneproof.mine_block(block, difficulty, max_nonces=100000)
    elapsed = time.time() - start

    if nonce is not None:
        print(f"✅ Block mined successfully!")
        print(f"Nonce: {nonce}")
        print(f"Hash: {hex(hash_val)}")
        print(f"Time: {elapsed:.2f}s")
        print(f"Hashrate: ~{int(nonce/elapsed)} H/s")

        # Verify
        is_valid = phoneproof.verify_hash(block, nonce, 1 << (256 - difficulty))
        print(f"Verification: {'✅ PASS' if is_valid else '❌ FAIL'}")
    else:
        print("❌ No solution found in limit")

    print("=" * 60)


if __name__ == "__main__":
    demo_mining()