# Quick Start Guide

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- API keys for:
  - Roostoo (apply at jolly@roostoo.com)
  - OpenAI (news & market data)
  - DeepSeek (strategies and calculations)
  - Horus (optional, if you have access)

## Setup Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**

   Create a `.env` file at the project root and add your API keys:
   ```env
   PORT=3000
   TRADING_INTERVAL_MS=60000
   MAX_POSITION_SIZE=0.1
   RISK_PER_TRADE=0.02

   ROOSTOO_API_KEY=your_key_here
   ROOSTOO_SECRET_KEY=your_secret_here
   ROOSTOO_BASE_URL=https://mock-api.roostoo.com

   HORUS_API_KEY=your_key_here
   HORUS_BASE_URL=

   OPENAI_API_KEY=your_key_here
   OPENAI_MODEL=gpt-4.1-mini

   DEEPSEEK_API_KEY=your_key_here
   ```

3. **Start the Server**
   ```bash
   npm start
   ```

4. **Access the Dashboard**
   Open your browser and go to: `http://localhost:3000`

5. **Start Trading**
   - Click "Start Bot" in the dashboard
   - The bot will begin trading cycles at the configured interval (default: 60 seconds)

## Important Notes

- **Model Identifiers**: The AI service clients use placeholder model identifiers. Update them in:
  - `src/ai/gpt5Client.js` - Update OpenAI model name when available
  - `src/ai/deepSeekClient.js` - Update DeepSeek model name

- **Vector Store**: The current implementation uses a simple in-memory vector store. For production, consider:
  - Pinecone
  - Weaviate
  - Chroma
  - Or use proper embedding APIs (OpenAI, Cohere)

- **Horus API**: The Horus client is a placeholder. Implement it based on your Horus API documentation.

- **Testing**: Start with paper trading mode (log decisions without executing) before using real funds.

## Troubleshooting

- **API Connection Errors**: Check your API keys and network connection
- **Port Already in Use**: Change the PORT in `.env`
- **Missing Dependencies**: Run `npm install` again

## Monitoring

- Check logs in the `logs/` directory
- Monitor the dashboard for real-time status
- Review trading decisions in the dashboard