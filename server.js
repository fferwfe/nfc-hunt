const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// ── 初始資料 ──
const DEFAULT_DATA = {
  adminPw: 'admin1234',
  activities: [],
  leaderboard: []
};

function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch(e) {}
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// 初始化資料檔
if (!fs.existsSync(DATA_FILE)) writeData(DEFAULT_DATA);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── API ──

// 登入驗證
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  const data = readData();
  if (password === data.adminPw) {
    res.json({ ok: true });
  } else {
    res.json({ ok: false });
  }
});

// 變更密碼
app.post('/api/change-password', (req, res) => {
  const { oldPw, newPw } = req.body;
  const data = readData();
  if (oldPw !== data.adminPw) return res.json({ ok: false, msg: '舊密碼錯誤' });
  data.adminPw = newPw;
  writeData(data);
  res.json({ ok: true });
});

// 取得所有活動
app.get('/api/activities', (req, res) => {
  const data = readData();
  res.json(data.activities);
});

// 儲存活動（新增或更新）
app.post('/api/activities', (req, res) => {
  const data = readData();
  const act = req.body;
  const idx = data.activities.findIndex(a => a.id === act.id);
  if (idx >= 0) {
    data.activities[idx] = act;
  } else {
    act.id = Date.now().toString(36) + Math.random().toString(36).slice(2,5);
    data.activities.push(act);
  }
  writeData(data);
  res.json({ ok: true, id: act.id });
});

// 刪除活動
app.delete('/api/activities/:id', (req, res) => {
  const data = readData();
  data.activities = data.activities.filter(a => a.id !== req.params.id);
  writeData(data);
  res.json({ ok: true });
});

// 取得進行中活動的關卡（玩家用）
app.get('/api/stages', (req, res) => {
  const data = readData();
  const active = data.activities.find(a => a.status === 'active');
  if (!active) return res.json({ stages: [], activityName: '' });
  res.json({ stages: active.stages, activityName: active.name });
});

// 排行榜
app.get('/api/leaderboard', (req, res) => {
  const data = readData();
  res.json(data.leaderboard || []);
});

app.post('/api/leaderboard', (req, res) => {
  const data = readData();
  const entry = req.body;
  const idx = data.leaderboard.findIndex(r => r.team === entry.team);
  if (idx >= 0) {
    data.leaderboard[idx] = entry;
  } else {
    data.leaderboard.push(entry);
  }
  // 排序
  data.leaderboard.sort((a, b) => {
    if (a.finished && b.finished) return a.totalTime - b.totalTime;
    if (a.finished) return -1;
    if (b.finished) return 1;
    return b.stage - a.stage;
  });
  writeData(data);
  res.json({ ok: true });
});

app.delete('/api/leaderboard', (req, res) => {
  const data = readData();
  data.leaderboard = [];
  writeData(data);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`✅ NFC 尋寶系統運行中：http://localhost:${PORT}`);
});
