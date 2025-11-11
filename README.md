# To-The-Moon

## RAG-Based Trading Bot for Roostoo Exchange

A live, data-driven trading bot that uses Retrieval-Augmented Generation (RAG) to orchestrate multiple AI agents for autonomous trading decisions on Roostoo's real-time exchange simulator.

## Architecture

- **RAG Framework**: Orchestrates data retrieval and synthesis
- **DeepSeek**: Generates trading strategies and quantitative calculations
- **OpenAI GPT (configurable)**: Fetches financial news and stock data
- **Roostoo API**: Executes trades and fetches portfolio data
- **Horus API**: Additional market data sources

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file using the template below:
```env
PORT=3000
TRADING_INTERVAL_MS=60000
MAX_POSITION_SIZE=0.1
RISK_PER_TRADE=0.02

ROOSTOO_API_KEY=
ROOSTOO_SECRET_KEY=
ROOSTOO_BASE_URL=https://mock-api.roostoo.com

HORUS_API_KEY=
HORUS_BASE_URL=

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini

DEEPSEEK_API_KEY=
```

3. Configure your API keys in `.env`:
   - Roostoo API credentials (apply at jolly@roostoo.com)
   - Horus API credentials
   - OpenAI API key and model identifier
   - DeepSeek API key

4. Start the bot:
```bash
npm start
```

## Project Structure

```
├── src/
│   ├── api/          # API clients (Roostoo, Horus)
│   ├── ai/           # AI service clients (OpenAI, DeepSeek)
│   ├── rag/          # RAG framework (vector store, agent)
│   ├── trading/      # Trading engine and risk management
│   ├── utils/        # Utilities (logger, config)
│   ├── server.js     # Express server
│   └── index.js      # Application entry point
├── public/           # Frontend dashboard
├── .env.example      # Environment variable template
└── package.json      # Dependencies
```

## API Endpoints

- `GET /api/status` - Bot status
- `GET /api/portfolio` - Current portfolio
- `POST /api/start` - Start trading bot
- `POST /api/stop` - Stop trading bot
- `GET /api/logs` - Trading logs

## Security

- Never commit `.env` file
- API keys are stored in environment variables
- All Roostoo API requests use HMAC SHA256 signatures
