# -*- coding: utf-8 -*-
python

import telebot
from telebot import types
import time
import random

# Replace with your bot token from BotFather
BOT_TOKEN = '8490395336:AAFG_MKL9lx49rII4KfhQEiTc6FBzBh2HtU'
bot = telebot.TeleBot(BOT_TOKEN)

# Updated earnings data (2024 rates)
gpu_earnings = {
    'RTX 4090': '$650/month',
    'RTX 4080': '$525/month',
    'RTX 4070 Ti': '$450/month',
    'RTX 4070': '$380/month',
    'RTX 3090': '$495/month',
    'RTX 3080': '$420/month',
    'RTX 3070': '$285/month',
    'RTX 3060': '$195/month',
    'RX 7900 XTX': '$480/month',
    'RX 7800 XT': '$320/month',
    'RX 6800 XT': '$250/month',
    'Other GPU': '$75-650/month'
}

# Welcome message
@bot.message_handler(commands=['start'])
def send_welcome(message):
    markup = types.InlineKeyboardMarkup(row_width=2)
    
    btn1 = types.InlineKeyboardButton('💰 Calculate GPU Earnings', callback_data='calculate')
    btn2 = types.InlineKeyboardButton('📊 Live Network Stats', callback_data='stats')
    btn3 = types.InlineKeyboardButton('🚀 Start Mining Now', url='https://hashnhedge-pool.onrender.com')
    btn4 = types.InlineKeyboardButton('📱 Mobile Mining (ARMgeddon)', callback_data='mobile')
    btn5 = types.InlineKeyboardButton('🔒 Security Platform', callback_data='security')
    btn6 = types.InlineKeyboardButton('💬 Discord Community', url='https://discord.gg/hashnhedge')
    btn7 = types.InlineKeyboardButton('📄 Whitepaper', callback_data='whitepaper')
    btn8 = types.InlineKeyboardButton('❓ How It Works', callback_data='how')
    
    markup.add(btn1, btn2)
    markup.add(btn3, btn4)
    markup.add(btn5, btn6)
    markup.add(btn7, btn8)
    
    welcome_text = """
🚀 *Welcome to HashNHedge - The Future of GPU Monetization!*

Transform your gaming rig into a 24/7 profit machine!

💰 *Earn $75-650+ monthly per GPU*
🤖 *AI-powered smart task switching*
⚡ *Instant Solana blockchain payouts*
🌐 *Join 8,500+ active miners worldwide*
📱 *Mobile mining with ARMgeddon app*
🔒 *Military-grade security platform*

*⭐ PRE-LAUNCH BONUS: 2X earnings for early adopters!*

👇 Choose your path to profits:
"""
    
    bot.send_message(message.chat.id, welcome_text, parse_mode='Markdown', reply_markup=markup)

# Calculate earnings
@bot.callback_query_handler(func=lambda call: call.data == 'calculate')
def calculate_earnings(call):
    markup = types.InlineKeyboardMarkup(row_width=2)
    
    for gpu in gpu_earnings:
        btn = types.InlineKeyboardButton(gpu, callback_data=f'gpu_{gpu}')
        markup.add(btn)
    
    back_btn = types.InlineKeyboardButton('« Back', callback_data='back')
    markup.add(back_btn)
    
    bot.edit_message_text(
        chat_id=call.message.chat.id,
        message_id=call.message.message_id,
        text="*Select Your GPU Model:*\n\nDon't see your GPU? Most models earn $50-500/month!",
        parse_mode='Markdown',
        reply_markup=markup
    )

# Show earnings for specific GPU
@bot.callback_query_handler(func=lambda call: call.data.startswith('gpu_'))
def show_gpu_earnings(call):
    gpu = call.data.replace('gpu_', '')
    earnings = gpu_earnings.get(gpu, '$50-500/month')
    
    # Calculate detailed projections
    monthly = int(earnings.replace('$', '').replace('/month', '').split('-')[0])
    daily = monthly / 30
    yearly = monthly * 12
    
    markup = types.InlineKeyboardMarkup()
    start_btn = types.InlineKeyboardButton('🚀 Start Earning Now!', url='https://hashnhedge.com')
    calc_btn = types.InlineKeyboardButton('💰 Try Another GPU', callback_data='calculate')
    back_btn = types.InlineKeyboardButton('« Main Menu', callback_data='back')
    
    markup.add(start_btn)
    markup.add(calc_btn)
    markup.add(back_btn)
    
    earnings_text = f"""
💎 *{gpu} Earnings Potential - Updated 2024*

💰 *Projected Monthly Earnings: {earnings}*
📈 *Daily Average: ${daily:.2f}*
💵 *Yearly Potential: ${yearly:,}*

⚡ *Revenue Streams (70% share):*
🔄 AI/ML Computing (40%): ${monthly * 0.4:.0f}/mo
⛏️ Crypto Mining (35%): ${monthly * 0.35:.0f}/mo
🔒 Security Tasks (20%): ${monthly * 0.2:.0f}/mo
🎁 Bonus Rewards (5%): ${monthly * 0.05:.0f}/mo

🎯 *What This Covers:*
• Your entire streaming subscriptions
• Monthly internet + phone bills
• Gaming budget for new releases
• Coffee shop visits for a month ☕
• Plus extra for savings!

⭐ *PRE-LAUNCH BONUS: 2X multiplier active!*

_Actual earnings vary. Market conditions apply._
"""
    
    bot.edit_message_text(
        chat_id=call.message.chat.id,
        message_id=call.message.message_id,
        text=earnings_text,
        parse_mode='Markdown',
        reply_markup=markup
    )

# Network stats
@bot.callback_query_handler(func=lambda call: call.data == 'stats')
def show_stats(call):
    # Simulate live stats with updated ranges
    nodes = random.randint(8500, 9200)
    daily_earnings = random.randint(28000, 35000)
    hash_rate = random.randint(1200, 1450)
    mobile_miners = random.randint(2500, 3200)
    
    markup = types.InlineKeyboardMarkup()
    join_btn = types.InlineKeyboardButton('🚀 Join Network', url='https://hashnhedge.com')
    back_btn = types.InlineKeyboardButton('« Back', callback_data='back')
    
    markup.add(join_btn)
    markup.add(back_btn)
    
    stats_text = f"""
📊 *HashNHedge Live Network Statistics*

🖥️ *GPU Miners:* {nodes:,} active
📱 *Mobile Miners:* {mobile_miners:,} (ARMgeddon)
💰 *24h Network Earnings:* ${daily_earnings:,}
⚡ *Total Hashrate:* {hash_rate} TH/s
🌐 *Network Status:* 🟢 99.8% Uptime

💵 *HNH Token (PRE-LAUNCH):*
• Symbol: HNH
• Estimated Launch Price: $0.08
• Projected Market Cap: $100M+
• Blockchain: Solana (SOL)
• Total Supply: 1B tokens

🏆 *Top Network Earners (24h):*
• GPU Farm #1337: $2,847 🔥
• Mining Rig #4201: $1,923
• Node Cluster #7788: $1,456
• Mobile Fleet #9999: $847 📱

⚡ _Live data updated every 30 seconds_
"""
    
    bot.edit_message_text(
        chat_id=call.message.chat.id,
        message_id=call.message.message_id,
        text=stats_text,
        parse_mode='Markdown',
        reply_markup=markup
    )

# How it works
@bot.callback_query_handler(func=lambda call: call.data == 'how')
def how_it_works(call):
    markup = types.InlineKeyboardMarkup()
    start_btn = types.InlineKeyboardButton('🚀 Get Started', url='https://hashnhedge.com')
    video_btn = types.InlineKeyboardButton('📺 Watch Demo', url='https://youtube.com/watch?v=demo')
    back_btn = types.InlineKeyboardButton('« Back', callback_data='back')
    
    markup.add(start_btn)
    markup.add(video_btn)
    markup.add(back_btn)
    
    how_text = """
🎯 *HashNHedge: Your Path to GPU Profits*

*1️⃣ Quick Setup (Under 5 minutes)*
• Download our optimized mining client
• One-click installation wizard
• Connect your Solana wallet
• Auto-detect your GPU specs

*2️⃣ AI-Powered Smart Switching*
🤖 Our algorithm automatically chooses:
• 🧾 AI/ML model training ($2-4/hour)
• ⛏️ Cryptocurrency mining (BTC, ETC)
• 🔒 Cybersecurity computations
• 📱 Mobile mining coordination

*3️⃣ Instant Earnings & Payouts*
• 💰 Earn HNH tokens + SOL/USDC
• ⚡ Real-time Solana blockchain payouts
• 💵 Daily automatic distributions
• 📈 Industry-leading 70% revenue share

*🚀 Why We Pay 5x More Than Others:*
AI companies pay us $5/hour for compute
Traditional mining: $0.20/hour
HashNHedge pays YOU: $1.50-3.50/hour

*🎨 No Technical Skills Needed!*
Set it and forget it - we handle everything!
"""
    
    bot.edit_message_text(
        chat_id=call.message.chat.id,
        message_id=call.message.message_id,
        text=how_text,
        parse_mode='Markdown',
        reply_markup=markup
    )

# Mobile mining info
@bot.callback_query_handler(func=lambda call: call.data == 'mobile')
def mobile_mining(call):
    markup = types.InlineKeyboardMarkup()
    download_btn = types.InlineKeyboardButton('📱 Download ARMgeddon App', url='https://hashnhedge-pool.onrender.com/downloads/mobile.html')
    learn_btn = types.InlineKeyboardButton('📆 Learn More', url='https://hashnhedge-pool.onrender.com/armageddon/')
    back_btn = types.InlineKeyboardButton('« Back', callback_data='back')

    markup.add(download_btn)
    markup.add(learn_btn)
    markup.add(back_btn)

    mobile_text = """
📱 *ARMgeddon: Revolutionary Mobile Mining*

🚀 *World's First Phone-Optimized Mining!*
• Mine on ANY smartphone or tablet
• No battery drain technology
• ARM processor optimization
• Earn while you sleep!

💰 *Mobile Earnings:*
• iPhone 15 Pro: $25-45/month
• Samsung Galaxy S24: $20-35/month
• Average smartphone: $15-25/month
• Tablet devices: $30-50/month

🔋 *Zero Impact on Device:*
• Intelligent thermal management
• Background processing only
• Automatic pause during calls/games
• Battery-friendly algorithms

⭐ *Join 3,200+ mobile miners earning daily!*
"""

    bot.edit_message_text(
        chat_id=call.message.chat.id,
        message_id=call.message.message_id,
        text=mobile_text,
        parse_mode='Markdown',
        reply_markup=markup
    )

# Security platform info
@bot.callback_query_handler(func=lambda call: call.data == 'security')
def security_platform(call):
    markup = types.InlineKeyboardMarkup()
    platform_btn = types.InlineKeyboardButton('🔒 Access Security Platform', url='https://hashnhedge-pool.onrender.com/docs/security-platform.html')
    back_btn = types.InlineKeyboardButton('« Back', callback_data='back')

    markup.add(platform_btn)
    markup.add(back_btn)

    security_text = """
🔒 *HashNHedge Security & Hashcat Platform*

🎯 *Premium Security Services:*
• Password recovery & penetration testing
• Hash cracking with GPU clusters
• Cybersecurity consulting
• Enterprise security audits

💰 *Earn from Security Tasks:*
• Ethical password recovery: $5-15/hour
• Hash computation jobs: $3-8/hour
• Security research tasks: $10-25/hour
• Penetration testing assistance

🔧 *Advanced Features:*
• Distributed Hashcat clusters
• Military-grade encryption
• Ethical hacking framework
• Professional security tools

✅ *100% Legal & Ethical Operations*
All security tasks are pre-approved and legitimate.
"""

    bot.edit_message_text(
        chat_id=call.message.chat.id,
        message_id=call.message.message_id,
        text=security_text,
        parse_mode='Markdown',
        reply_markup=markup
    )

# Back button handler
@bot.callback_query_handler(func=lambda call: call.data == 'back')
def go_back(call):
    send_welcome(call.message)

# Whitepaper
@bot.callback_query_handler(func=lambda call: call.data == 'whitepaper')
def send_whitepaper(call):
    bot.send_document(
        call.message.chat.id,
        'https://hashnhedge.com/whitepaper.pdf',
        caption='📄 *HashNHedge Whitepaper v1.0*\n\nLearn about our technology, tokenomics, and roadmap!',
        parse_mode='Markdown'
    )

# Broadcast message (for marketing)
@bot.message_handler(commands=['broadcast'])
def broadcast(message):
    # Only allow admin (5985257734)
    if message.from_user.id == YOUR_TELEGRAM_ID:5985257734
        broadcast_text = """
🚀 *PRE-LAUNCH ANNOUNCEMENT: HashNHedge Going Live Soon!*

🎉 *Early Adopter Benefits (Limited Time):*
• 2X earnings multiplier for first 30 days
• Exclusive founder NFT badge
• Priority customer support
• Beta access to mobile mining
• Reduced fees for life (2% vs 5%)

💎 Join the revolution: hashnhedge-pool.onrender.com

⏰ _Only 500 founder spots remaining!_
"""
        # In production, this would send to all users
        bot.send_message(message.chat.id, broadcast_text, parse_mode='Markdown')

# Price alerts
@bot.message_handler(commands=['alert'])
def set_alert(message):
    alert_text = """
🔔 *Smart Alerts & Notifications*

📧 *Get notified instantly when:*
• HNH token launches & price updates
• Your daily earnings exceed targets
• New high-paying jobs available
• Network maintenance scheduled
• Mobile mining rewards 2x
• Security platform bonuses active

📱 *Coming Soon:* Push notifications to your phone!

⚙️ Set your preferences: /settings
"""
    bot.reply_to(message, alert_text, parse_mode='Markdown')

# Run the bot
print("Bot is running...")
bot.polling()
