#!/usr/bin/env python3
"""
HashNHedge Miner - All-in-One Mining Application
Simple GUI that downloads and runs T-Rex miner automatically
"""

import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import json
import os
import sys
import subprocess
import threading
import time
import requests
import zipfile
import platform
from pathlib import Path
from datetime import datetime

# Version
VERSION = "1.0.0"

class HashNHedgeMiner:
    def __init__(self, root):
        self.root = root
        self.root.title(f"HashNHedge Miner v{VERSION}")
        self.root.geometry("800x600")
        self.root.configure(bg='#1e1e2e')

        # Set window icon if available
        try:
            icon_path = self.get_resource_path('logo.ico')
            if os.path.exists(icon_path):
                self.root.iconbitmap(icon_path)
        except:
            pass

        # Mining state
        self.mining = False
        self.miner_process = None
        self.config_dir = Path.home() / ".hashnhedge"
        self.miner_dir = self.config_dir / "trex"
        self.config_file = self.config_dir / "config.json"

        # Stats
        self.hashrate = 0
        self.shares_accepted = 0
        self.shares_rejected = 0
        self.uptime = 0
        self.start_time = None

        # Create directories
        self.config_dir.mkdir(exist_ok=True)
        self.miner_dir.mkdir(exist_ok=True)

        # Load config
        self.config = self.load_config()

        # Setup UI
        self.setup_ui()

        # Check for miner
        self.check_miner_installed()

    def get_resource_path(self, relative_path):
        """Get absolute path to resource for PyInstaller"""
        try:
            base_path = sys._MEIPASS
        except Exception:
            base_path = os.path.abspath(".")
        return os.path.join(base_path, relative_path)

    def load_config(self):
        """Load saved configuration"""
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r') as f:
                    return json.load(f)
            except:
                pass
        return {
            "wallet": "",
            "worker": "rig1",
            "pool": "pool.hashnhedge.com:3333",
            "algorithm": "ethash",
            "coin": "etc"
        }

    def save_config(self):
        """Save configuration"""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(self.config, f, indent=2)
        except Exception as e:
            self.log(f"Error saving config: {e}")

    def setup_ui(self):
        """Setup user interface"""
        # Header
        header = tk.Frame(self.root, bg='#1e1e2e')
        header.pack(fill='x', padx=20, pady=10)

        title = tk.Label(header, text="⛏️ HashNHedge Miner",
                        font=('Segoe UI', 18, 'bold'),
                        bg='#1e1e2e', fg='#cba6f7')
        title.pack(side='left')

        version_label = tk.Label(header, text=f"v{VERSION}",
                                font=('Segoe UI', 10),
                                bg='#1e1e2e', fg='#89dceb')
        version_label.pack(side='left', padx=10)

        # Main container
        main = tk.Frame(self.root, bg='#1e1e2e')
        main.pack(fill='both', expand=True, padx=20, pady=10)

        # Configuration section
        config_frame = self.create_card(main, "⚙️ Configuration")
        config_frame.pack(fill='x', pady=(0, 10))

        # Wallet address
        tk.Label(config_frame, text="Wallet Address:",
                bg='#313244', fg='#cdd6f4').grid(row=0, column=0, sticky='w', pady=5)
        self.wallet_entry = tk.Entry(config_frame, width=50,
                                     bg='#45475a', fg='#cdd6f4',
                                     font=('Segoe UI', 10),
                                     insertbackground='#cdd6f4')
        self.wallet_entry.grid(row=0, column=1, sticky='ew', padx=10, pady=5)
        self.wallet_entry.insert(0, self.config.get('wallet', ''))

        # Worker name
        tk.Label(config_frame, text="Worker Name:",
                bg='#313244', fg='#cdd6f4').grid(row=1, column=0, sticky='w', pady=5)
        self.worker_entry = tk.Entry(config_frame, width=50,
                                     bg='#45475a', fg='#cdd6f4',
                                     font=('Segoe UI', 10),
                                     insertbackground='#cdd6f4')
        self.worker_entry.grid(row=1, column=1, sticky='ew', padx=10, pady=5)
        self.worker_entry.insert(0, self.config.get('worker', 'rig1'))

        # Algorithm
        tk.Label(config_frame, text="Algorithm:",
                bg='#313244', fg='#cdd6f4').grid(row=2, column=0, sticky='w', pady=5)
        self.algo_var = tk.StringVar(value=self.config.get('algorithm', 'ethash'))
        algo_combo = ttk.Combobox(config_frame, textvariable=self.algo_var,
                                  values=['ethash', 'kawpow', 'autolykos2', 'octopus'],
                                  state='readonly', width=47)
        algo_combo.grid(row=2, column=1, sticky='ew', padx=10, pady=5)

        config_frame.columnconfigure(1, weight=1)

        # Stats section
        stats_frame = self.create_card(main, "📊 Mining Statistics")
        stats_frame.pack(fill='x', pady=(0, 10))

        stats_grid = tk.Frame(stats_frame, bg='#313244')
        stats_grid.pack(fill='x', padx=10, pady=10)

        # Create stat displays
        self.stat_labels = {}
        stats = [
            ("Hashrate", "0 MH/s"),
            ("Accepted", "0"),
            ("Rejected", "0"),
            ("Uptime", "0h 0m")
        ]

        for idx, (label, default) in enumerate(stats):
            col = idx % 2
            row = idx // 2

            frame = tk.Frame(stats_grid, bg='#45475a', relief='raised', bd=1)
            frame.grid(row=row, column=col, padx=5, pady=5, sticky='nsew')

            tk.Label(frame, text=label, bg='#45475a', fg='#bac2de',
                    font=('Segoe UI', 9)).pack(pady=(5, 0))

            value_label = tk.Label(frame, text=default, bg='#45475a', fg='#a6e3a1',
                                  font=('Segoe UI', 14, 'bold'))
            value_label.pack(pady=(0, 5))

            self.stat_labels[label.lower()] = value_label

        for i in range(2):
            stats_grid.columnconfigure(i, weight=1)

        # Control buttons
        btn_frame = tk.Frame(main, bg='#1e1e2e')
        btn_frame.pack(fill='x', pady=(0, 10))

        self.start_btn = tk.Button(btn_frame, text="▶ START MINING",
                                   command=self.start_mining,
                                   bg='#a6e3a1', fg='#1e1e2e',
                                   font=('Segoe UI', 12, 'bold'),
                                   relief='raised', bd=3, cursor='hand2',
                                   padx=20, pady=10)
        self.start_btn.pack(side='left', fill='x', expand=True, padx=(0, 5))

        self.stop_btn = tk.Button(btn_frame, text="⏹ STOP MINING",
                                 command=self.stop_mining,
                                 bg='#f38ba8', fg='#1e1e2e',
                                 font=('Segoe UI', 12, 'bold'),
                                 relief='raised', bd=3, cursor='hand2',
                                 padx=20, pady=10, state='disabled')
        self.stop_btn.pack(side='left', fill='x', expand=True, padx=(5, 0))

        # Log section
        log_frame = self.create_card(main, "📝 Activity Log")
        log_frame.pack(fill='both', expand=True)

        self.log_text = scrolledtext.ScrolledText(log_frame, bg='#181825', fg='#cdd6f4',
                                                  font=('Consolas', 9), relief='flat',
                                                  height=10, wrap='word')
        self.log_text.pack(fill='both', expand=True, padx=10, pady=10)

        # Status bar
        self.status_bar = tk.Label(self.root, text="Ready to mine",
                                   bg='#11111b', fg='#a6e3a1',
                                   font=('Segoe UI', 9), anchor='w',
                                   relief='sunken', bd=1)
        self.status_bar.pack(side='bottom', fill='x', pady=(0, 0))

        # Initial log
        self.log("HashNHedge Miner started")
        self.log(f"System: {platform.system()} {platform.release()}")

    def create_card(self, parent, title):
        """Create a styled card container"""
        card = tk.Frame(parent, bg='#313244', relief='raised', bd=2)

        title_label = tk.Label(card, text=title, font=('Segoe UI', 11, 'bold'),
                              bg='#313244', fg='#cba6f7', anchor='w')
        title_label.pack(fill='x', padx=10, pady=5)

        content = tk.Frame(card, bg='#313244')
        content.pack(fill='both', expand=True)

        return content

    def log(self, message):
        """Add message to log"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.log_text.insert('end', f"[{timestamp}] {message}\n")
        self.log_text.see('end')
        self.log_text.update()

    def check_miner_installed(self):
        """Check if T-Rex miner is installed"""
        miner_exe = self.miner_dir / "t-rex.exe"

        if not miner_exe.exists():
            self.log("⚠️ T-Rex miner not found")
            self.status_bar.config(text="T-Rex miner needs to be downloaded", fg='#fab387')

            response = messagebox.askyesno(
                "Download T-Rex Miner",
                "T-Rex miner is required but not installed.\n\n"
                "Would you like to download it now?\n"
                "(~50MB download)",
                icon='question'
            )

            if response:
                self.download_miner()
            else:
                self.log("❌ Mining requires T-Rex miner")
                self.start_btn.config(state='disabled')
        else:
            self.log("✅ T-Rex miner found")
            self.status_bar.config(text="Ready to mine", fg='#a6e3a1')

    def download_miner(self):
        """Download T-Rex miner"""
        self.log("📥 Downloading T-Rex miner...")
        self.status_bar.config(text="Downloading T-Rex miner...", fg='#89dceb')
        self.start_btn.config(state='disabled')

        # Run download in thread
        thread = threading.Thread(target=self._download_miner_thread, daemon=True)
        thread.start()

    def _download_miner_thread(self):
        """Download miner in background thread"""
        try:
            # T-Rex download URL (Windows version)
            # Note: Replace with actual latest version
            url = "https://github.com/trexminer/T-Rex/releases/download/0.26.8/t-rex-0.26.8-win.zip"

            self.log(f"Downloading from GitHub...")
            response = requests.get(url, stream=True)
            response.raise_for_status()

            zip_path = self.miner_dir / "t-rex.zip"
            total_size = int(response.headers.get('content-length', 0))
            downloaded = 0

            with open(zip_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        progress = (downloaded / total_size) * 100 if total_size > 0 else 0
                        self.status_bar.config(text=f"Downloading: {progress:.1f}%")

            self.log("📦 Extracting T-Rex miner...")
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(self.miner_dir)

            zip_path.unlink()  # Delete zip file

            self.log("✅ T-Rex miner installed successfully!")
            self.status_bar.config(text="Ready to mine", fg='#a6e3a1')
            self.start_btn.config(state='normal')

            messagebox.showinfo("Success", "T-Rex miner downloaded successfully!\nYou can now start mining.")

        except Exception as e:
            self.log(f"❌ Download failed: {e}")
            self.status_bar.config(text="Download failed", fg='#f38ba8')
            messagebox.showerror("Download Failed",
                               f"Failed to download T-Rex miner:\n{e}\n\n"
                               "Please download manually from:\n"
                               "https://github.com/trexminer/T-Rex/releases")

    def start_mining(self):
        """Start mining process"""
        # Validate wallet address
        wallet = self.wallet_entry.get().strip()
        if not wallet:
            messagebox.showerror("Error", "Please enter your wallet address!")
            return

        # Check miner exists
        miner_exe = self.miner_dir / "t-rex.exe"
        if not miner_exe.exists():
            messagebox.showerror("Error", "T-Rex miner not found! Please download it first.")
            return

        # Save config
        self.config['wallet'] = wallet
        self.config['worker'] = self.worker_entry.get().strip()
        self.config['algorithm'] = self.algo_var.get()
        self.save_config()

        # Create config for T-Rex
        trex_config = {
            "pools": [{
                "user": f"{wallet}.{self.config['worker']}",
                "url": f"stratum+tcp://{self.config['pool']}",
                "pass": "x"
            }],
            "algo": self.config['algorithm'],
            "coin": self.config.get('coin', 'etc'),
            "api-bind-http": "127.0.0.1:4067",
            "intensity": 22,
            "no-watchdog": False,
            "protocol-dump": False,
            "log-path": str(self.miner_dir / "trex.log")
        }

        config_path = self.miner_dir / "config.json"
        with open(config_path, 'w') as f:
            json.dump(trex_config, f, indent=2)

        # Start T-Rex
        self.log("🚀 Starting T-Rex miner...")
        self.log(f"Pool: {self.config['pool']}")
        self.log(f"Wallet: {wallet[:10]}...{wallet[-6:]}")
        self.log(f"Worker: {self.config['worker']}")
        self.log(f"Algorithm: {self.config['algorithm']}")

        try:
            self.miner_process = subprocess.Popen(
                [str(miner_exe), "-c", str(config_path)],
                cwd=str(self.miner_dir),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=subprocess.CREATE_NO_WINDOW if platform.system() == 'Windows' else 0
            )

            self.mining = True
            self.start_time = time.time()
            self.start_btn.config(state='disabled')
            self.stop_btn.config(state='normal')
            self.status_bar.config(text="Mining in progress...", fg='#a6e3a1')

            # Start stats updater
            self.update_stats()

            self.log("✅ Mining started successfully!")

        except Exception as e:
            self.log(f"❌ Failed to start miner: {e}")
            messagebox.showerror("Error", f"Failed to start miner:\n{e}")

    def stop_mining(self):
        """Stop mining process"""
        self.log("⏹ Stopping miner...")
        self.mining = False

        if self.miner_process:
            try:
                self.miner_process.terminate()
                self.miner_process.wait(timeout=5)
            except:
                self.miner_process.kill()

            self.miner_process = None

        self.start_btn.config(state='normal')
        self.stop_btn.config(state='disabled')
        self.status_bar.config(text="Mining stopped", fg='#fab387')
        self.log("✅ Mining stopped")

    def update_stats(self):
        """Update mining statistics from T-Rex API"""
        if not self.mining:
            return

        try:
            # Query T-Rex API
            response = requests.get("http://127.0.0.1:4067/summary", timeout=2)
            if response.status_code == 200:
                data = response.json()

                # Update hashrate
                hashrate_raw = data.get('hashrate', 0)
                hashrate_mhs = hashrate_raw / 1_000_000  # Convert to MH/s
                self.stat_labels['hashrate'].config(text=f"{hashrate_mhs:.2f} MH/s")

                # Update shares
                accepted = data.get('accepted_count', 0)
                rejected = data.get('rejected_count', 0)
                self.stat_labels['accepted'].config(text=str(accepted))
                self.stat_labels['rejected'].config(text=str(rejected))

                # Update uptime
                if self.start_time:
                    uptime_sec = int(time.time() - self.start_time)
                    hours = uptime_sec // 3600
                    minutes = (uptime_sec % 3600) // 60
                    self.stat_labels['uptime'].config(text=f"{hours}h {minutes}m")

        except requests.exceptions.RequestException:
            # API not ready yet or miner not started
            pass
        except Exception as e:
            self.log(f"Stats error: {e}")

        # Schedule next update
        if self.mining:
            self.root.after(2000, self.update_stats)

    def on_closing(self):
        """Handle window close"""
        if self.mining:
            response = messagebox.askyesno(
                "Confirm Exit",
                "Mining is in progress. Do you want to stop mining and exit?"
            )
            if not response:
                return

            self.stop_mining()

        self.root.destroy()

def main():
    root = tk.Tk()
    app = HashNHedgeMiner(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    root.mainloop()

if __name__ == "__main__":
    main()
