#!/usr/bin/env python3
"""
HashNHedge Mining GUI - Enhanced with FOSS Backend Support
Supports: ethminer, xmrig, t-rex, lolminer
"""

import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import json
import os
import sys
import time
import threading
import requests
import psutil
from datetime import datetime, timedelta
import platform
from collections import deque
import logging

# Import our backend manager
from miner_backends import MinerManager, ValidationError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class EnhancedMinerGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("HashNHedge Smart Miner v3.0 - FOSS Edition")
        self.root.geometry("1200x800")
        self.root.configure(bg='#1e1e2e')

        # Miner manager
        self.miner_manager = MinerManager()

        # Mining state
        self.mining = False
        self.current_backend = "t-rex"
        self.current_algorithm = "ethash"
        self.start_time = None

        # Pool connection
        self.pool_url = "pool.hashnhedge.com:3333"
        self.wallet_address = ""
        self.worker_name = "HNH-Rig-1"

        # Stats tracking (using deque for efficient operations)
        self.hashrate_history = deque(maxlen=60)
        self.gpu_temp = 0
        self.gpu_power = 0
        self.gpu_fan = 0

        # Load config
        self.load_config()

        # Setup UI
        self.setup_ui()

        # Start monitoring thread
        self.monitor_thread = threading.Thread(target=self.monitor_loop, daemon=True)
        self.monitor_thread.start()

    def load_config(self):
        """Load configuration from file"""
        config_file = os.path.join(os.path.expanduser("~"), ".hashnhedge", "miner_config.json")

        if os.path.exists(config_file):
            try:
                with open(config_file, 'r') as f:
                    config = json.load(f)
                    self.wallet_address = config.get("wallet", "")
                    self.worker_name = config.get("worker_name", "HNH-Rig-1")
                    self.pool_url = config.get("pool_url", "pool.hashnhedge.com:3333")
                    self.current_backend = config.get("backend", "t-rex")
                    self.current_algorithm = config.get("algorithm", "ethash")
            except (FileNotFoundError, PermissionError) as e:
                logger.warning(f"Could not load config file: {e}")
            except (json.JSONDecodeError, KeyError, ValueError) as e:
                logger.error(f"Error parsing config file: {e}")

    def save_config(self):
        """Save configuration to file"""
        config_dir = os.path.join(os.path.expanduser("~"), ".hashnhedge")
        os.makedirs(config_dir, exist_ok=True)

        config_file = os.path.join(config_dir, "miner_config.json")
        config = {
            "wallet": self.wallet_address,
            "worker_name": self.worker_name,
            "pool_url": self.pool_url,
            "backend": self.current_backend,
            "algorithm": self.current_algorithm
        }

        try:
            with open(config_file, 'w') as f:
                json.dump(config, f, indent=2)
        except (PermissionError, OSError) as e:
            logger.error(f"Error saving config: {e}")

    def setup_ui(self):
        """Setup the user interface"""
        style = ttk.Style()
        style.theme_use('clam')

        # Configure colors
        style.configure('TFrame', background='#1e1e2e')
        style.configure('TLabel', background='#1e1e2e', foreground='#cdd6f4')
        style.configure('Header.TLabel', font=('Segoe UI', 16, 'bold'), foreground='#cba6f7')

        # Header
        header_frame = ttk.Frame(self.root)
        header_frame.pack(fill='x', padx=20, pady=10)

        title = ttk.Label(header_frame, text="🚀 HashNHedge Smart Miner", style='Header.TLabel')
        title.pack(side='left')

        version = ttk.Label(header_frame, text="v3.0 - FOSS Backend Edition", foreground='#89dceb')
        version.pack(side='left', padx=10)

        # Main container
        main_container = ttk.Frame(self.root)
        main_container.pack(fill='both', expand=True, padx=20, pady=10)

        # Left panel
        left_panel = ttk.Frame(main_container)
        left_panel.pack(side='left', fill='both', expand=True, padx=(0, 10))

        self.create_status_card(left_panel)
        self.create_stats_grid(left_panel)
        self.create_gpu_stats(left_panel)

        # Right panel
        right_panel = ttk.Frame(main_container)
        right_panel.pack(side='right', fill='both', expand=True)

        self.create_backend_selector(right_panel)
        self.create_controls(right_panel)
        self.create_wallet_config(right_panel)
        self.create_activity_log(right_panel)

        # Bottom status bar
        self.create_status_bar()

    def create_card(self, parent, title):
        """Create a styled card container"""
        card = tk.Frame(parent, bg='#313244', relief='raised', bd=2)
        card.pack(fill='x', pady=5)

        title_label = tk.Label(card, text=title, font=('Segoe UI', 12, 'bold'),
                               bg='#313244', fg='#cba6f7', anchor='w')
        title_label.pack(fill='x', padx=10, pady=5)

        content = tk.Frame(card, bg='#313244')
        content.pack(fill='both', expand=True, padx=10, pady=5)

        return content

    def create_status_card(self, parent):
        """Create mining status display"""
        content = self.create_card(parent, "⛏️ Mining Status")

        # Status indicator
        status_frame = tk.Frame(content, bg='#313244')
        status_frame.pack(fill='x', pady=5)

        self.status_indicator = tk.Canvas(status_frame, width=20, height=20, bg='#313244', highlightthickness=0)
        self.status_indicator.pack(side='left', padx=5)
        self.status_circle = self.status_indicator.create_oval(2, 2, 18, 18, fill='#f38ba8', outline='')

        self.status_label = tk.Label(status_frame, text="STOPPED", font=('Segoe UI', 14, 'bold'),
                                     bg='#313244', fg='#f38ba8')
        self.status_label.pack(side='left', padx=5)

        # Backend info
        info_frame = tk.Frame(content, bg='#313244')
        info_frame.pack(fill='x', pady=10)

        tk.Label(info_frame, text="Backend:", bg='#313244', fg='#cdd6f4').pack(anchor='w')
        self.backend_label = tk.Label(info_frame, text=self.current_backend.upper(),
                                     font=('Segoe UI', 18, 'bold'), bg='#313244', fg='#89b4fa')
        self.backend_label.pack(anchor='w')

        tk.Label(info_frame, text="Algorithm:", bg='#313244', fg='#cdd6f4').pack(anchor='w', pady=(10, 0))
        self.algorithm_label = tk.Label(info_frame, text=self.current_algorithm.upper(),
                                       font=('Segoe UI', 16), bg='#313244', fg='#f9e2af')
        self.algorithm_label.pack(anchor='w')

        tk.Label(info_frame, text="Uptime:", bg='#313244', fg='#cdd6f4').pack(anchor='w', pady=(10, 0))
        self.uptime_label = tk.Label(info_frame, text="0h 0m 0s", font=('Segoe UI', 14),
                                    bg='#313244', fg='#89dceb')
        self.uptime_label.pack(anchor='w')

    def create_stats_grid(self, parent):
        """Create performance statistics grid"""
        content = self.create_card(parent, "📊 Performance Statistics")

        grid = tk.Frame(content, bg='#313244')
        grid.pack(fill='both', expand=True)

        for i in range(3):
            grid.columnconfigure(i, weight=1)

        stats = [
            ("Hashrate", "hashrate", "0 MH/s"),
            ("Accepted", "accepted", "0"),
            ("Rejected", "rejected", "0"),
            ("Efficiency", "efficiency", "0%"),
            ("Avg Hashrate", "avg_hashrate", "0 MH/s"),
            ("Power Usage", "power", "0 W")
        ]

        self.stat_labels = {}
        for idx, (label, key, default) in enumerate(stats):
            row = idx // 3
            col = idx % 3

            stat_frame = tk.Frame(grid, bg='#45475a', relief='raised', bd=1)
            stat_frame.grid(row=row, column=col, padx=5, pady=5, sticky='nsew')

            tk.Label(stat_frame, text=label, bg='#45475a', fg='#bac2de',
                    font=('Segoe UI', 9)).pack(pady=(5, 0))

            value_label = tk.Label(stat_frame, text=default, bg='#45475a', fg='#a6e3a1',
                                  font=('Segoe UI', 16, 'bold'))
            value_label.pack(pady=(0, 5))

            self.stat_labels[key] = value_label

    def create_gpu_stats(self, parent):
        """Create GPU statistics display"""
        content = self.create_card(parent, "🎮 GPU Statistics")

        gpu_grid = tk.Frame(content, bg='#313244')
        gpu_grid.pack(fill='both', expand=True)

        self.gpu_name_label = tk.Label(gpu_grid, text="Detecting GPU...", bg='#313244',
                                       fg='#89b4fa', font=('Segoe UI', 11, 'bold'))
        self.gpu_name_label.pack(anchor='w', pady=5)

        gpu_stats_frame = tk.Frame(gpu_grid, bg='#313244')
        gpu_stats_frame.pack(fill='x')

        # Temperature
        temp_frame = tk.Frame(gpu_stats_frame, bg='#45475a', relief='raised', bd=1)
        temp_frame.pack(side='left', fill='both', expand=True, padx=2, pady=2)
        tk.Label(temp_frame, text="Temperature", bg='#45475a', fg='#bac2de').pack(pady=2)
        self.gpu_temp_label = tk.Label(temp_frame, text="0°C", bg='#45475a', fg='#fab387',
                                      font=('Segoe UI', 14, 'bold'))
        self.gpu_temp_label.pack(pady=2)

        # Fan Speed
        fan_frame = tk.Frame(gpu_stats_frame, bg='#45475a', relief='raised', bd=1)
        fan_frame.pack(side='left', fill='both', expand=True, padx=2, pady=2)
        tk.Label(fan_frame, text="Fan Speed", bg='#45475a', fg='#bac2de').pack(pady=2)
        self.gpu_fan_label = tk.Label(fan_frame, text="0%", bg='#45475a', fg='#89dceb',
                                     font=('Segoe UI', 14, 'bold'))
        self.gpu_fan_label.pack(pady=2)

        # Power Draw
        power_frame = tk.Frame(gpu_stats_frame, bg='#45475a', relief='raised', bd=1)
        power_frame.pack(side='left', fill='both', expand=True, padx=2, pady=2)
        tk.Label(power_frame, text="Power Draw", bg='#45475a', fg='#bac2de').pack(pady=2)
        self.gpu_power_label = tk.Label(power_frame, text="0 W", bg='#45475a', fg='#a6e3a1',
                                       font=('Segoe UI', 14, 'bold'))
        self.gpu_power_label.pack(pady=2)

    def create_backend_selector(self, parent):
        """Create backend selection interface"""
        content = self.create_card(parent, "🔧 Miner Backend")

        # Backend dropdown
        tk.Label(content, text="Select Backend:", bg='#313244', fg='#cdd6f4').pack(anchor='w', pady=(5, 0))

        backends = self.miner_manager.get_available_backends()
        self.backend_var = tk.StringVar(value=self.current_backend)

        backend_dropdown = ttk.Combobox(content, textvariable=self.backend_var,
                                       values=backends, state='readonly')
        backend_dropdown.pack(fill='x', pady=5)
        backend_dropdown.bind('<<ComboboxSelected>>', self.on_backend_changed)

        # Algorithm selection
        tk.Label(content, text="Algorithm:", bg='#313244', fg='#cdd6f4').pack(anchor='w', pady=(10, 0))

        algorithms = {
            'ethminer': ['ethash', 'etchash'],
            'xmrig': ['randomx', 'kawpow'],
            't-rex': ['ethash', 'etchash', 'kawpow', 'autolykos2', 'firopow'],
            'lolminer': ['ETHASH', 'ETCHASH', 'AUTOLYKOS2', 'TON']
        }

        self.algo_var = tk.StringVar(value=self.current_algorithm)
        self.algo_dropdown = ttk.Combobox(content, textvariable=self.algo_var,
                                         values=algorithms.get(self.current_backend, []),
                                         state='readonly')
        self.algo_dropdown.pack(fill='x', pady=5)

        # Store algorithms dict
        self.algorithms_map = algorithms

    def on_backend_changed(self, event=None):
        """Handle backend selection change"""
        new_backend = self.backend_var.get()
        self.current_backend = new_backend
        self.backend_label.config(text=new_backend.upper())

        # Update algorithm dropdown
        algos = self.algorithms_map.get(new_backend, [])
        self.algo_dropdown['values'] = algos
        if algos:
            self.algo_var.set(algos[0])
            self.current_algorithm = algos[0]

        self.add_log(f"Backend changed to: {new_backend}")

    def create_controls(self, parent):
        """Create control buttons"""
        content = self.create_card(parent, "🎮 Controls")

        btn_frame = tk.Frame(content, bg='#313244')
        btn_frame.pack(fill='x', pady=5)

        # Start button
        self.start_btn = tk.Button(btn_frame, text="▶ START MINING", command=self.start_mining,
                                   bg='#a6e3a1', fg='#1e1e2e', font=('Segoe UI', 12, 'bold'),
                                   relief='raised', bd=3, cursor='hand2', padx=20, pady=10)
        self.start_btn.pack(fill='x', pady=2)

        # Stop button
        self.stop_btn = tk.Button(btn_frame, text="⏹ STOP MINING", command=self.stop_mining,
                                 bg='#f38ba8', fg='#1e1e2e', font=('Segoe UI', 12, 'bold'),
                                 relief='raised', bd=3, cursor='hand2', padx=20, pady=10,
                                 state='disabled')
        self.stop_btn.pack(fill='x', pady=2)

    def create_wallet_config(self, parent):
        """Create wallet configuration"""
        content = self.create_card(parent, "💰 Wallet Configuration")

        tk.Label(content, text="Wallet Address:", bg='#313244', fg='#cdd6f4').pack(anchor='w', pady=(5, 0))
        self.wallet_entry = tk.Entry(content, bg='#45475a', fg='#cdd6f4', font=('Segoe UI', 10),
                                     insertbackground='#cdd6f4', relief='flat', bd=5)
        self.wallet_entry.pack(fill='x', pady=2)
        self.wallet_entry.insert(0, self.wallet_address)

        tk.Label(content, text="Worker Name:", bg='#313244', fg='#cdd6f4').pack(anchor='w', pady=(10, 0))
        self.worker_entry = tk.Entry(content, bg='#45475a', fg='#cdd6f4', font=('Segoe UI', 10),
                                     insertbackground='#cdd6f4', relief='flat', bd=5)
        self.worker_entry.pack(fill='x', pady=2)
        self.worker_entry.insert(0, self.worker_name)

        tk.Label(content, text="Pool URL:", bg='#313244', fg='#cdd6f4').pack(anchor='w', pady=(10, 0))
        self.pool_entry = tk.Entry(content, bg='#45475a', fg='#cdd6f4', font=('Segoe UI', 10),
                                   insertbackground='#cdd6f4', relief='flat', bd=5)
        self.pool_entry.pack(fill='x', pady=2)
        self.pool_entry.insert(0, self.pool_url)

        save_btn = tk.Button(content, text="💾 Save Configuration", command=self.save_wallet_config,
                           bg='#89dceb', fg='#1e1e2e', font=('Segoe UI', 10, 'bold'),
                           relief='raised', bd=2, cursor='hand2', pady=5)
        save_btn.pack(fill='x', pady=10)

    def create_activity_log(self, parent):
        """Create activity log"""
        content = self.create_card(parent, "📝 Activity Log")

        self.log_text = scrolledtext.ScrolledText(content, bg='#181825', fg='#cdd6f4',
                                                  font=('Consolas', 9), relief='flat',
                                                  height=12, wrap='word')
        self.log_text.pack(fill='both', expand=True)

        self.add_log("HashNHedge FOSS Miner GUI started")
        self.add_log(f"System: {platform.system()} {platform.release()}")
        self.add_log(f"Available backends: {', '.join(self.miner_manager.get_available_backends())}")
        self.detect_gpu()

    def create_status_bar(self):
        """Create bottom status bar"""
        status_bar = tk.Frame(self.root, bg='#11111b', relief='sunken', bd=1)
        status_bar.pack(side='bottom', fill='x')

        self.status_bar_label = tk.Label(status_bar, text="Ready", bg='#11111b', fg='#a6e3a1',
                                         font=('Segoe UI', 9), anchor='w')
        self.status_bar_label.pack(side='left', padx=10, pady=2)

        self.conn_indicator = tk.Label(status_bar, text="● Offline", bg='#11111b', fg='#f38ba8',
                                      font=('Segoe UI', 9))
        self.conn_indicator.pack(side='right', padx=10)

    def add_log(self, message):
        """Add entry to activity log"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.log_text.insert('end', f"[{timestamp}] {message}\n")
        self.log_text.see('end')
        self.log_text.update()

    def detect_gpu(self):
        """Detect GPU information"""
        try:
            import subprocess
            result = subprocess.run(['nvidia-smi', '--query-gpu=name', '--format=csv,noheader'],
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                gpu_name = result.stdout.strip()
                self.gpu_name_label.config(text=f"🎮 {gpu_name}")
                self.add_log(f"Detected GPU: {gpu_name}")
                return
        except (FileNotFoundError, subprocess.TimeoutExpired, OSError) as e:
            logger.debug(f"Could not detect GPU via nvidia-smi: {e}")

        self.gpu_name_label.config(text="🎮 GPU Detected (Generic)")
        self.add_log("GPU detected (using generic mode)")

    def update_gpu_stats(self):
        """Update GPU statistics"""
        if not self.mining:
            return

        try:
            import subprocess
            result = subprocess.run([
                'nvidia-smi',
                '--query-gpu=temperature.gpu,fan.speed,power.draw',
                '--format=csv,noheader,nounits'
            ], capture_output=True, text=True, timeout=5)

            if result.returncode == 0:
                temp, fan, power = result.stdout.strip().split(', ')

                self.gpu_temp = int(float(temp))
                self.gpu_fan = int(float(fan))
                self.gpu_power = int(float(power))

                self.gpu_temp_label.config(text=f"{self.gpu_temp}°C")
                self.gpu_fan_label.config(text=f"{self.gpu_fan}%")
                self.gpu_power_label.config(text=f"{self.gpu_power} W")

                if self.gpu_temp > 80:
                    self.gpu_temp_label.config(fg='#f38ba8')
                elif self.gpu_temp > 70:
                    self.gpu_temp_label.config(fg='#fab387')
                else:
                    self.gpu_temp_label.config(fg='#a6e3a1')
        except (FileNotFoundError, subprocess.TimeoutExpired, OSError, ValueError) as e:
            logger.debug(f"Could not update GPU stats: {e}")

    def save_wallet_config(self):
        """Save wallet configuration"""
        self.wallet_address = self.wallet_entry.get().strip()
        self.worker_name = self.worker_entry.get().strip()
        self.pool_url = self.pool_entry.get().strip()

        self.save_config()
        self.add_log("Configuration saved")
        messagebox.showinfo("Success", "Configuration saved successfully!")

    def start_mining(self):
        """Start mining process"""
        if not self.wallet_address:
            messagebox.showerror("Error", "Please enter a wallet address first!")
            return

        # Validate inputs before starting
        from miner_backends import InputValidator
        try:
            InputValidator.validate_ethereum_address(self.wallet_address)
            InputValidator.validate_pool_url(self.pool_url)
            InputValidator.validate_worker_name(self.worker_name)
        except ValidationError as e:
            messagebox.showerror("Validation Error", str(e))
            self.add_log(f"Validation failed: {e}")
            return

        self.current_algorithm = self.algo_var.get()

        self.add_log(f"Starting {self.current_backend} with {self.current_algorithm}...")

        # Start the actual miner backend
        success = self.miner_manager.start_miner(
            backend_name=self.current_backend,
            pool_url=self.pool_url,
            wallet=self.wallet_address,
            worker=self.worker_name,
            algorithm=self.current_algorithm
        )

        if success:
            self.mining = True
            self.start_time = datetime.now()

            # Update UI
            self.start_btn.config(state='disabled')
            self.stop_btn.config(state='normal')
            self.status_label.config(text="MINING", fg='#a6e3a1')
            self.status_indicator.itemconfig(self.status_circle, fill='#a6e3a1')
            self.conn_indicator.config(text="● Online", fg='#a6e3a1')

            self.add_log(f"Mining started with {self.current_backend}")
            self.add_log(f"Pool: {self.pool_url}")
            self.add_log(f"Algorithm: {self.current_algorithm}")

            self.status_bar_label.config(text="Mining in progress...")
        else:
            self.add_log(f"ERROR: Failed to start {self.current_backend}")
            messagebox.showerror("Error", f"Failed to start miner. Check if {self.current_backend} is installed.")

    def stop_mining(self):
        """Stop mining process"""
        self.add_log("Stopping miner...")

        success = self.miner_manager.stop_miner()

        self.mining = False

        # Update UI
        self.start_btn.config(state='normal')
        self.stop_btn.config(state='disabled')
        self.status_label.config(text="STOPPED", fg='#f38ba8')
        self.status_indicator.itemconfig(self.status_circle, fill='#f38ba8')
        self.conn_indicator.config(text="● Offline", fg='#f38ba8')

        if success:
            self.add_log("Mining stopped successfully")
        else:
            self.add_log("Miner stopped (may have been crashed)")

        self.status_bar_label.config(text="Ready")

    def monitor_loop(self):
        """Background monitoring thread"""
        while True:
            try:
                if self.mining:
                    # Update uptime
                    if self.start_time:
                        elapsed = datetime.now() - self.start_time
                        hours = int(elapsed.total_seconds() // 3600)
                        minutes = int((elapsed.total_seconds() % 3600) // 60)
                        seconds = int(elapsed.total_seconds() % 60)
                        self.uptime_label.config(text=f"{hours}h {minutes}m {seconds}s")

                    # Get real stats from miner backend
                    stats = self.miner_manager.get_stats()

                    hashrate = stats.get('hashrate', 0.0)
                    accepted = stats.get('accepted_shares', 0)
                    rejected = stats.get('rejected_shares', 0)

                    # Update stats
                    self.stat_labels['hashrate'].config(text=f"{hashrate:.2f} MH/s")
                    self.stat_labels['accepted'].config(text=str(accepted))
                    self.stat_labels['rejected'].config(text=str(rejected))

                    total_shares = accepted + rejected
                    efficiency = (accepted / max(total_shares, 1)) * 100
                    self.stat_labels['efficiency'].config(text=f"{efficiency:.1f}%")

                    # Track hashrate history (deque auto-manages size)
                    self.hashrate_history.append(hashrate)

                    avg_hashrate = sum(self.hashrate_history) / max(len(self.hashrate_history), 1)
                    self.stat_labels['avg_hashrate'].config(text=f"{avg_hashrate:.2f} MH/s")

                    self.stat_labels['power'].config(text=f"{self.gpu_power} W")

                    # Update GPU stats
                    self.update_gpu_stats()

                time.sleep(3)  # Reduced from 1s to 3s for efficiency
            except Exception as e:
                logger.error(f"Monitor error: {e}", exc_info=True)
                time.sleep(3)


def main():
    root = tk.Tk()
    app = EnhancedMinerGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
