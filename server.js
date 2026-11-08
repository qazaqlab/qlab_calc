// Qlab Studio — Zero-Dependency Local Real-Time Server for Multi-Device Sync
// Supports: PC, Laptop, Phone, Tablet on local Wi-Fi network

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;
const DB_FILE = path.join(__dirname, 'qlab_database.json');
const HTML_FILE = path.join(__dirname, 'qlab_calc.html');

// In-memory data store with disk persistence
let dbState = {
  orders: [],
  spools: [],
  settings: {
    plastic: 6000,
    power: 30.15,
    deprec: 120,
    watts: 110,
    rateMat: 45,
    rateTime: 150
  },
  updatedAt: Date.now()
};

// Load existing data from disk if present
if (fs.existsSync(DB_FILE)) {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    dbState = Object.assign(dbState, JSON.parse(raw));
    console.log('[DB] База данных успешно загружена из qlab_database.json');
  } catch (err) {
    console.error('[DB Error] Ошибка чтения qlab_database.json:', err.message);
  }
}

// Active Server-Sent Events (SSE) client connections
const sseClients = new Set();

function broadcastToClients(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// Get Local Wi-Fi IPv4 address
function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();

const server = http.createServer((req, res) => {
  // CORS Headers for multi-device cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlPath = req.url.split('?')[0];

  // 1. Serve Main Application HTML
  if (urlPath === '/' || urlPath === '/index.html' || urlPath === '/qlab_calc.html') {
    if (fs.existsSync(HTML_FILE)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(HTML_FILE).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Файл qlab_calc.html не найден рядом с сервером');
    }
    return;
  }

  // 2. Health check
  if (urlPath === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', time: Date.now(), localIp }));
    return;
  }

  // 3. GET Database State
  if (urlPath === '/api/data' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(dbState));
    return;
  }

  // 4. POST Sync Database State
  if (urlPath === '/api/sync' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const incoming = JSON.parse(body);
        if (incoming.orders) dbState.orders = incoming.orders;
        if (incoming.spools) dbState.spools = incoming.spools;
        if (incoming.settings) dbState.settings = Object.assign(dbState.settings, incoming.settings);
        dbState.updatedAt = incoming.updatedAt || Date.now();

        // Save to disk
        fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf8');

        // Broadcast change in real time to all other connected devices (phone, laptop, tablet)
        broadcastToClients(dbState);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: dbState.orders.length }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 5. Server-Sent Events (SSE) Stream for Instant Real-Time Sync
  if (urlPath === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write(`data: ${JSON.stringify(dbState)}\n\n`);
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // 404 Fallback
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n================================================================');
  console.log('       QLAB STUDIO — ЕДИНАЯ ОНЛАЙН БАЗА И КАЛЬКУЛЯТОР 3D        ');
  console.log('================================================================');
  console.log(`  🖥️  Этот компьютер / Ноутбук:  http://localhost:${PORT}`);
  console.log(`  📱  Телефон / Планшет (Wi-Fi):  http://${localIp}:${PORT}`);
  console.log('================================================================');
  console.log('  Все изменения на любом устройстве синхронизируются мгновенно!');
  console.log('================================================================\n');
});
