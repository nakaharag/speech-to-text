# speech-to-text.me

A web application for voice transcription and AI-powered summarization.

## Features

- Record audio directly in the browser (max 15 seconds)
- Transcription using OpenAI Whisper API
- AI-generated summaries using Claude
- Share results via short links (24-hour expiry)
- Share to X, Facebook, WhatsApp
- Rate limiting (5 transcriptions/day per IP)
- Dark mode support
- Google AdSense integration

## Tech Stack

- **Frontend**: React 18
- **Backend**: NestJS
- **Speech-to-Text**: OpenAI Whisper API
- **AI Summary**: Anthropic Claude API
- **Storage**: JSON files with 24h expiry
- **Deployment**: Docker + Nginx

## Quick Start

### Development

1. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

2. Add your API keys to `.env`:
   ```
   OPENAI_API_KEY=sk-your-key
   ANTHROPIC_API_KEY=sk-ant-your-key
   ```

3. Start development servers:
   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

4. Open http://localhost:3001

### Production

1. Build and run:
   ```bash
   docker-compose up -d
   ```

2. Access at http://localhost (or configure nginx for your domain)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /speech/transcribe | Upload audio file for transcription |
| POST | /content/summarize | Get AI summary of text |
| POST | /share/create | Create shareable link |
| GET | /share/:id | Get shared content |

## Project Structure

```
speech-to-text-me/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── dto/
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── data/
│   ├── Dockerfile
│   └── Dockerfile.dev
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── utils/
│   │   ├── App.js
│   │   └── styles.css
│   ├── public/
│   ├── Dockerfile
│   └── Dockerfile.dev
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
├── docker-compose.dev.yml
└── .env.example
```

## Design System

- **Primary**: #3B82F6 (Electric Blue)
- **Secondary**: #8B5CF6 (Violet)
- **Success**: #10B991 (Emerald)
- **Error**: #EF4444 (Red)
- **Font**: Plus Jakarta Sans, JetBrains Mono

## Rate Limiting

- 5 transcriptions per day per IP address
- Resets at midnight UTC
- Returns 429 status when limit exceeded

## Share Links

- Short links format: `speech-to-text.me/s/abc123`
- Expire after 24 hours
- Stored as JSON files in `backend/data/shares/`

## Environment Variables

| Variable | Description |
|----------|-------------|
| OPENAI_API_KEY | OpenAI API key for Whisper |
| ANTHROPIC_API_KEY | Anthropic API key for Claude |
| BASE_URL | Public URL for share links |
| CORS_ORIGIN | Allowed CORS origin |
| REACT_APP_API_URL | API URL for frontend |

## License

MIT
