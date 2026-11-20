import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = process.env.PORT || 3001;
const documents = [];
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ ready: Boolean(process.env.API_KEY), documents: documents.length }));

app.post('/api/documents', (req, res) => {
  const { name, text } = req.body ?? {};
  if (!name || !text?.trim()) return res.status(400).json({ error: 'El archivo está vacío.' });
  const chunks = text.match(/[\s\S]{1,900}(?:\s|$)/g) || [text];
  documents.push(...chunks.map((content, index) => ({ name, index: index + 1, content: content.trim() })));
  res.json({ name, chunks: chunks.length, documents: documents.length });
});

app.delete('/api/documents', (_req, res) => {
  documents.length = 0;
  res.json({ documents: 0 });
});

app.post('/api/chat', async (req, res) => {
  const { message, history = [] } = req.body ?? {};
  if (!process.env.API_KEY) return res.status(503).json({ error: 'Falta configurar API_KEY en .env.' });
  if (!message?.trim()) return res.status(400).json({ error: 'Escribe una pregunta.' });

  const terms = message.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [];
  const context = documents
    .map((chunk) => ({ ...chunk, score: terms.reduce((sum, term) => sum + (chunk.content.toLowerCase().includes(term) ? 1 : 0), 0) }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const sources = [...new Set(context.map((chunk) => chunk.name))];
  const contextText = context.map((chunk) => `[${chunk.name}, fragmento ${chunk.index}]\n${chunk.content}`).join('\n\n');

  try {
    const response = await fetch(process.env.API_URL || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `Responde en español, con claridad y brevedad. Usa el contexto recuperado para responder. Si no contiene la respuesta, dilo.\n\nContexto:\n${contextText || '(No se encontró contexto relevante.)'}` },
          ...history.slice(-8),
          { role: 'user', content: message },
        ],
      }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Error al consultar la API.' });
    res.json({ answer: data.choices?.[0]?.message?.content || 'No llegó una respuesta.', sources });
  } catch {
    res.status(502).json({ error: 'No se pudo conectar con la API de IA.' });
  }
});

if (process.env.NODE_ENV === 'production') {
  const root = path.dirname(fileURLToPath(import.meta.url));
  app.use(express.static(path.join(root, 'dist')));
  app.get('*', (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
}

app.listen(port, () => console.log(`API lista en http://localhost:${port}`));
