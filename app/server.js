import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';

app.use(cors());
app.use(express.json());

// Serve static files (frontend build)
app.use(express.static(join(__dirname, 'dist')));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    aiAvailable: !!DEEPSEEK_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Proxy: AI Parse
app.post('/api/parse', async (req, res) => {
  if (!DEEPSEEK_API_KEY) {
    return res.status(500).json({ error: '服务器未配置 DEEPSEEK_API_KEY，请在 .env 文件中设置' });
  }

  try {
    const { messages, temperature = 0.3 } = req.body;

    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: err.error?.message || `DeepSeek 请求失败 (${response.status})`,
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || '代理请求失败' });
  }
});

// Proxy: AI Summary
app.post('/api/summary', async (req, res) => {
  if (!DEEPSEEK_API_KEY) {
    return res.status(500).json({ error: '服务器未配置 DEEPSEEK_API_KEY，请在 .env 文件中设置' });
  }

  try {
    const { messages, temperature = 0.7 } = req.body;

    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: err.error?.message || `DeepSeek 请求失败 (${response.status})`,
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || '代理请求失败' });
  }
});

// Fallback: serve index.html for SPA routes
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 日程管理后端代理已启动`);
  console.log(`📡 端口: ${PORT}`);
  console.log(`🤖 AI 代理: ${DEEPSEEK_API_KEY ? '✅ 已配置' : '❌ 未配置 (在 .env 中设置 DEEPSEEK_API_KEY)'}`);
  console.log(`🌐 访问: http://localhost:${PORT}\n`);
});
