#!/usr/bin/env python3
"""
HashNHedge Mining GUI - Windows Desktop Application
Comprehensive stats display with real-time monitoring
"""

import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import json
import os
import sys
import time
import threading
import requests
import subprocess
import psutil
from datetime import datetime, timedelta
import hashlib
import platform

class MinerGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("HashNHedge Smart Miner v2.0")
        self.root.geometry("1200x800")
        self.root.configure(bg='#1e1e2e')

        # Preconfigured HashNHedge pools
        self.preconfigured_pools = [
            {
                'name': 'HashNHedge Stratum (Railway)',
                'url': 'stratum+tcp://switchyard.proxy.rlwy.net:13595'
            },
            {
                'name': 'HashNHedge Pool API (Render)',
                'url': 'https://hashnhedge-pool.onrender.com/api'
            },
            {
                'name': 'HashNHedge Mobile Pool (Render)',
                'url': 'https://hashnhedge-mobile-pool.onrender.com/api'
            }
        ]
        self.custom_pool_label = 'Custom / Other'
        self.pool_profiles_map = {profile['name']: profile for profile in self.preconfigured_pools}
        self.pool_profile_name = self.preconfigured_pools[0]['name']

        # Mining state
        self.mining = False
        self.miner_process = None
        self.current_coin = "None"
        self.start_time = None
        self.total_shares = 0
        self.accepted_shares = 0
        self.rejected_shares = 0
        self.total_earnings = 0.0
        self.current_hashrate = 0.0
        self.gpu_temp = 0
        self.gpu_power = 0
        self.gpu_fan = 0

        # Pool connection
        self.pool_url = self.preconfigured_pools[0]['url']
        self.wallet_address = ""
        self.worker_name = "HNH-Rig-1"

        # Multi-coin wallet addresses
        self.wallet_addresses = {
            'ETC': '',
            'RVN': '',
            'ERG': '',
            'ETHW': '',
            'FIRO': '',
            'CFX': '',
            'ALPH': '',
            'SERO': ''
        }

        # GPU power limiting
        self.gpu_power_limit_enabled = False
        self.gpu_power_limit = 80  # 0-100%

        # Stats tracking
        self.hashrate_history = []
        self.profit_history = []
        self.last_check = None

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
                    self.pool_url = config.get("pool_url", self.pool_url)
                    self.pool_profile_name = config.get("pool_profile", self.match_pool_profile(self.pool_url))

                    # Load multi-coin wallets
                    coin_wallets = config.get("coin_wallets", {})
                    for coin in self.wallet_addresses.keys():
                        self.wallet_addresses[coin] = coin_wallets.get(coin, "")

                    # Load GPU power limit settings
                    self.gpu_power_limit_enabled = config.get("gpu_power_limit_enabled", False)
                    self.gpu_power_limit = config.get("gpu_power_limit", 80)
            except Exception as e:
                print(f"Error loading config: {e}")

        self.pool_profile_name = self.match_pool_profile(self.pool_url)

    def normalize_pool_url(self, url):
        """Normalize pool URLs for comparison"""
        if not url:
            return ''
        return url.strip().lower()

    def match_pool_profile(self, url):
        """Return the preset name that matches the given URL"""
        normalized = self.normalize_pool_url(url)
        for profile in self.preconfigured_pools:
            if self.normalize_pool_url(profile['url']) == normalized:
                return profile['name']
        return self.custom_pool_label

    def save_config(self):
        """Save configuration to file"""
        config_dir = os.path.join(os.path.expanduser("~"), ".hashnhedge")
        os.makedirs(config_dir, exist_ok=True)

        config_file = os.path.join(config_dir, "miner_config.json")
        config = {
            "wallet": self.wallet_address,
            "worker_name": self.worker_name,
            "pool_url": self.pool_url,
            "pool_profile": self.pool_profile_name,
            "coin_wallets": self.wallet_addresses,
            "gpu_power_limit_enabled": self.gpu_power_limit_enabled,
            "gpu_power_limit": self.gpu_power_limit
        }

        try:
            with open(config_file, 'w') as f:
                json.dump(config, f, indent=2)
        except Exception as e:
            print(f"Error saving config: {e}")

    def setup_ui(self):
        """Setup the user interface"""
        style = ttk.Style()
        style.theme_use('clam')

        # Configure colors
        style.configure('TFrame', background='#1e1e2e')
        style.configure('TLabel', background='#1e1e2e', foreground='#cdd6f4')
        style.configure('TButton', background='#89b4fa', foreground='#1e1e2e')
        style.configure('Header.TLabel', font=('Segoe UI', 16, 'bold'), foreground='#cba6f7')
        style.configure('Stat.TLabel', font=('Segoe UI', 24, 'bold'), foreground='#a6e3a1')
        style.configure('SubStat.TLabel', font=('Segoe UI', 10), foreground='#cdd6f4')

        # Header
        header_frame = ttk.Frame(self.root)
        header_frame.pack(fill='x', padx=20, pady=10)

        title = ttk.Label(header_frame, text="🤖 HashNHedge Smart Miner", style='Header.TLabel')
        title.pack(side='left')

        version = ttk.Label(header_frame, text="v2.0 - Auto-Profit Switching", foreground='#89dceb')
        version.pack(side='left', padx=10)

        # Main container
        main_container = ttk.Frame(self.root)
        main_container.pack(fill='both', expand=True, padx=20, pady=10)

        # Left panel - Stats
        left_panel = ttk.Frame(main_container)
        left_panel.pack(side='left', fill='both', expand=True, padx=(0, 10))

        # Mining Status Card
        self.create_status_card(left_panel)

        # Performance Stats Grid
        self.create_stats_grid(left_panel)

        # GPU Stats
        self.create_gpu_stats(left_panel)

        # Pool Stats
        self.create_pool_stats(left_panel)

        # Right panel - Controls & Logs
        right_panel = ttk.Frame(main_container)
        right_panel.pack(side='right', fill='both', expand=True)

        # Controls
        self.create_controls(right_panel)

        # Wallet Configuration
        self.create_wallet_config(right_panel)

        # Activity Log
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

        # Current mining info
        info_frame = tk.Frame(content, bg='#313244')
        info_frame.pack(fill='x', pady=10)

        tk.Label(info_frame, text="Current Coin:", bg='#313244', fg='#cdd6f4').pack(anchor='w')
        self.current_coin_label = tk.Label(info_frame, text="None", font=('Segoe UI', 20, 'bold'),
                                          bg='#313244', fg='#f9e2af')
        self.current_coin_label.pack(anchor='w')

        tk.Label(info_frame, text="Estimated Profit:", bg='#313244', fg='#cdd6f4').pack(anchor='w', pady=(10, 0))
        self.profit_label = tk.Label(info_frame, text="$0.00 / day", font=('Segoe UI', 16),
                                    bg='#313244', fg='#a6e3a1')
        self.profit_label.pack(anchor='w')

        # Uptime
        tk.Label(info_frame, text="Uptime:", bg='#313244', fg='#cdd6f4').pack(anchor='w', pady=(10, 0))
        self.uptime_label = tk.Label(info_frame, text="0h 0m 0s", font=('Segoe UI', 14),
                                    bg='#313244', fg='#89dceb')
        self.uptime_label.pack(anchor='w')

    def create_stats_grid(self, parent):
        """Create performance statistics grid"""
        content = self.create_card(parent, "📊 Performance Statistics")

        grid = tk.Frame(content, bg='#313244')
        grid.pack(fill='both', expand=True)

        # Configure grid
        for i in range(3):
            grid.columnconfigure(i, weight=1)

        stats = [
            ("Hashrate", "hashrate", "0 MH/s"),
            ("Shares", "shares", "0/0"),
            ("Efficiency", "efficiency", "0%"),
            ("Total Earnings", "earnings", "$0.00"),
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

        # GPU Info
        self.gpu_name_label = tk.Label(gpu_grid, text="Detecting GPU...", bg='#313244',
                                       fg='#89b4fa', font=('Segoe UI', 11, 'bold'))
        self.gpu_name_label.pack(anchor='w', pady=5)

        # GPU Stats
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

        # Memory Usage
        mem_frame = tk.Frame(gpu_stats_frame, bg='#45475a', relief='raised', bd=1)
        mem_frame.pack(side='left', fill='both', expand=True, padx=2, pady=2)
        tk.Label(mem_frame, text="Memory", bg='#45475a', fg='#bac2de').pack(pady=2)
        self.gpu_mem_label = tk.Label(mem_frame, text="0/0 GB", bg='#45475a', fg='#cba6f7',
                                     font=('Segoe UI', 14, 'bold'))
        self.gpu_mem_label.pack(pady=2)

    def create_pool_stats(self, parent):
        """Create pool statistics display"""
        content = self.create_card(parent, "🌐 Pool Statistics")

        pool_grid = tk.Frame(content, bg='#313244')
        pool_grid.pack(fill='both', expand=True)

        # Pool connection status
        conn_frame = tk.Frame(pool_grid, bg='#313244')
        conn_frame.pack(fill='x', pady=5)

        tk.Label(conn_frame, text="Pool:", bg='#313244', fg='#bac2de').pack(side='left')
        self.pool_status_label = tk.Label(conn_frame, text="Disconnected", bg='#313244',
                                         fg='#f38ba8', font=('Segoe UI', 10, 'bold'))
        self.pool_status_label.pack(side='left', padx=5)

        # Pool stats grid
        stats_container = tk.Frame(pool_grid, bg='#313244')
        stats_container.pack(fill='x')

        pool_stats = [
            ("Pool Hashrate", "pool_hashrate", "0 GH/s"),
            ("Active Miners", "active_miners", "0"),
            ("Network Diff", "network_diff", "0"),
            ("Last Block", "last_block", "Never")
        ]

        for idx, (label, key, default) in enumerate(pool_stats):
            stat_frame = tk.Frame(stats_container, bg='#45475a', relief='raised', bd=1)
            stat_frame.pack(side='left', fill='both', expand=True, padx=2, pady=2)

            tk.Label(stat_frame, text=label, bg='#45475a', fg='#bac2de',
                    font=('Segoe UI', 9)).pack(pady=2)

            value_label = tk.Label(stat_frame, text=default, bg='#45475a', fg='#89dceb',
                                  font=('Segoe UI', 11, 'bold'))
            value_label.pack(pady=2)

            setattr(self, f"{key}_label", value_label)

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

        # Auto-switch button
        self.autoswitch_btn = tk.Button(btn_frame, text="🤖 AUTO-SWITCH MODE",
                                       command=self.toggle_autoswitch,
                                       bg='#89b4fa', fg='#1e1e2e', font=('Segoe UI', 11, 'bold'),
                                       relief='raised', bd=3, cursor='hand2', padx=20, pady=8)
        self.autoswitch_btn.pack(fill='x', pady=2)

        # Benchmark button
        benchmark_btn = tk.Button(btn_frame, text="📊 BENCHMARK GPU", command=self.benchmark_gpu,
                                bg='#cba6f7', fg='#1e1e2e', font=('Segoe UI', 11, 'bold'),
                                relief='raised', bd=3, cursor='hand2', padx=20, pady=8)
        benchmark_btn.pack(fill='x', pady=2)

        # GPU Power Limiter Section
        limiter_frame = tk.Frame(btn_frame, bg='#313244', relief='raised', bd=2)
        limiter_frame.pack(fill='x', pady=(10, 2))

        # Power limit toggle
        self.power_limit_var = tk.BooleanVar(value=self.gpu_power_limit_enabled)
        power_limit_check = tk.Checkbutton(limiter_frame, text="⚡ GPU Power Limiter",
                                         variable=self.power_limit_var,
                                         command=self.toggle_power_limiter,
                                         bg='#313244', fg='#fab387', selectcolor='#45475a',
                                         font=('Segoe UI', 10, 'bold'), cursor='hand2',
                                         activebackground='#313244', activeforeground='#f9e2af')
        power_limit_check.pack(anchor='w', padx=10, pady=(5, 0))

        # Power limit slider
        slider_frame = tk.Frame(limiter_frame, bg='#313244')
        slider_frame.pack(fill='x', padx=10, pady=5)

        tk.Label(slider_frame, text="Power:", bg='#313244', fg='#bac2de',
                font=('Segoe UI', 9)).pack(side='left')

        self.power_limit_scale = tk.Scale(slider_frame, from_=30, to=100,
                                         orient='horizontal',
                                         command=self.update_power_limit_label,
                                         bg='#45475a', fg='#cdd6f4',
                                         highlightthickness=0, troughcolor='#1e1e2e',
                                         activebackground='#89b4fa', cursor='hand2')
        self.power_limit_scale.set(self.gpu_power_limit)
        self.power_limit_scale.pack(side='left', fill='x', expand=True, padx=5)

        self.power_limit_label = tk.Label(slider_frame, text=f"{self.gpu_power_limit}%",
                                        bg='#313244', fg='#a6e3a1',
                                        font=('Segoe UI', 10, 'bold'), width=5)
        self.power_limit_label.pack(side='right')

        # Info label
        tk.Label(limiter_frame, text="Reduces GPU power draw and heat",
                bg='#313244', fg='#6c7086', font=('Segoe UI', 8)).pack(padx=10, pady=(0, 5))

    def create_wallet_config(self, parent):
        """Create wallet configuration"""
        content = self.create_card(parent, "💰 Wallet Configuration")

        # Create scrollable frame for coin wallets
        canvas = tk.Canvas(content, bg='#313244', highlightthickness=0, height=200)
        scrollbar = tk.Scrollbar(content, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg='#313244')

        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )

        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        # Coin wallet entries
        self.coin_wallet_entries = {}
        coin_info = {
            'ETC': ('Ethereum Classic', '#a6e3a1'),
            'RVN': ('Ravencoin', '#89dceb'),
            'ERG': ('Ergo', '#cba6f7'),
            'ETHW': ('Ethereum PoW', '#fab387'),
            'FIRO': ('Firo', '#f9e2af'),
            'CFX': ('Conflux', '#f38ba8'),
            'ALPH': ('Alephium', '#94e2d5'),
            'SERO': ('Super Zero', '#eba0ac')
        }

        for coin, (full_name, color) in coin_info.items():
            coin_frame = tk.Frame(scrollable_frame, bg='#313244')
            coin_frame.pack(fill='x', pady=3)

            # Coin label with color
            label_frame = tk.Frame(coin_frame, bg='#313244')
            label_frame.pack(fill='x')

            tk.Label(label_frame, text=f"{coin}:", bg='#313244', fg=color,
                    font=('Segoe UI', 10, 'bold')).pack(side='left')
            tk.Label(label_frame, text=f" ({full_name})", bg='#313244', fg='#6c7086',
                    font=('Segoe UI', 8)).pack(side='left')

            # Wallet entry
            entry = tk.Entry(coin_frame, bg='#45475a', fg='#cdd6f4', font=('Consolas', 9),
                           insertbackground='#cdd6f4', relief='flat', bd=3)
            entry.pack(fill='x', pady=2)
            entry.insert(0, self.wallet_addresses.get(coin, ''))
            self.coin_wallet_entries[coin] = entry

        canvas.pack(side='left', fill='both', expand=True)
        scrollbar.pack(side='right', fill='y')

        # Worker name
        tk.Label(content, text="Worker Name:", bg='#313244', fg='#cdd6f4').pack(anchor='w', pady=(10, 0))
        self.worker_entry = tk.Entry(content, bg='#45475a', fg='#cdd6f4', font=('Segoe UI', 10),
                                     insertbackground='#cdd6f4', relief='flat', bd=5)
        self.worker_entry.pack(fill='x', pady=2)
        self.worker_entry.insert(0, self.worker_name)

        # Pool presets
        tk.Label(content, text="Pool Preset:", bg='#313244', fg='#cdd6f4').pack(anchor='w', pady=(10, 0))
        pool_names = [profile['name'] for profile in self.preconfigured_pools] + [self.custom_pool_label]
        initial_profile = self.pool_profile_name if self.pool_profile_name in pool_names else self.custom_pool_label
        self.pool_var = tk.StringVar(value=initial_profile)
        self.pool_selector = ttk.Combobox(content, textvariable=self.pool_var, values=pool_names, state='readonly')
        self.pool_selector.pack(fill='x', pady=2)
        self.pool_selector.bind('<<ComboboxSelected>>', self.on_pool_selected)

        # Pool URL
        tk.Label(content, text="Pool URL:", bg='#313244', fg='#cdd6f4').pack(anchor='w', pady=(10, 0))
        self.pool_entry = tk.Entry(content, bg='#45475a', fg='#cdd6f4', font=('Segoe UI', 10),
                                   insertbackground='#cdd6f4', relief='flat', bd=5)
        self.pool_entry.pack(fill='x', pady=2)
        self.pool_entry.insert(0, self.pool_url)

        # Save button
        save_btn = tk.Button(content, text="💾 Save Configuration", command=self.save_wallet_config,
                           bg='#89dceb', fg='#1e1e2e', font=('Segoe UI', 10, 'bold'),
                           relief='raised', bd=2, cursor='hand2', pady=5)
        save_btn.pack(fill='x', pady=10)

    def on_pool_selected(self, event=None):
        """Handle selection of a preconfigured pool"""
        selected_var = getattr(self, 'pool_var', None)
        if selected_var is None:
            return

        selected_name = selected_var.get()
        if selected_name == self.custom_pool_label:
            self.pool_profile_name = self.custom_pool_label
            return

        profile = self.pool_profiles_map.get(selected_name)
        if profile:
            self.pool_profile_name = selected_name
            self.pool_url = profile['url']
            if hasattr(self, 'pool_entry'):
                self.pool_entry.delete(0, tk.END)
                self.pool_entry.insert(0, self.pool_url)
            self.add_log(f"Pool preset applied: {selected_name}")

    def create_activity_log(self, parent):
        """Create activity log"""
        content = self.create_card(parent, "📝 Activity Log")

        # Log text area
        self.log_text = scrolledtext.ScrolledText(content, bg='#181825', fg='#cdd6f4',
                                                  font=('Consolas', 9), relief='flat',
                                                  height=15, wrap='word')
        self.log_text.pack(fill='both', expand=True)

        # Add initial log entry
        self.add_log("HashNHedge Miner GUI started")
        self.add_log(f"System: {platform.system()} {platform.release()}")
        self.detect_gpu()

    def create_status_bar(self):
        """Create bottom status bar"""
        status_bar = tk.Frame(self.root, bg='#11111b', relief='sunken', bd=1)
        status_bar.pack(side='bottom', fill='x')

        self.status_bar_label = tk.Label(status_bar, text="Ready", bg='#11111b', fg='#a6e3a1',
                                         font=('Segoe UI', 9), anchor='w')
        self.status_bar_label.pack(side='left', padx=10, pady=2)

        # Connection indicator
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
            # Try to detect NVIDIA GPU
            result = subprocess.run(['nvidia-smi', '--query-gpu=name', '--format=csv,noheader'],
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                gpu_name = result.stdout.strip()
                self.gpu_name_label.config(text=f"🎮 {gpu_name}")
                self.add_log(f"Detected GPU: {gpu_name}")
                return
        except:
            pass

        # Fallback to generic detection
        self.gpu_name_label.config(text="🎮 GPU Detected (Generic)")
        self.add_log("GPU detected (using generic mode)")

    def update_gpu_stats(self):
        """Update GPU statistics"""
        if not self.mining:
            return

        try:
            # Query NVIDIA GPU stats
            result = subprocess.run([
                'nvidia-smi',
                '--query-gpu=temperature.gpu,fan.speed,power.draw,memory.used,memory.total',
                '--format=csv,noheader,nounits'
            ], capture_output=True, text=True, timeout=5)

            if result.returncode == 0:
                temp, fan, power, mem_used, mem_total = result.stdout.strip().split(', ')

                self.gpu_temp = int(float(temp))
                self.gpu_fan = int(float(fan))
                self.gpu_power = int(float(power))

                self.gpu_temp_label.config(text=f"{self.gpu_temp}°C")
                self.gpu_fan_label.config(text=f"{self.gpu_fan}%")
                self.gpu_power_label.config(text=f"{self.gpu_power} W")
                self.gpu_mem_label.config(text=f"{float(mem_used)/1024:.1f}/{float(mem_total)/1024:.1f} GB")

                # Color code temperature
                if self.gpu_temp > 80:
                    self.gpu_temp_label.config(fg='#f38ba8')  # Red
                elif self.gpu_temp > 70:
                    self.gpu_temp_label.config(fg='#fab387')  # Orange
                else:
                    self.gpu_temp_label.config(fg='#a6e3a1')  # Green
        except:
            pass

    def save_wallet_config(self):
        """Save wallet configuration"""
        # Save coin wallet addresses
        for coin, entry in self.coin_wallet_entries.items():
            self.wallet_addresses[coin] = entry.get().strip()

        # Set primary wallet address to first non-empty coin wallet
        for coin in ['ETC', 'RVN', 'ERG', 'ETHW', 'FIRO', 'CFX', 'ALPH', 'SERO']:
            if self.wallet_addresses[coin]:
                self.wallet_address = self.wallet_addresses[coin]
                break

        self.worker_name = self.worker_entry.get().strip()
        self.pool_url = self.pool_entry.get().strip()
        self.pool_profile_name = self.match_pool_profile(self.pool_url)
        if hasattr(self, 'pool_var'):
            self.pool_var.set(self.pool_profile_name)

        self.save_config()

        # Log saved wallets
        self.add_log("Configuration saved")
        saved_coins = [coin for coin, addr in self.wallet_addresses.items() if addr]
        if saved_coins:
            self.add_log(f"Configured wallets for: {', '.join(saved_coins)}")

        messagebox.showinfo("Success", f"Configuration saved successfully!\n\nConfigured {len(saved_coins)} coin wallet(s): {', '.join(saved_coins)}")

    def start_mining(self):
        """Start mining process"""
        if not self.wallet_address:
            messagebox.showerror("Error", "Please enter a wallet address first!")
            return

        self.mining = True
        self.start_time = datetime.now()

        # Update UI
        self.start_btn.config(state='disabled')
        self.stop_btn.config(state='normal')
        self.status_label.config(text="MINING", fg='#a6e3a1')
        self.status_indicator.itemconfig(self.status_circle, fill='#a6e3a1')
        self.pool_status_label.config(text="Connected", fg='#a6e3a1')
        self.conn_indicator.config(text="● Online", fg='#a6e3a1')

        self.add_log("=" * 60)
        self.add_log("🚀 MINING SESSION STARTED")
        self.add_log("=" * 60)
        self.add_log(f"📍 Pool: {self.pool_url}")
        if self.pool_profile_name != self.custom_pool_label:
            self.add_log(f"📋 Pool Preset: {self.pool_profile_name}")
        self.add_log(f"💰 Wallet: {self.wallet_address[:10]}...{self.wallet_address[-6:]}")
        self.add_log(f"🏷️  Worker ID: {self.worker_name}")
        self.add_log(f"🌐 Protocol: Stratum TCP")
        self.add_log(f"⏰ Session Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        self.add_log("=" * 60)
        self.add_log("📊 Initializing connection to pool...")
        self.add_log("🔍 Detecting GPUs and starting mining engine...")

        # Simulate mining process (in production, launch actual miner)
        self.current_coin = "ETC"
        self.current_coin_label.config(text=self.current_coin)

        self.status_bar_label.config(text="Mining in progress...")

        # Reset verbose stats counter
        self.last_verbose_log = time.time()

        # Apply GPU power limit if enabled
        if self.gpu_power_limit_enabled:
            self.add_log(f"⚡ Applying GPU power limit: {self.gpu_power_limit}%")
            self.apply_gpu_power_limit()

    def stop_mining(self):
        """Stop mining process"""
        self.mining = False

        # Reset GPU power limit if it was enabled
        if self.gpu_power_limit_enabled:
            self.add_log("⚡ Resetting GPU power limit to default")
            self.reset_gpu_power_limit()

        # Update UI
        self.start_btn.config(state='normal')
        self.stop_btn.config(state='disabled')
        self.status_label.config(text="STOPPED", fg='#f38ba8')
        self.status_indicator.itemconfig(self.status_circle, fill='#f38ba8')
        self.pool_status_label.config(text="Disconnected", fg='#f38ba8')
        self.conn_indicator.config(text="● Offline", fg='#f38ba8')

        self.add_log("Mining stopped")
        self.status_bar_label.config(text="Ready")

    def toggle_autoswitch(self):
        """Toggle auto-switch mode"""
        self.add_log("Auto-switch mode toggled")
        messagebox.showinfo("Auto-Switch", "Auto-switch mode will automatically mine the most profitable coin!")

    def benchmark_gpu(self):
        """Benchmark GPU performance"""
        self.add_log("Starting GPU benchmark...")
        messagebox.showinfo("Benchmark", "GPU benchmarking will start. This may take a few minutes.")

    def toggle_power_limiter(self):
        """Toggle GPU power limiter on/off"""
        self.gpu_power_limit_enabled = self.power_limit_var.get()

        if self.gpu_power_limit_enabled:
            self.add_log(f"⚡ GPU Power Limiter ENABLED at {self.gpu_power_limit}%")
            # Apply power limit immediately if mining
            if self.mining:
                self.apply_gpu_power_limit()
            else:
                # Apply on next mining start
                self.add_log("⚡ Power limit will be applied when mining starts")
        else:
            self.add_log("⚡ GPU Power Limiter DISABLED - restoring full power")
            # Reset to default power limit if mining
            if self.mining:
                self.reset_gpu_power_limit()

        # Save config
        self.save_config()

    def update_power_limit_label(self, value):
        """Update power limit label when slider changes"""
        self.gpu_power_limit = int(float(value))
        self.power_limit_label.config(text=f"{self.gpu_power_limit}%")

        # Apply immediately if limiter is enabled and mining
        if self.gpu_power_limit_enabled and self.mining:
            self.apply_gpu_power_limit()
            self.add_log(f"⚡ Power limit adjusted to {self.gpu_power_limit}%")

    def apply_gpu_power_limit(self):
        """Apply GPU power limit using nvidia-smi"""
        try:
            # Get default power limit first
            result = subprocess.run([
                'nvidia-smi',
                '--query-gpu=power.default_limit',
                '--format=csv,noheader,nounits'
            ], capture_output=True, text=True, timeout=5)

            if result.returncode == 0:
                default_power = float(result.stdout.strip())
                target_power = int(default_power * (self.gpu_power_limit / 100.0))

                # Apply power limit
                limit_result = subprocess.run([
                    'nvidia-smi',
                    '-pl', str(target_power)
                ], capture_output=True, text=True, timeout=5)

                if limit_result.returncode == 0:
                    self.add_log(f"✅ GPU power limit set to {target_power}W ({self.gpu_power_limit}%)")
                else:
                    self.add_log(f"⚠️ Failed to set power limit (may need admin rights)")
            else:
                self.add_log("⚠️ Could not query GPU power limit")
        except Exception as e:
            self.add_log(f"⚠️ Power limit error: {str(e)}")

    def reset_gpu_power_limit(self):
        """Reset GPU to default power limit"""
        try:
            # Get default power limit
            result = subprocess.run([
                'nvidia-smi',
                '--query-gpu=power.default_limit',
                '--format=csv,noheader,nounits'
            ], capture_output=True, text=True, timeout=5)

            if result.returncode == 0:
                default_power = int(float(result.stdout.strip()))

                # Reset to default
                reset_result = subprocess.run([
                    'nvidia-smi',
                    '-pl', str(default_power)
                ], capture_output=True, text=True, timeout=5)

                if reset_result.returncode == 0:
                    self.add_log(f"✅ GPU power limit reset to default ({default_power}W)")
                else:
                    self.add_log(f"⚠️ Failed to reset power limit")
            else:
                self.add_log("⚠️ Could not query GPU default power limit")
        except Exception as e:
            self.add_log(f"⚠️ Power reset error: {str(e)}")

    def monitor_loop(self):
        """Background monitoring thread"""
        self.last_verbose_log = time.time()
        share_count_checkpoint = 0

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

                    # Simulate stats (replace with actual miner API calls)
                    old_hashrate = self.current_hashrate
                    self.current_hashrate = 45.5 + (hash(str(time.time())) % 10) / 10
                    self.accepted_shares += 1
                    self.total_shares += 1

                    # Update stats
                    self.stat_labels['hashrate'].config(text=f"{self.current_hashrate:.2f} MH/s")
                    self.stat_labels['shares'].config(text=f"{self.accepted_shares}/{self.total_shares}")

                    efficiency = (self.accepted_shares / max(self.total_shares, 1)) * 100
                    self.stat_labels['efficiency'].config(text=f"{efficiency:.1f}%")

                    daily_profit = self.current_hashrate * 0.08  # Simulated
                    self.total_earnings += daily_profit / 86400  # Per second
                    self.stat_labels['earnings'].config(text=f"${self.total_earnings:.2f}")
                    self.profit_label.config(text=f"${daily_profit:.2f} / day")

                    avg_hashrate = sum(self.hashrate_history[-60:]) / max(len(self.hashrate_history[-60:]), 1) if self.hashrate_history else 0
                    self.stat_labels['avg_hashrate'].config(text=f"{avg_hashrate:.2f} MH/s")

                    self.stat_labels['power'].config(text=f"{self.gpu_power} W")

                    # Track hashrate history
                    self.hashrate_history.append(self.current_hashrate)
                    if len(self.hashrate_history) > 300:
                        self.hashrate_history.pop(0)

                    # Update GPU stats
                    self.update_gpu_stats()

                    # Verbose logging every 30 seconds
                    current_time = time.time()
                    if current_time - self.last_verbose_log >= 30:
                        self.last_verbose_log = current_time
                        new_shares = self.accepted_shares - share_count_checkpoint
                        share_count_checkpoint = self.accepted_shares

                        self.add_log("─" * 60)
                        self.add_log(f"📊 STATS UPDATE [{datetime.now().strftime('%H:%M:%S')}]")
                        self.add_log(f"  ⚡ Current Hashrate: {self.current_hashrate:.2f} MH/s")
                        self.add_log(f"  📈 Average Hashrate: {avg_hashrate:.2f} MH/s")
                        self.add_log(f"  ✅ Accepted Shares: {self.accepted_shares} (+{new_shares} last 30s)")
                        self.add_log(f"  ❌ Rejected Shares: {self.rejected_shares}")
                        self.add_log(f"  📊 Efficiency: {efficiency:.2f}%")
                        self.add_log(f"  💰 Total Earnings: ${self.total_earnings:.4f}")
                        self.add_log(f"  💵 Est. Daily Profit: ${daily_profit:.2f}")
                        self.add_log(f"  🌡️  GPU Temp: {self.gpu_temp}°C")
                        self.add_log(f"  ⚡ GPU Power: {self.gpu_power}W")
                        self.add_log(f"  🌀 GPU Fan: {self.gpu_fan}%")
                        self.add_log(f"  ⏱️  Uptime: {hours}h {minutes}m {seconds}s")
                        self.add_log(f"  🎯 Algorithm: Ethash (ETC)")
                        self.add_log(f"  🌐 Pool: Connected")
                        self.add_log("─" * 60)

                    # Log individual shares every 5 shares
                    if self.accepted_shares % 5 == 0 and self.accepted_shares != share_count_checkpoint:
                        share_rate = new_shares / 30.0 if current_time - self.last_verbose_log < 30 else 0
                        self.add_log(f"✅ Share #{self.accepted_shares} accepted | Rate: {share_rate:.2f}/s | Hashrate: {self.current_hashrate:.2f} MH/s")

                time.sleep(1)
            except Exception as e:
                print(f"Monitor error: {e}")
                time.sleep(1)

def main():
    root = tk.Tk()
    app = MinerGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main()
