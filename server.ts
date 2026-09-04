import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { generateChatResponse, testProviderConnection } from './src/services/geminiService.js';
import { isAbortError, toErrorPayload } from './src/core/errorContract.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Service Layer for Web Preview Mode & Hosted Backend
  app.post('/api/chat', async (req, res) => {
    const controller = new AbortController();
    req.on('aborted', () => controller.abort());
    res.on('close', () => {
      if (!res.writableEnded) controller.abort();
    });

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
      server: { middlewareMode: true },
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
