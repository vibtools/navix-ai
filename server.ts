import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { generateChatResponse, testProviderConnection } from './src/services/geminiService.js';
import { isAbortError, toErrorPayload } from './src/core/errorContract.js';

async function startServer() {
  const app = express();
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = '0.0.0.0';

  app.use(express.json());

  // API Service Layer for Web Preview Mode & Hosted Backend
  app.post('/api/chat', async (req, res) => {
    const controller = new AbortController();
    req.on('aborted', () => controller.abort());
    res.on('close', () => {
      if (!res.writableEnded) controller.abort();
    });

    if (req.body?.providerAttempts) {
      req.body.providerAttempts.forEach(attempt => {
        if (attempt.provider === 'gemini' && process.env.GEMINI_API_KEY) attempt.apiKey = attempt.apiKey || process.env.GEMINI_API_KEY;
        if (attempt.provider === 'openai' && process.env.OPENAI_API_KEY) attempt.apiKey = attempt.apiKey || process.env.OPENAI_API_KEY;
        if (attempt.provider === 'huggingface' && process.env.HUGGINGFACE_API_KEY) attempt.apiKey = attempt.apiKey || process.env.HUGGINGFACE_API_KEY;
      });
    }

    try {
      await generateChatResponse(req.body, (chunk) => {
        if (!controller.signal.aborted) {
          if (!res.headersSent) res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.write(chunk);
        }
      }, controller.signal);

      if (!res.headersSent) res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end();
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) {
        if (!res.writableEnded) res.end();
        return;
      }
      console.error("Provider API Error:", toErrorPayload(error));
      if (!res.headersSent) {
        res.status(500).json({ error: toErrorPayload(error) });
      } else {
        const payload = toErrorPayload(error);
        res.write(`\n\n**⚠️ Error (${payload.code}):** ${payload.message}`);
        res.end();
      }
    }
  });

  app.post('/api/provider/test', async (req, res) => {
    const controller = new AbortController();
    req.on('aborted', () => controller.abort());
    res.on('close', () => {
      if (!res.writableEnded) controller.abort();
    });

    if (req.body?.attempt) {
      if (req.body.attempt.provider === 'gemini' && process.env.GEMINI_API_KEY) req.body.attempt.apiKey = req.body.attempt.apiKey || process.env.GEMINI_API_KEY;
      if (req.body.attempt.provider === 'openai' && process.env.OPENAI_API_KEY) req.body.attempt.apiKey = req.body.attempt.apiKey || process.env.OPENAI_API_KEY;
      if (req.body.attempt.provider === 'huggingface' && process.env.HUGGINGFACE_API_KEY) req.body.attempt.apiKey = req.body.attempt.apiKey || process.env.HUGGINGFACE_API_KEY;
    }

    try {
      const result = await testProviderConnection(req.body?.attempt, controller.signal);
      res.json({ success: true, result });
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) {
        if (!res.writableEnded) res.end();
        return;
      }
      res.status(400).json({ error: toErrorPayload(error) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { port: 0 }
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, host, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer();
