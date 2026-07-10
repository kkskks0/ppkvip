// 从环境变量读取 API Key，不再硬编码
const API_KEY = process.env.MIMO_API_KEY || ''
const BASE_URL = process.env.MIMO_API_BASE_URL || 'https://api.xiaomimimo.com/v1'
const MODEL = process.env.MIMO_MODEL || 'mimo-v2.5-pro'

if (!API_KEY) {
  console.error('Error: MIMO_API_KEY environment variable is not set.')
  console.error('Usage: MIMO_API_KEY=sk-xxx node test-mimo-vision.js <image_path>')
  process.exit(1)
}

const fs = require('fs');
const https = require('https');
const path = require('path');

async function testVision(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');
  const ext = path.extname(imagePath).toLowerCase();
  const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }[ext] || 'image/png';

  const payload = JSON.stringify({
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: '请分析这张图片中的内容，描述你看到的颜色、形状和任何明显的特征。用中文回答。' },
          { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } }
        ]
      }
    ],
    max_tokens: 1024
  });

  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}/chat/completions`);
    const req = https.request({
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 60000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        try {
          console.log('Response:', JSON.stringify(JSON.parse(data), null, 2));
        } catch {
          console.log('Raw:', data);
        }
        resolve();
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(payload);
    req.end();
  });
}

async function testTextOnly() {
  const payload = JSON.stringify({
    model: MODEL,
    messages: [{ role: 'user', content: '你好，请用一句话介绍你自己。' }],
    max_tokens: 256
  });

  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}/chat/completions`);
    const req = https.request({
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 30000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[Text] Status: ${res.statusCode}`);
        try {
          const json = JSON.parse(data);
          console.log('[Text] Response:', JSON.stringify(json, null, 2));
        } catch {
          console.log('[Text] Raw:', data);
        }
        resolve();
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(payload);
    req.end();
  });
}

(async () => {
  console.log('=== Test 1: Text-only (verify API connectivity) ===');
  await testTextOnly();

  console.log('\n=== Test 2: Vision (image analysis) ===');
  const imgPath = process.argv[2] || path.join(__dirname, 'test-image.png');
  if (fs.existsSync(imgPath)) {
    await testVision(imgPath);
  } else {
    console.log(`Image not found: ${imgPath}`);
    console.log('Usage: MIMO_API_KEY=sk-xxx node test-mimo-vision.js <image_path>');
  }
})();
