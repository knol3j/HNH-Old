"""
HashNHedge Miner GUI - Windows Application
Simple, user-friendly mining interface with real-time stats
"""

import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import threading
import time
import hashlib
import json
import requests
import subprocess
import sys
from datetime import datetime
import os

class HashNHedgeMinerGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("HashNHedge Miner v1.0")
        self.root.geometry("800x600")
        self.root.configure(bg='#1a1a1a')

        # Mining state
        self.is_mining = False
        self.wallet_address = ""
        self.total_shares = 0
        self.total_earnings = 0.0
        self.hashrate = 0
        self.mining_thread = None
        self.stats_thread = None

        # Pool servers to try
        self.pool_servers = [
            "https://hashnhedge-pool.onrender.com",
            "ws://localhost:3001",
            "https://hashnhedge-backup.netlify.app/.netlify/functions/pool"
        ]
        self.active_server = None

        self.create_widgets()
        self.start_stats_updater()

    def create_widgets(self):
        # Main container
        main_frame = tk.Frame(self.root, bg='#1a1a1a')
        main_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)

        # Title
        title_label = tk.Label(main_frame, text="HashNHedge Miner",
                              font=('Arial', 24, 'bold'),
                              fg='#6366f1', bg='#1a1a1a')
        title_label.pack(pady=(0, 20))

        # Wallet input section
        wallet_frame = tk.Frame(main_frame, bg='#2d2d2d', relief=tk.RAISED, bd=2)
        wallet_frame.pack(fill=tk.X, pady=(0, 20))

        tk.Label(wallet_frame, text="Solana Wallet Address:",
                font=('Arial', 12, 'bold'), fg='white', bg='#2d2d2d').pack(pady=(10, 5))

        self.wallet_entry = tk.Entry(wallet_frame, font=('Arial', 11), width=60,
                                    bg='#3d3d3d', fg='white', insertbackground='white')
        self.wallet_entry.pack(pady=(0, 10))
        self.wallet_entry.bind('<Return>', lambda e: self.connect_wallet())

        # Connect button
        self.connect_btn = tk.Button(wallet_frame, text="Connect Wallet",
                                   command=self.connect_wallet,
                                   bg='#6366f1', fg='white', font=('Arial', 11, 'bold'),
                                   padx=20, pady=5)
        self.connect_btn.pack(pady=(0, 15))

        # Mining controls
        controls_frame = tk.Frame(main_frame, bg='#2d2d2d', relief=tk.RAISED, bd=2)
        controls_frame.pack(fill=tk.X, pady=(0, 20))

        controls_title = tk.Label(controls_frame, text="Mining Controls",
                                 font=('Arial', 14, 'bold'), fg='white', bg='#2d2d2d')
        controls_title.pack(pady=(10, 10))

        buttons_frame = tk.Frame(controls_frame, bg='#2d2d2d')
        buttons_frame.pack(pady=(0, 15))

        self.start_btn = tk.Button(buttons_frame, text="Start Mining",
                                  command=self.start_mining,
                                  bg='#10b981', fg='white', font=('Arial', 12, 'bold'),
                                  padx=30, pady=8, state=tk.DISABLED)
        self.start_btn.pack(side=tk.LEFT, padx=(0, 10))

        self.stop_btn = tk.Button(buttons_frame, text="Stop Mining",
                                 command=self.stop_mining,
                                 bg='#ef4444', fg='white', font=('Arial', 12, 'bold'),
                                 padx=30, pady=8, state=tk.DISABLED)
        self.stop_btn.pack(side=tk.LEFT)

        # Stats display
        stats_frame = tk.Frame(main_frame, bg='#2d2d2d', relief=tk.RAISED, bd=2)
        stats_frame.pack(fill=tk.BOTH, expand=True)

        stats_title = tk.Label(stats_frame, text="Real-Time Mining Stats",
                              font=('Arial', 14, 'bold'), fg='white', bg='#2d2d2d')
        stats_title.pack(pady=(10, 10))

        # Stats grid
        stats_grid = tk.Frame(stats_frame, bg='#2d2d2d')
        stats_grid.pack(fill=tk.X, padx=20, pady=(0, 10))

        # Hashrate
        hashrate_frame = tk.Frame(stats_grid, bg='#3d3d3d', relief=tk.RAISED, bd=1)
        hashrate_frame.grid(row=0, column=0, padx=5, pady=5, sticky='ew')
        tk.Label(hashrate_frame, text="Hashrate", font=('Arial', 10, 'bold'),
                fg='#60a5fa', bg='#3d3d3d').pack(pady=(5, 0))
        self.hashrate_label = tk.Label(hashrate_frame, text="0 H/s",
                                      font=('Arial', 16, 'bold'), fg='white', bg='#3d3d3d')
        self.hashrate_label.pack(pady=(0, 5))

        # Shares
        shares_frame = tk.Frame(stats_grid, bg='#3d3d3d', relief=tk.RAISED, bd=1)
        shares_frame.grid(row=0, column=1, padx=5, pady=5, sticky='ew')
        tk.Label(shares_frame, text="Shares Found", font=('Arial', 10, 'bold'),
                fg='#34d399', bg='#3d3d3d').pack(pady=(5, 0))
        self.shares_label = tk.Label(shares_frame, text="0",
                                    font=('Arial', 16, 'bold'), fg='white', bg='#3d3d3d')
        self.shares_label.pack(pady=(0, 5))

        # Earnings
        earnings_frame = tk.Frame(stats_grid, bg='#3d3d3d', relief=tk.RAISED, bd=1)
        earnings_frame.grid(row=0, column=2, padx=5, pady=5, sticky='ew')
        tk.Label(earnings_frame, text="Earnings (HNH)", font=('Arial', 10, 'bold'),
                fg='#fbbf24', bg='#3d3d3d').pack(pady=(5, 0))
        self.earnings_label = tk.Label(earnings_frame, text="0.00",
                                      font=('Arial', 16, 'bold'), fg='white', bg='#3d3d3d')
        self.earnings_label.pack(pady=(0, 5))

        # Configure grid weights
        stats_grid.columnconfigure(0, weight=1)
        stats_grid.columnconfigure(1, weight=1)
        stats_grid.columnconfigure(2, weight=1)

        # Status and logs
        status_frame = tk.Frame(stats_frame, bg='#2d2d2d')
        status_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=(10, 15))

        tk.Label(status_frame, text="Mining Status & Logs",
                font=('Arial', 11, 'bold'), fg='white', bg='#2d2d2d').pack(anchor='w')

        self.log_text = scrolledtext.ScrolledText(status_frame, height=8,
                                                 bg='#1a1a1a', fg='#10b981',
                                                 font=('Consolas', 9))
        self.log_text.pack(fill=tk.BOTH, expand=True, pady=(5, 0))

        # Status bar
        self.status_var = tk.StringVar()
        self.status_var.set("Ready - Enter wallet address to begin")
        status_bar = tk.Label(main_frame, textvariable=self.status_var,
                             bg='#374151', fg='white', font=('Arial', 10),
                             relief=tk.SUNKEN, anchor='w')
        status_bar.pack(fill=tk.X, side=tk.BOTTOM, pady=(10, 0))

        self.log("HashNHedge Miner initialized")
        self.log("Please enter your Solana wallet address to continue")

    def log(self, message):
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_message = f"[{timestamp}] {message}\n"
        self.log_text.insert(tk.END, log_message)
        self.log_text.see(tk.END)
        self.root.update_idletasks()

    def connect_wallet(self):
        wallet = self.wallet_entry.get().strip()
        if not wallet:
            messagebox.showerror("Error", "Please enter a wallet address")
            return

        if len(wallet) < 32:
            messagebox.showerror("Error", "Invalid wallet address format")
            return

        self.wallet_address = wallet
        self.log(f"Wallet connected: {wallet[:8]}...{wallet[-8:]}")
        self.status_var.set(f"Wallet connected: {wallet[:12]}...")

        # Enable mining controls
        self.start_btn.config(state=tk.NORMAL)
        self.connect_btn.config(text="Wallet Connected", state=tk.DISABLED, bg='#10b981')

        # Try to connect to pool
        self.connect_to_pool()

    def connect_to_pool(self):
        self.log("Connecting to mining pool...")

        for server in self.pool_servers:
            try:
                if server.startswith('http'):
                    response = requests.get(f"{server}/api/pool/status", timeout=5)
                    if response.status_code == 200:
                        self.active_server = server
                        self.log(f"Connected to pool: {server}")
                        self.status_var.set(f"Connected to pool: {server}")
                        return
            except:
                continue

        self.log("Warning: Could not connect to pool servers")
        self.log("Mining will work in offline mode")
        self.active_server = None

    def start_mining(self):
        if not self.wallet_address:
            messagebox.showerror("Error", "Please connect wallet first")
            return

        self.is_mining = True
        self.start_btn.config(state=tk.DISABLED)
        self.stop_btn.config(state=tk.NORMAL)

        self.log("Starting mining operation...")
        self.status_var.set("Mining...")

        # Start mining thread
        self.mining_thread = threading.Thread(target=self.mining_worker, daemon=True)
        self.mining_thread.start()

    def stop_mining(self):
        self.is_mining = False
        self.start_btn.config(state=tk.NORMAL)
        self.stop_btn.config(state=tk.DISABLED)

        self.log("Stopping mining operation...")
        self.status_var.set("Mining stopped")

    def mining_worker(self):
        """Main mining loop"""
        self.log("Mining worker started")
        hash_count = 0
        start_time = time.time()

        while self.is_mining:
            try:
                # Simple SHA256 mining simulation
                nonce = hash_count
                data = f"{self.wallet_address}{nonce}{int(time.time())}"
                hash_result = hashlib.sha256(data.encode()).hexdigest()

                hash_count += 1

                # Calculate hashrate every second
                if hash_count % 1000 == 0:
                    elapsed = time.time() - start_time
                    if elapsed > 0:
                        self.hashrate = hash_count / elapsed

                # Check for valid share (difficulty simulation)
                if hash_result.startswith('0000'):
                    self.total_shares += 1
                    self.total_earnings += 1.0  # 1 HNH per share
                    self.log(f"Share found! Hash: {hash_result[:16]}...")

                    # Submit to pool if connected
                    if self.active_server:
                        self.submit_share(hash_result, nonce)

                # Small delay to prevent 100% CPU usage
                time.sleep(0.001)

            except Exception as e:
                self.log(f"Mining error: {str(e)}")
                time.sleep(1)

        self.log("Mining worker stopped")

    def submit_share(self, hash_result, nonce):
        """Submit found share to the pool"""
        try:
            data = {
                'wallet': self.wallet_address,
                'hash': hash_result,
                'nonce': nonce,
                'timestamp': int(time.time())
            }

            response = requests.post(f"{self.active_server}/api/pool/submit",
                                   json=data, timeout=5)

            if response.status_code == 200:
                self.log("Share submitted to pool successfully")
            else:
                self.log(f"Share submission failed: {response.status_code}")

        except Exception as e:
            self.log(f"Failed to submit share: {str(e)}")

    def start_stats_updater(self):
        """Start the stats update thread"""
        self.stats_thread = threading.Thread(target=self.update_stats_loop, daemon=True)
        self.stats_thread.start()

    def update_stats_loop(self):
        """Update stats display every second"""
        while True:
            try:
                # Update hashrate display
                if self.hashrate >= 1000000:
                    hashrate_text = f"{self.hashrate/1000000:.2f} MH/s"
                elif self.hashrate >= 1000:
                    hashrate_text = f"{self.hashrate/1000:.2f} KH/s"
                else:
                    hashrate_text = f"{self.hashrate:.0f} H/s"

                self.hashrate_label.config(text=hashrate_text)
                self.shares_label.config(text=str(self.total_shares))
                self.earnings_label.config(text=f"{self.total_earnings:.2f}")

                # Fetch pool stats if connected
                if self.active_server and self.wallet_address:
                    self.fetch_pool_stats()

                time.sleep(1)

            except Exception as e:
                print(f"Stats update error: {e}")
                time.sleep(5)

    def fetch_pool_stats(self):
        """Fetch user stats from the pool"""
        try:
            response = requests.get(f"{self.active_server}/api/pool/stats/{self.wallet_address}",
                                  timeout=3)

            if response.status_code == 200:
                stats = response.json()
                if 'shares' in stats:
                    self.total_shares = stats['shares']
                if 'earnings' in stats:
                    self.total_earnings = stats['earnings']

        except:
            pass  # Silently fail for stats updates

def main():
    root = tk.Tk()
    app = HashNHedgeMinerGUI(root)

    try:
        root.mainloop()
    except KeyboardInterrupt:
        print("Application closed by user")

if __name__ == "__main__":
    main()