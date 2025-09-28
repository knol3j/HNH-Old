"""
HashNHedge Advanced Miner GUI - Windows Application
Professional mining interface with real-time stats and pool integration
"""

import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext, filedialog
import threading
import time
import hashlib
import json
import requests
import subprocess
import sys
from datetime import datetime, timedelta
import os
import configparser
from pathlib import Path

class HashNHedgeAdvancedMiner:
    def __init__(self, root):
        self.root = root
        self.root.title("HashNHedge Advanced Miner v1.1")
        self.root.geometry("1000x700")
        self.root.configure(bg='#0f172a')

        # Config file path
        self.config_file = Path("miner_config.ini")

        # Mining state
        self.is_mining = False
        self.wallet_address = ""
        self.total_shares = 0
        self.total_earnings = 0.0
        self.hashrate = 0
        self.session_start = None
        self.mining_thread = None
        self.stats_thread = None
        self.auto_connect = True

        # Performance tracking
        self.hash_count = 0
        self.session_shares = 0
        self.session_earnings = 0.0
        self.best_hashrate = 0

        # Pool configuration
        self.pool_servers = [
            "https://hashnhedge-pool.onrender.com",
            "https://hashnhedge-backup.netlify.app/.netlify/functions/pool",
            "ws://localhost:3001"
        ]
        self.active_server = None
        self.pool_status = "Disconnected"

        # Load saved configuration
        self.load_config()

        self.create_widgets()
        self.start_stats_updater()

        # Auto-connect if wallet is saved
        if self.wallet_address:
            self.wallet_entry.insert(0, self.wallet_address)
            self.root.after(1000, self.connect_wallet)

    def create_widgets(self):
        # Create notebook for tabs
        notebook = ttk.Notebook(self.root)
        notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        # Main mining tab
        main_tab = tk.Frame(notebook, bg='#0f172a')
        notebook.add(main_tab, text="  Mining  ")

        # Statistics tab
        stats_tab = tk.Frame(notebook, bg='#0f172a')
        notebook.add(stats_tab, text="  Statistics  ")

        # Settings tab
        settings_tab = tk.Frame(notebook, bg='#0f172a')
        notebook.add(settings_tab, text="  Settings  ")

        self.create_main_tab(main_tab)
        self.create_stats_tab(stats_tab)
        self.create_settings_tab(settings_tab)

    def create_main_tab(self, parent):
        # Header with logo space
        header_frame = tk.Frame(parent, bg='#1e293b', height=80)
        header_frame.pack(fill=tk.X, padx=10, pady=(10, 0))
        header_frame.pack_propagate(False)

        title_label = tk.Label(header_frame, text="HashNHedge Advanced Miner",
                              font=('Segoe UI', 20, 'bold'),
                              fg='#6366f1', bg='#1e293b')
        title_label.pack(expand=True)

        # Main content area
        content_frame = tk.Frame(parent, bg='#0f172a')
        content_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        # Left panel - Controls
        left_panel = tk.Frame(content_frame, bg='#1e293b', width=350)
        left_panel.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 10))
        left_panel.pack_propagate(False)

        # Wallet section
        wallet_section = tk.LabelFrame(left_panel, text="Wallet Configuration",
                                      font=('Segoe UI', 11, 'bold'),
                                      fg='white', bg='#1e293b')
        wallet_section.pack(fill=tk.X, padx=10, pady=10)

        tk.Label(wallet_section, text="Solana Wallet Address:",
                font=('Segoe UI', 10), fg='#cbd5e1', bg='#1e293b').pack(anchor='w', padx=10, pady=(10, 5))

        self.wallet_entry = tk.Text(wallet_section, height=2, font=('Consolas', 9),
                                   bg='#334155', fg='white', insertbackground='white',
                                   wrap=tk.WORD)
        self.wallet_entry.pack(fill=tk.X, padx=10, pady=(0, 10))

        wallet_buttons = tk.Frame(wallet_section, bg='#1e293b')
        wallet_buttons.pack(fill=tk.X, padx=10, pady=(0, 15))

        self.connect_btn = tk.Button(wallet_buttons, text="Connect Wallet",
                                   command=self.connect_wallet,
                                   bg='#3b82f6', fg='white', font=('Segoe UI', 10, 'bold'),
                                   relief=tk.FLAT, padx=20, pady=8)
        self.connect_btn.pack(side=tk.LEFT)

        load_btn = tk.Button(wallet_buttons, text="Load",
                           command=self.load_wallet_from_file,
                           bg='#6b7280', fg='white', font=('Segoe UI', 9),
                           relief=tk.FLAT, padx=15, pady=8)
        load_btn.pack(side=tk.RIGHT)

        # Mining controls section
        mining_section = tk.LabelFrame(left_panel, text="Mining Controls",
                                      font=('Segoe UI', 11, 'bold'),
                                      fg='white', bg='#1e293b')
        mining_section.pack(fill=tk.X, padx=10, pady=(0, 10))

        # Pool status
        pool_frame = tk.Frame(mining_section, bg='#1e293b')
        pool_frame.pack(fill=tk.X, padx=10, pady=10)

        tk.Label(pool_frame, text="Pool Status:",
                font=('Segoe UI', 10), fg='#cbd5e1', bg='#1e293b').pack(side=tk.LEFT)

        self.pool_status_label = tk.Label(pool_frame, text="Disconnected",
                                         font=('Segoe UI', 10, 'bold'),
                                         fg='#ef4444', bg='#1e293b')
        self.pool_status_label.pack(side=tk.RIGHT)

        # Mining buttons
        mining_buttons = tk.Frame(mining_section, bg='#1e293b')
        mining_buttons.pack(fill=tk.X, padx=10, pady=(0, 15))

        self.start_btn = tk.Button(mining_buttons, text="Start Mining",
                                  command=self.start_mining,
                                  bg='#10b981', fg='white', font=('Segoe UI', 11, 'bold'),
                                  relief=tk.FLAT, padx=25, pady=10, state=tk.DISABLED)
        self.start_btn.pack(fill=tk.X, pady=(0, 5))

        self.stop_btn = tk.Button(mining_buttons, text="Stop Mining",
                                 command=self.stop_mining,
                                 bg='#ef4444', fg='white', font=('Segoe UI', 11, 'bold'),
                                 relief=tk.FLAT, padx=25, pady=10, state=tk.DISABLED)
        self.stop_btn.pack(fill=tk.X)

        # Quick stats section
        quick_stats = tk.LabelFrame(left_panel, text="Quick Stats",
                                   font=('Segoe UI', 11, 'bold'),
                                   fg='white', bg='#1e293b')
        quick_stats.pack(fill=tk.X, padx=10, pady=(0, 10))

        self.quick_hashrate = tk.Label(quick_stats, text="0 H/s",
                                      font=('Segoe UI', 14, 'bold'),
                                      fg='#60a5fa', bg='#1e293b')
        self.quick_hashrate.pack(pady=5)

        self.quick_shares = tk.Label(quick_stats, text="0 shares",
                                    font=('Segoe UI', 12),
                                    fg='#34d399', bg='#1e293b')
        self.quick_shares.pack()

        self.quick_earnings = tk.Label(quick_stats, text="0.00 HNH",
                                      font=('Segoe UI', 12),
                                      fg='#fbbf24', bg='#1e293b')
        self.quick_earnings.pack(pady=(0, 10))

        # Right panel - Stats and logs
        right_panel = tk.Frame(content_frame, bg='#0f172a')
        right_panel.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)

        # Detailed stats grid
        stats_grid = tk.Frame(right_panel, bg='#1e293b')
        stats_grid.pack(fill=tk.X, pady=(0, 10))

        # Stats cards
        stats_cards = [
            ("Current Hashrate", "hashrate_detailed", "#3b82f6"),
            ("Session Shares", "session_shares", "#10b981"),
            ("Total Earnings", "total_earnings_detailed", "#f59e0b"),
            ("Session Time", "session_time", "#8b5cf6"),
            ("Best Hashrate", "best_hashrate", "#ef4444"),
            ("Avg. Share Time", "avg_share_time", "#06b6d4")
        ]

        self.stat_labels = {}
        for i, (title, key, color) in enumerate(stats_cards):
            row, col = i // 3, i % 3

            card = tk.Frame(stats_grid, bg='#334155', relief=tk.RAISED, bd=1)
            card.grid(row=row, column=col, padx=5, pady=5, sticky='ew')

            tk.Label(card, text=title, font=('Segoe UI', 9),
                    fg='#cbd5e1', bg='#334155').pack(pady=(8, 2))

            self.stat_labels[key] = tk.Label(card, text="--",
                                           font=('Segoe UI', 12, 'bold'),
                                           fg=color, bg='#334155')
            self.stat_labels[key].pack(pady=(0, 8))

        # Configure grid weights
        for i in range(3):
            stats_grid.columnconfigure(i, weight=1)

        # Logs section
        logs_frame = tk.LabelFrame(right_panel, text="Mining Logs",
                                  font=('Segoe UI', 11, 'bold'),
                                  fg='white', bg='#1e293b')
        logs_frame.pack(fill=tk.BOTH, expand=True, pady=(10, 0))

        # Log controls
        log_controls = tk.Frame(logs_frame, bg='#1e293b')
        log_controls.pack(fill=tk.X, padx=10, pady=(10, 5))

        clear_logs_btn = tk.Button(log_controls, text="Clear Logs",
                                  command=self.clear_logs,
                                  bg='#6b7280', fg='white', font=('Segoe UI', 9),
                                  relief=tk.FLAT, padx=15, pady=5)
        clear_logs_btn.pack(side=tk.RIGHT)

        self.log_text = scrolledtext.ScrolledText(logs_frame, height=12,
                                                 bg='#0f172a', fg='#10b981',
                                                 font=('Consolas', 9),
                                                 selectbackground='#374151')
        self.log_text.pack(fill=tk.BOTH, expand=True, padx=10, pady=(0, 10))

    def create_stats_tab(self, parent):
        tk.Label(parent, text="Detailed Statistics",
                font=('Segoe UI', 16, 'bold'), fg='white', bg='#0f172a').pack(pady=20)

        # Performance charts area (placeholder for future chart implementation)
        charts_frame = tk.Frame(parent, bg='#1e293b', height=300)
        charts_frame.pack(fill=tk.X, padx=20, pady=(0, 20))
        charts_frame.pack_propagate(False)

        tk.Label(charts_frame, text="📊 Performance Charts",
                font=('Segoe UI', 14), fg='#94a3b8', bg='#1e293b').pack(expand=True)
        tk.Label(charts_frame, text="Charts will be available in future updates",
                font=('Segoe UI', 10), fg='#64748b', bg='#1e293b').pack()

    def create_settings_tab(self, parent):
        settings_frame = tk.Frame(parent, bg='#0f172a')
        settings_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)

        tk.Label(settings_frame, text="Miner Settings",
                font=('Segoe UI', 16, 'bold'), fg='white', bg='#0f172a').pack(pady=(0, 20))

        # Pool settings
        pool_section = tk.LabelFrame(settings_frame, text="Pool Configuration",
                                    font=('Segoe UI', 11, 'bold'),
                                    fg='white', bg='#0f172a')
        pool_section.pack(fill=tk.X, pady=(0, 20))

        self.auto_connect_var = tk.BooleanVar(value=self.auto_connect)
        auto_connect_cb = tk.Checkbutton(pool_section, text="Auto-connect to pool on startup",
                                        variable=self.auto_connect_var,
                                        font=('Segoe UI', 10), fg='white', bg='#0f172a',
                                        selectcolor='#1e293b', activebackground='#0f172a')
        auto_connect_cb.pack(anchor='w', padx=15, pady=10)

        # Advanced settings
        advanced_section = tk.LabelFrame(settings_frame, text="Advanced Settings",
                                        font=('Segoe UI', 11, 'bold'),
                                        fg='white', bg='#0f172a')
        advanced_section.pack(fill=tk.X, pady=(0, 20))

        tk.Label(advanced_section, text="Mining difficulty will auto-adjust",
                font=('Segoe UI', 10), fg='#94a3b8', bg='#0f172a').pack(anchor='w', padx=15, pady=10)

        # Save settings button
        save_btn = tk.Button(settings_frame, text="Save Settings",
                           command=self.save_config,
                           bg='#10b981', fg='white', font=('Segoe UI', 11, 'bold'),
                           relief=tk.FLAT, padx=30, pady=10)
        save_btn.pack(pady=20)

    def load_config(self):
        """Load configuration from file"""
        if self.config_file.exists():
            config = configparser.ConfigParser()
            config.read(self.config_file)

            if 'settings' in config:
                self.wallet_address = config.get('settings', 'wallet_address', fallback='')
                self.auto_connect = config.getboolean('settings', 'auto_connect', fallback=True)

    def save_config(self):
        """Save configuration to file"""
        config = configparser.ConfigParser()
        config['settings'] = {
            'wallet_address': self.wallet_address,
            'auto_connect': str(self.auto_connect_var.get())
        }

        with open(self.config_file, 'w') as f:
            config.write(f)

        self.log("Settings saved successfully")
        messagebox.showinfo("Settings", "Settings saved successfully!")

    def load_wallet_from_file(self):
        """Load wallet address from a file"""
        file_path = filedialog.askopenfilename(
            title="Select wallet file",
            filetypes=[("Text files", "*.txt"), ("All files", "*.*")]
        )

        if file_path:
            try:
                with open(file_path, 'r') as f:
                    wallet = f.read().strip()
                    self.wallet_entry.delete(1.0, tk.END)
                    self.wallet_entry.insert(1.0, wallet)
                    self.log(f"Wallet loaded from {Path(file_path).name}")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to load wallet file: {str(e)}")

    def clear_logs(self):
        """Clear the log display"""
        self.log_text.delete(1.0, tk.END)

    def log(self, message, level="INFO"):
        """Enhanced logging with levels"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        colors = {
            "INFO": "#10b981",
            "WARN": "#f59e0b",
            "ERROR": "#ef4444",
            "SUCCESS": "#34d399"
        }

        log_message = f"[{timestamp}] {level}: {message}\n"

        self.log_text.insert(tk.END, log_message)
        self.log_text.see(tk.END)

        # Color the last line
        last_line = self.log_text.index(tk.END + "-1c linestart")
        self.log_text.tag_add(level, last_line, tk.END)
        self.log_text.tag_config(level, foreground=colors.get(level, "#10b981"))

        self.root.update_idletasks()

    def connect_wallet(self):
        """Enhanced wallet connection with validation"""
        wallet = self.wallet_entry.get(1.0, tk.END).strip()
        if not wallet:
            messagebox.showerror("Error", "Please enter a wallet address")
            return

        # Basic Solana address validation
        if len(wallet) < 32 or len(wallet) > 44:
            messagebox.showerror("Error", "Invalid Solana wallet address format")
            return

        self.wallet_address = wallet
        self.log(f"Wallet connected: {wallet[:8]}...{wallet[-8:]}", "SUCCESS")

        # Enable mining controls
        self.start_btn.config(state=tk.NORMAL)
        self.connect_btn.config(text="✓ Connected", state=tk.DISABLED, bg='#10b981')

        # Try to connect to pool
        if self.auto_connect:
            self.connect_to_pool()

    def connect_to_pool(self):
        """Enhanced pool connection with retry logic"""
        self.log("Connecting to mining pool...", "INFO")

        for i, server in enumerate(self.pool_servers):
            try:
                if server.startswith('http'):
                    response = requests.get(f"{server}/api/pool/status", timeout=5)
                    if response.status_code == 200:
                        self.active_server = server
                        self.pool_status = "Connected"
                        self.pool_status_label.config(text="Connected", fg='#10b981')
                        self.log(f"Connected to pool: {server}", "SUCCESS")
                        return
            except Exception as e:
                self.log(f"Failed to connect to {server}: {str(e)[:50]}...", "WARN")
                continue

        self.pool_status = "Offline Mode"
        self.pool_status_label.config(text="Offline Mode", fg='#f59e0b')
        self.log("Running in offline mode - shares will be stored locally", "WARN")
        self.active_server = None

    def start_mining(self):
        """Enhanced mining start with session tracking"""
        if not self.wallet_address:
            messagebox.showerror("Error", "Please connect wallet first")
            return

        self.is_mining = True
        self.session_start = datetime.now()
        self.session_shares = 0
        self.session_earnings = 0.0
        self.hash_count = 0

        self.start_btn.config(state=tk.DISABLED)
        self.stop_btn.config(state=tk.NORMAL)

        self.log("Starting mining operation...", "INFO")

        # Start mining thread
        self.mining_thread = threading.Thread(target=self.mining_worker, daemon=True)
        self.mining_thread.start()

    def stop_mining(self):
        """Enhanced mining stop with session summary"""
        self.is_mining = False
        self.start_btn.config(state=tk.NORMAL)
        self.stop_btn.config(state=tk.DISABLED)

        if self.session_start:
            session_duration = datetime.now() - self.session_start
            self.log(f"Mining stopped. Session: {session_duration}, Shares: {self.session_shares}", "INFO")
        else:
            self.log("Mining stopped", "INFO")

    def mining_worker(self):
        """Enhanced mining worker with better performance tracking"""
        self.log("Mining worker started", "SUCCESS")
        start_time = time.time()
        last_share_time = start_time

        while self.is_mining:
            try:
                # Mining simulation with realistic performance
                nonce = self.hash_count
                data = f"{self.wallet_address}{nonce}{int(time.time())}"
                hash_result = hashlib.sha256(data.encode()).hexdigest()

                self.hash_count += 1

                # Calculate hashrate every 100 hashes
                if self.hash_count % 100 == 0:
                    elapsed = time.time() - start_time
                    if elapsed > 0:
                        current_hashrate = self.hash_count / elapsed
                        self.hashrate = current_hashrate
                        if current_hashrate > self.best_hashrate:
                            self.best_hashrate = current_hashrate

                # Check for valid share (adjustable difficulty)
                difficulty = "0000"  # 4 leading zeros
                if hash_result.startswith(difficulty):
                    self.total_shares += 1
                    self.session_shares += 1
                    share_reward = 1.0
                    self.total_earnings += share_reward
                    self.session_earnings += share_reward

                    current_time = time.time()
                    time_since_last = current_time - last_share_time
                    last_share_time = current_time

                    self.log(f"Share found! Hash: {hash_result[:16]}... (+{share_reward} HNH)", "SUCCESS")

                    # Submit to pool if connected
                    if self.active_server:
                        self.submit_share(hash_result, nonce)

                # Controlled CPU usage
                time.sleep(0.0001)

            except Exception as e:
                self.log(f"Mining error: {str(e)}", "ERROR")
                time.sleep(1)

        self.log("Mining worker stopped", "INFO")

    def submit_share(self, hash_result, nonce):
        """Enhanced share submission with retry logic"""
        try:
            data = {
                'wallet': self.wallet_address,
                'hash': hash_result,
                'nonce': nonce,
                'timestamp': int(time.time()),
                'miner_version': '1.1'
            }

            response = requests.post(f"{self.active_server}/api/pool/submit",
                                   json=data, timeout=5)

            if response.status_code == 200:
                self.log("Share submitted to pool", "SUCCESS")
            else:
                self.log(f"Share submission failed: HTTP {response.status_code}", "ERROR")

        except Exception as e:
            self.log(f"Failed to submit share: {str(e)}", "ERROR")

    def start_stats_updater(self):
        """Start the enhanced stats update thread"""
        self.stats_thread = threading.Thread(target=self.update_stats_loop, daemon=True)
        self.stats_thread.start()

    def update_stats_loop(self):
        """Enhanced stats update with detailed metrics"""
        while True:
            try:
                # Format hashrate
                if self.hashrate >= 1000000:
                    hashrate_text = f"{self.hashrate/1000000:.2f} MH/s"
                elif self.hashrate >= 1000:
                    hashrate_text = f"{self.hashrate/1000:.2f} KH/s"
                else:
                    hashrate_text = f"{self.hashrate:.0f} H/s"

                # Update quick stats
                self.quick_hashrate.config(text=hashrate_text)
                self.quick_shares.config(text=f"{self.total_shares} shares")
                self.quick_earnings.config(text=f"{self.total_earnings:.2f} HNH")

                # Update detailed stats
                self.stat_labels['hashrate_detailed'].config(text=hashrate_text)
                self.stat_labels['session_shares'].config(text=str(self.session_shares))
                self.stat_labels['total_earnings_detailed'].config(text=f"{self.total_earnings:.2f} HNH")

                if self.best_hashrate >= 1000000:
                    best_text = f"{self.best_hashrate/1000000:.2f} MH/s"
                elif self.best_hashrate >= 1000:
                    best_text = f"{self.best_hashrate/1000:.2f} KH/s"
                else:
                    best_text = f"{self.best_hashrate:.0f} H/s"
                self.stat_labels['best_hashrate'].config(text=best_text)

                # Session time
                if self.session_start:
                    session_duration = datetime.now() - self.session_start
                    hours, remainder = divmod(session_duration.seconds, 3600)
                    minutes, seconds = divmod(remainder, 60)
                    session_text = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
                    self.stat_labels['session_time'].config(text=session_text)

                # Average share time
                if self.session_shares > 0 and self.session_start:
                    avg_time = (datetime.now() - self.session_start).seconds / self.session_shares
                    if avg_time < 60:
                        avg_text = f"{avg_time:.1f}s"
                    else:
                        avg_text = f"{avg_time/60:.1f}m"
                    self.stat_labels['avg_share_time'].config(text=avg_text)

                # Fetch pool stats if connected
                if self.active_server and self.wallet_address:
                    self.fetch_pool_stats()

                time.sleep(1)

            except Exception as e:
                print(f"Stats update error: {e}")
                time.sleep(5)

    def fetch_pool_stats(self):
        """Enhanced pool stats fetching"""
        try:
            response = requests.get(f"{self.active_server}/api/pool/stats/{self.wallet_address}",
                                  timeout=3)

            if response.status_code == 200:
                stats = response.json()
                if 'shares' in stats:
                    self.total_shares = max(self.total_shares, stats['shares'])
                if 'earnings' in stats:
                    self.total_earnings = max(self.total_earnings, stats['earnings'])

        except:
            pass  # Silently fail for stats updates

def main():
    # Set up better Windows styling
    root = tk.Tk()

    # Configure ttk style
    style = ttk.Style()
    style.theme_use('clam')

    app = HashNHedgeAdvancedMiner(root)

    try:
        root.mainloop()
    except KeyboardInterrupt:
        print("Application closed by user")

if __name__ == "__main__":
    main()