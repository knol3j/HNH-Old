#!/usr/bin/env python3
"""
HashNHedge Actual Mining Engine
CPU/GPU mining implementation with WebSocket and Stratum pool connection
"""

import hashlib
import json
import time
import threading
import websocket
import socket
from datetime import datetime

class HashNHedgeMiner:
    def __init__(self, pool_url, wallet, worker_name, on_stats_update=None):
        self.pool_url = pool_url
        self.wallet = wallet
        self.worker_name = worker_name
        self.on_stats_update = on_stats_update

        # Connection objects
        self.ws = None
        self.stratum_socket = None
        self.stratum_thread = None
        self.protocol = None  # 'websocket' or 'stratum'

        self.mining = False
        self.current_job = None

        # Stats
        self.hashrate = 0
        self.shares_submitted = 0
        self.shares_accepted = 0
        self.shares_rejected = 0
        self.start_time = None

        # Mining threads
        self.miner_threads = []
        self.num_threads = 4  # CPU mining threads

        # Stratum-specific
        self.stratum_msg_id = 1
        self.stratum_buffer = ""

    def connect(self):
        """Connect to pool via WebSocket or Stratum"""
        try:
            # Detect protocol
            if self.pool_url.startswith('stratum+tcp://'):
                self.protocol = 'stratum'
                return self.connect_stratum()
            else:
                self.protocol = 'websocket'
                return self.connect_websocket()
        except Exception as e:
            print(f"[ERROR] Connection error: {e}")
            return False

    def connect_websocket(self):
        """Connect to pool via WebSocket"""
        # Convert HTTP URL to WebSocket URL
        ws_url = self.pool_url.replace('https://', 'wss://').replace('http://', 'ws://')
        if not ws_url.startswith('ws'):
            ws_url = f"wss://{ws_url}"

        print(f"[WS] Connecting to: {ws_url}")

        self.ws = websocket.WebSocketApp(
            ws_url,
            on_message=self.on_message,
            on_error=self.on_error,
            on_close=self.on_close,
            on_open=self.on_open
        )

        # Run WebSocket in separate thread
        ws_thread = threading.Thread(target=self.ws.run_forever, daemon=True)
        ws_thread.start()

        return True

    def connect_stratum(self):
        """Connect to pool via Stratum (TCP)"""
        # Parse stratum URL: stratum+tcp://host:port
        url = self.pool_url.replace('stratum+tcp://', '')
        if ':' in url:
            host, port = url.split(':')
            port = int(port)
        else:
            host = url
            port = 3333  # Default Stratum port

        print(f"[STRATUM] Connecting to: {host}:{port}")

        self.stratum_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.stratum_socket.connect((host, port))

        print(f"[OK] Connected to Stratum pool")

        # Start Stratum receiver thread
        self.stratum_thread = threading.Thread(target=self.stratum_receiver, daemon=True)
        self.stratum_thread.start()

        # Send mining.subscribe
        self.stratum_send({
            "id": self.stratum_msg_id,
            "method": "mining.subscribe",
            "params": [f"HashNHedge/{self.worker_name}"]
        })
        self.stratum_msg_id += 1

        # Send mining.authorize
        self.stratum_send({
            "id": self.stratum_msg_id,
            "method": "mining.authorize",
            "params": [self.wallet, ""]
        })
        self.stratum_msg_id += 1

        return True

    def on_open(self, ws):
        """WebSocket connection opened"""
        print("[OK] Connected to pool")

        # Register with pool
        register_msg = {
            'type': 'register',
            'wallet': self.wallet,
            'worker': self.worker_name
        }
        ws.send(json.dumps(register_msg))
        print(f"[REGISTER] Worker: {self.worker_name}")
        print(f"[REGISTER] Wallet: {self.wallet}")

    def on_message(self, ws, message):
        """Handle messages from pool"""
        try:
            data = json.loads(message)
            msg_type = data.get('type')

            print(f"[MSG] Type: {msg_type}")

            if msg_type == 'job':
                # New mining job
                self.current_job = {
                    'job_id': data.get('jobId'),
                    'block_data': data.get('blockData'),
                    'target': data.get('target', '000'),
                    'difficulty': data.get('difficulty', 3)
                }
                print(f"[JOB] ID: {self.current_job['job_id']}")
                print(f"[JOB] Target: {self.current_job['target']}")
                print(f"[JOB] Difficulty: {self.current_job['difficulty']}")

            elif msg_type == 'share_result':
                # Share accepted/rejected
                if data.get('valid'):
                    self.shares_accepted += 1
                    print(f"[ACCEPT] Share accepted! ({self.shares_accepted}/{self.shares_submitted})")
                else:
                    self.shares_rejected += 1
                    print(f"[REJECT] Share rejected ({self.shares_rejected}/{self.shares_submitted})")

                self.update_stats()

        except Exception as e:
            print(f"[ERROR] Message error: {e}")

    def on_error(self, ws, error):
        """WebSocket error"""
        print(f"WebSocket error: {error}")

    def on_close(self, ws, close_status_code, close_msg):
        """WebSocket connection closed"""
        print(f"Connection closed: {close_msg}")
        self.mining = False

    def stratum_send(self, msg):
        """Send Stratum JSON-RPC message"""
        if not self.stratum_socket:
            return
        data = json.dumps(msg) + '\n'
        self.stratum_socket.sendall(data.encode())
        print(f"[STRATUM] Sent: {msg.get('method', 'response')}")

    def stratum_receiver(self):
        """Stratum message receiver thread"""
        while self.mining or not self.current_job:
            try:
                data = self.stratum_socket.recv(4096).decode()
                if not data:
                    print("[STRATUM] Connection closed by pool")
                    break

                self.stratum_buffer += data
                while '\n' in self.stratum_buffer:
                    line, self.stratum_buffer = self.stratum_buffer.split('\n', 1)
                    if line.strip():
                        try:
                            msg = json.loads(line)
                            self.handle_stratum_message(msg)
                        except json.JSONDecodeError as e:
                            print(f"[ERROR] Invalid JSON: {e}")
            except Exception as e:
                print(f"[ERROR] Stratum receiver error: {e}")
                break

    def handle_stratum_message(self, msg):
        """Handle incoming Stratum messages"""
        print(f"[STRATUM] Received: {msg}")

        # Handle mining.notify (new job)
        if msg.get('method') == 'mining.notify':
            params = msg.get('params', [])
            if len(params) >= 4:
                self.current_job = {
                    'job_id': params[0],
                    'block_data': params[1] + params[2],  # prevhash + coinbase
                    'target': '000',  # Simplified
                    'difficulty': 1
                }
                print(f"[JOB] ID: {self.current_job['job_id']}")

        # Handle mining.set_difficulty
        elif msg.get('method') == 'mining.set_difficulty':
            params = msg.get('params', [])
            if len(params) > 0:
                difficulty = params[0]
                if self.current_job:
                    self.current_job['difficulty'] = difficulty
                print(f"[DIFFICULTY] Set to: {difficulty}")

        # Handle responses
        elif 'result' in msg:
            msg_id = msg.get('id')
            result = msg.get('result')
            error = msg.get('error')

            if error:
                print(f"[ERROR] Stratum error: {error}")
                return

            # Response to mining.submit
            if msg_id >= 100:  # Share submissions use ID >= 100
                if result:
                    self.shares_accepted += 1
                    print(f"[ACCEPT] Share accepted! ({self.shares_accepted}/{self.shares_submitted})")
                else:
                    self.shares_rejected += 1
                    print(f"[REJECT] Share rejected ({self.shares_rejected}/{self.shares_submitted})")
                self.update_stats()
            elif msg_id == 1:
                print(f"[OK] Subscribed to pool")
            elif msg_id == 2:
                print(f"[OK] Authorized worker: {self.worker_name}")

    def mine_worker(self, thread_id):
        """Mining worker thread - CPU mining"""
        nonce = thread_id * 1000000  # Offset nonces per thread

        while self.mining:
            if not self.current_job:
                time.sleep(0.1)
                continue

            # Get current job
            job_id = self.current_job['job_id']
            block_data = self.current_job['block_data']
            target = self.current_job['target']

            # Mine: hash(block_data + nonce)
            data = f"{block_data}{nonce:016x}"
            hash_result = hashlib.sha256(data.encode()).hexdigest()

            # Check if hash meets target (starts with enough zeros)
            if hash_result.startswith(target):
                # Found valid share!
                self.submit_share(job_id, nonce, hash_result)

            nonce += 1

            # Update hashrate every 1000 hashes
            if nonce % 1000 == 0:
                self.update_hashrate()

    def submit_share(self, job_id, nonce, hash_result):
        """Submit found share to pool"""
        self.shares_submitted += 1

        try:
            if self.protocol == 'websocket':
                if not self.ws:
                    return
                share_msg = {
                    'type': 'submit',
                    'jobId': job_id,
                    'nonce': f"{nonce:016x}",
                    'hash': hash_result
                }
                self.ws.send(json.dumps(share_msg))

            elif self.protocol == 'stratum':
                if not self.stratum_socket:
                    return
                # Stratum mining.submit format
                self.stratum_send({
                    "id": 100 + self.shares_submitted,  # ID >= 100 for share submissions
                    "method": "mining.submit",
                    "params": [
                        self.worker_name,
                        job_id,
                        f"{nonce:016x}",
                        "",  # extranonce2 (not used in simple mode)
                        ""   # time (not used in simple mode)
                    ]
                })

            print(f"[SUBMIT] Share submitted: {hash_result[:16]}...")
            self.update_stats()
        except Exception as e:
            print(f"[ERROR] Submit error: {e}")

    def update_hashrate(self):
        """Calculate and update hashrate"""
        if not self.start_time:
            return

        elapsed = time.time() - self.start_time
        if elapsed > 0:
            # Rough estimate: threads * hashes per second
            self.hashrate = (self.num_threads * 1000) / max(elapsed, 1)

    def update_stats(self):
        """Update mining statistics"""
        if self.on_stats_update:
            stats = self.get_stats()
            self.on_stats_update(stats)

    def start_mining(self):
        """Start mining"""
        if self.mining:
            return

        self.mining = True
        self.start_time = time.time()

        # Start mining threads
        for i in range(self.num_threads):
            thread = threading.Thread(target=self.mine_worker, args=(i,), daemon=True)
            thread.start()
            self.miner_threads.append(thread)

        print(f"Mining started with {self.num_threads} CPU threads")

    def stop_mining(self):
        """Stop mining"""
        self.mining = False
        self.miner_threads = []

        # Close WebSocket connection
        if self.ws:
            self.ws.close()

        # Close Stratum connection
        if self.stratum_socket:
            try:
                self.stratum_socket.close()
            except:
                pass

        print("Mining stopped")

    def get_stats(self):
        """Get current mining statistics"""
        return {
            'hashrate': self.hashrate,
            'shares_submitted': self.shares_submitted,
            'shares_accepted': self.shares_accepted,
            'shares_rejected': self.shares_rejected,
            'uptime': time.time() - self.start_time if self.start_time else 0,
            'efficiency': (self.shares_accepted / max(self.shares_submitted, 1)) * 100
        }


# Standalone test
if __name__ == "__main__":
    def stats_callback(stats):
        print(f"Stats: {stats['hashrate']:.2f} H/s | "
              f"Shares: {stats['shares_accepted']}/{stats['shares_submitted']} | "
              f"Efficiency: {stats['efficiency']:.1f}%")

    # Test with Railway Stratum pool
    miner = HashNHedgeMiner(
        pool_url="stratum+tcp://switchyard.proxy.rlwy.net:13595",
        wallet="GCKbEgD4VSLtkwt57At7pWscaxaQ2gBZtTQE2hqr3Yrc",
        worker_name="test-miner",
        on_stats_update=stats_callback
    )

    miner.connect()
    time.sleep(2)  # Wait for connection

    miner.start_mining()

    try:
        while True:
            time.sleep(5)
            stats = miner.get_stats()
            print(f"\nHashrate: {stats['hashrate']:.2f} H/s")
            print(f"Shares: {stats['shares_accepted']}/{stats['shares_submitted']}")
    except KeyboardInterrupt:
        miner.stop_mining()
