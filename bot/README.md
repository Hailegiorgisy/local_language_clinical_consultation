# TenaConsult - Local Language Clinical Healthcare Telegram Bot

Multilingual Community Healthcare Consultation Telegram Bot supporting 4 Ethiopian and Horn of Africa languages:
1. **አማርኛ (Amharic - am)**
2. **Afaan Oromoo (om)**
3. **Dha Anywaa / Agnwa (an)**
4. **Thok Naath / Nuer (nu)**

## Features
- **Standalone Node.js Bot**: Runs independently using Telegraf.
- **Persistent Language Sessions**: Preserves the user's chosen language per chat session.
- **AI Triage with Gemini 3.8 Flash**: Automated clinical symptom assessment grounded in the Ethiopian Primary Health Care Clinical Guidelines (EPHCG).
- **Offline Fallback Clinical Rules**: Built-in emergency triage for Malaria, AWD/Diarrhea, Respiratory Distress, Snakebites, and Maternal warning signs.
- **Inline Keyboards & Commands**: `/start`, `/language`, `/emergency`, `/facilities`, `/help`.

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```env
TELEGRAM_BOT_TOKEN="your_bot_token_from_botfather"
GEMINI_API_KEY="your_gemini_api_key_optional"
```

3. Start the bot:
```bash
npm start
```
