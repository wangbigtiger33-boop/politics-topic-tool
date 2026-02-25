// ========== 数据层 ==========
const STORAGE_KEY = 'politics_topics';
const ALL_MODULES = [
  '必修1《中国特色社会主义》','必修2《经济与社会》','必修3《政治与法治》',
  '必修4《哲学与文化》','选必1《当代国际政治与经济》','选必2《法律与生活》','选必3《逻辑与思维》'
];

function loadTopics() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveTopics(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function nextId(data) {
  const nums = data.map(t => parseInt(t.id.replace('T',''))).filter(n=>!isNaN(n));
  return 'T' + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3,'0');
}

let topics = loadTopics();
let editingId = null;

// ========== Tab 切换 ==========
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'dashboard') renderDashboard();
    if (btn.dataset.tab === 'recommend') renderRecommend();
  });
});

// ========== 搜索 & 筛选 ==========
const searchInput = document.getElementById('searchInput');
const filterGrade = document.getElementById('filterGrade');
const filterModule = document.getElementById('filterModule');
const filterType = document.getElementById('filterType');
const filterDifficulty = document.getElementById('filterDifficulty');
const filterStatus = document.getElementById('filterStatus');

[searchInput, filterGrade, filterModule, filterType, filterDifficulty, filterStatus].forEach(el => {
  el.addEventListener('input', renderTopics);
  el.addEventListener('change', renderTopics);
});

function getFiltered() {
  const q = searchInput.value.toLowerCase();
  return topics.filter(t => {
    if (q && !(t.title+t.knowledge+t.political+t.keywords+t.notes).toLowerCase().includes(q)) return false;
    if (filterGrade.value && t.grade !== filterGrade.value) return false;
    if (filterModule.value && t.module !== filterModule.value) return false;
    if (filterType.value && t.contentType !== filterType.value) return false;
    if (filterDifficulty.value && t.difficulty !== filterDifficulty.value) return false;
    if (filterStatus.value && t.status !== filterStatus.value) return false;
    return true;
  });
}

// ========== 计算函数 ==========
function totalPlay(t) {
  return (t.dy_play||0)+(t.xhs_play||0)+(t.bili_play||0)+(t.sph_play||0);
}
function totalInteract(t) {
  return (t.dy_like||0)+(t.dy_comment||0)+(t.dy_fav||0)+(t.dy_share||0)
    +(t.xhs_like||0)+(t.xhs_comment||0)+(t.xhs_fav||0)+(t.xhs_share||0)
    +(t.bili_like||0)+(t.bili_comment||0)+(t.bili_fav||0)+(t.bili_share||0)
    +(t.sph_like||0)+(t.sph_comment||0)+(t.sph_fav||0)+(t.sph_share||0);
}

// ========== 选题列表渲染 ==========
function renderTopics() {
  const filtered = getFiltered();
  const list = document.getElementById('topicList');
  const statsBar = document.getElementById('statsBar');

  const totalP = filtered.reduce((s,t) => s+totalPlay(t), 0);
  const used = filtered.filter(t=>t.status==='已用').length;
  statsBar.innerHTML = `共 <span>${filtered.length}</span> 条选题 | 已用 <span>${used}</span> 条 | 未用 <span>${filtered.filter(t=>t.status==='未用').length}</span> 条 | 总播放 <span>${totalP.toLocaleString()}</span>`;

  if (!filtered.length) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">暂无选题，点击"+ 新增选题"开始</div>';
    return;
  }

  list.innerHTML = filtered.map(t => {
    const tp = totalPlay(t);
    const ti = totalInteract(t);
    const trafficHtml = tp > 0 ? `<div class="topic-traffic">
      <span>总播放: <strong>${tp.toLocaleString()}</strong></span>
      <span>总互动: <strong>${ti.toLocaleString()}</strong></span>
      ${t.newFollowers ? `<span>涨粉: <strong>+${t.newFollowers}</strong></span>` : ''}
      ${t.rating ? `<span class="rating-${t.rating}">${t.rating}</span>` : ''}
    </div>` : '';

    return `<div class="topic-card" data-id="${t.id}">
      <div class="topic-header">
        <span class="topic-title">${t.title}</span>
        <span class="topic-id">${t.id}</span>
      </div>
      <div class="topic-tags">
        <span class="tag tag-grade">${t.grade}</span>
        <span class="tag tag-module">${t.module.replace(/[《》]/g,'')}</span>
        <span class="tag tag-type">${t.contentType}</span>
        <span class="tag tag-difficulty">${t.difficulty}</span>
        <span class="tag tag-status-${t.status}">${t.status}</span>
        ${t.hook ? `<span class="tag">🎣${t.hook}</span>` : ''}
      </div>
      ${t.knowledge ? `<div style="font-size:13px;color:#64748b;margin-top:6px;">📌 ${t.knowledge}</div>` : ''}
      ${t.political ? `<div style="font-size:13px;color:#64748b;margin-top:2px;">🔗 ${t.political}</div>` : ''}
      ${trafficHtml}
    </div>`;
  }).join('');

  list.querySelectorAll('.topic-card').forEach(card => {
    card.addEventListener('click', () => openEdit(card.dataset.id));
  });
}

// ========== 弹窗：新增 & 编辑 ==========
const modal = document.getElementById('modal');
const form = document.getElementById('topicForm');
const btnDelete = document.getElementById('btnDelete');

document.getElementById('btnAdd').addEventListener('click', () => {
  editingId = null;
  form.reset();
  document.getElementById('modalTitle').textContent = '新增选题';
  btnDelete.classList.add('hidden');
  modal.classList.remove('hidden');
});

document.getElementById('modalClose').addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });

function openEdit(id) {
  const t = topics.find(x => x.id === id);
  if (!t) return;
  editingId = id;
  document.getElementById('modalTitle').textContent = '编辑选题 ' + id;
  btnDelete.classList.remove('hidden');

  const f = form;
  f.title.value = t.title || '';
  f.grade.value = t.grade || '高三';
  f.module.value = t.module || ALL_MODULES[0];
  f.knowledge.value = t.knowledge || '';
  f.contentType.value = t.contentType || '时政分析';
  f.difficulty.value = t.difficulty || '中等';
  f.political.value = t.political || '';
  f.source.value = t.source || '时政热点';
  f.duration.value = t.duration || '';
  f.keywords.value = t.keywords || '';
  f.coverType.value = t.coverType || '';
  f.hook.value = t.hook || '';
  f.notes.value = t.notes || '';
  f.publishDate.value = t.publishDate || '';
  f.publishTime.value = t.publishTime || '';

  // 四平台数据
  const platforms = [
    {pre:'dy', fields:['play','like','comment','fav','share','finish']},
    {pre:'xhs', fields:['play','like','comment','fav','share']},
    {pre:'bili', fields:['play','like','comment','fav','share','finish']},
    {pre:'sph', fields:['play','like','comment','fav','share']}
  ];
  platforms.forEach(p => {
    p.fields.forEach(field => {
      const key = p.pre + '_' + field;
      if (f[key]) f[key].value = t[key] || '';
    });
  });

  f.newFollowers.value = t.newFollowers || '';
  f.rating.value = t.rating || '';
  f.trafficNotes.value = t.trafficNotes || '';

  modal.classList.remove('hidden');
}

// ========== 保存 ==========
form.addEventListener('submit', e => {
  e.preventDefault();
  const f = form;
  const data = {
    id: editingId || nextId(topics),
    title: f.title.value.trim(),
    grade: f.grade.value,
    module: f.module.value,
    knowledge: f.knowledge.value.trim(),
    contentType: f.contentType.value,
    difficulty: f.difficulty.value,
    political: f.political.value.trim(),
    source: f.source.value,
    duration: f.duration.value.trim(),
    keywords: f.keywords.value.trim(),
    coverType: f.coverType.value,
    hook: f.hook.value,
    notes: f.notes.value.trim(),
    status: editingId ? (topics.find(t=>t.id===editingId)||{}).status || '未用' : '未用',
    publishDate: f.publishDate.value,
    publishTime: f.publishTime.value,
    dy_play: num(f.dy_play), dy_like: num(f.dy_like), dy_comment: num(f.dy_comment),
    dy_fav: num(f.dy_fav), dy_share: num(f.dy_share), dy_finish: f.dy_finish.value.trim(),
    xhs_play: num(f.xhs_play), xhs_like: num(f.xhs_like), xhs_comment: num(f.xhs_comment),
    xhs_fav: num(f.xhs_fav), xhs_share: num(f.xhs_share),
    bili_play: num(f.bili_play), bili_like: num(f.bili_like), bili_comment: num(f.bili_comment),
    bili_fav: num(f.bili_fav), bili_share: num(f.bili_share), bili_finish: f.bili_finish.value.trim(),
    sph_play: num(f.sph_play), sph_like: num(f.sph_like), sph_comment: num(f.sph_comment),
    sph_fav: num(f.sph_fav), sph_share: num(f.sph_share),
    newFollowers: num(f.newFollowers),
    rating: f.rating.value,
    trafficNotes: f.trafficNotes.value.trim(),
    createdAt: editingId ? (topics.find(t=>t.id===editingId)||{}).createdAt || today() : today()
  };

  // 有流量数据就自动标记已用
  if (data.publishDate && totalPlay(data) > 0) data.status = '已用';

  if (editingId) {
    const idx = topics.findIndex(t => t.id === editingId);
    if (idx >= 0) topics[idx] = data;
  } else {
    topics.push(data);
  }

  saveTopics(topics);
  modal.classList.add('hidden');
  renderTopics();
});

function num(input) { return parseInt(input.value) || 0; }
function today() { return new Date().toISOString().slice(0,10); }

// ========== 删除 ==========
btnDelete.addEventListener('click', () => {
  if (!editingId) return;
  if (!confirm('确定删除这条选题？')) return;
  topics = topics.filter(t => t.id !== editingId);
  saveTopics(topics);
  modal.classList.add('hidden');
  renderTopics();
});

// ========== CSV 导入导出 ==========
const CSV_FIELDS = [
  'id','title','grade','module','knowledge','contentType','difficulty','political',
  'source','duration','publishTime','keywords','coverType','hook','status','publishDate',
  'dy_play','dy_like','dy_comment','dy_fav','dy_share','dy_finish',
  'xhs_play','xhs_like','xhs_comment','xhs_fav','xhs_share',
  'bili_play','bili_like','bili_comment','bili_fav','bili_share','bili_finish',
  'sph_play','sph_like','sph_comment','sph_fav','sph_share',
  'newFollowers','rating','trafficNotes','createdAt','notes'
];
const CSV_HEADERS = [
  '选题ID','选题标题','适用年级','教材模块','知识点','内容类型','难度','时政关联',
  '选题来源','视频时长','发布时间段','标题关键词','封面类型','开头hook','使用状态','发布日期',
  '抖音-播放量','抖音-点赞数','抖音-评论数','抖音-收藏数','抖音-转发数','抖音-完播率',
  '小红书-播放量','小红书-点赞数','小红书-评论数','小红书-收藏数','小红书-转发数',
  'B站-播放量','B站-点赞数','B站-评论数','B站-收藏数','B站-转发数','B站-完播率',
  '视频号-播放量','视频号-点赞数','视频号-评论数','视频号-收藏数','视频号-转发数',
  '涨粉数','流量评级','流量备注','创建日期','备注'
];

document.getElementById('btnExport').addEventListener('click', () => {
  const rows = [CSV_HEADERS.join(',')];
  topics.forEach(t => {
    rows.push(CSV_FIELDS.map(f => {
      const v = String(t[f] || '');
      return v.includes(',') || v.includes('"') || v.includes('\n') ? '"'+v.replace(/"/g,'""')+'"' : v;
    }).join(','));
  });
  const blob = new Blob(['\uFEFF'+rows.join('\n')], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '选题库_' + today() + '.csv';
  a.click();
});

document.getElementById('btnImport').addEventListener('click', () => document.getElementById('fileImport').click());
document.getElementById('fileImport').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const lines = ev.target.result.split('\n').filter(l => l.trim());
    if (lines.length < 2) return alert('CSV 文件为空');
    // 解析 header 映射
    const headers = parseCSVLine(lines[0]);
    const headerMap = {};
    headers.forEach((h, i) => {
      const idx = CSV_HEADERS.indexOf(h.trim());
      if (idx >= 0) headerMap[i] = CSV_FIELDS[idx];
    });

    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const vals = parseCSVLine(lines[i]);
      const obj = {};
      vals.forEach((v, ci) => {
        if (headerMap[ci]) obj[headerMap[ci]] = v.trim();
      });
      if (!obj.title) return;
      // 数字字段转换
      ['dy_play','dy_like','dy_comment','dy_fav','dy_share','xhs_play','xhs_like','xhs_comment','xhs_fav','xhs_share',
       'bili_play','bili_like','bili_comment','bili_fav','bili_share','sph_play','sph_like','sph_comment','sph_fav','sph_share','newFollowers'
      ].forEach(k => { if (obj[k]) obj[k] = parseInt(obj[k]) || 0; });

      if (!obj.id) obj.id = nextId(topics);
      if (!obj.status) obj.status = '未用';
      if (!obj.createdAt) obj.createdAt = today();

      const existing = topics.findIndex(t => t.id === obj.id);
      if (existing >= 0) topics[existing] = {...topics[existing], ...obj};
      else topics.push(obj);
      imported++;
    }
    saveTopics(topics);
    renderTopics();
    alert(`成功导入 ${imported} 条选题`);
  };
  reader.readAsText(file);
  e.target.value = '';
});

function parseCSVLine(line) {
  const result = [];
  let current = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i+1] === '"') { current += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else current += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { result.push(current); current = ''; }
      else current += ch;
    }
  }
  result.push(current);
  return result;
}

// ========== 数据看板 ==========
function renderDashboard() {
  const used = topics.filter(t => t.status === '已用' && totalPlay(t) > 0);

  // 总览
  const allPlay = used.reduce((s,t) => s+totalPlay(t), 0);
  const allInteract = used.reduce((s,t) => s+totalInteract(t), 0);
  const allFollowers = used.reduce((s,t) => s+(t.newFollowers||0), 0);
  document.querySelector('#cardOverview .card-body').innerHTML = `
    <div class="overview-grid">
      <div><div class="overview-num">${topics.length}</div><div class="overview-label">总选题数</div></div>
      <div><div class="overview-num">${used.length}</div><div class="overview-label">已发布</div></div>
      <div><div class="overview-num">${topics.filter(t=>t.status==='未用').length}</div><div class="overview-label">待使用</div></div>
      <div><div class="overview-num">${allPlay.toLocaleString()}</div><div class="overview-label">总播放量</div></div>
      <div><div class="overview-num">${allInteract.toLocaleString()}</div><div class="overview-label">总互动量</div></div>
      <div><div class="overview-num">+${allFollowers.toLocaleString()}</div><div class="overview-label">总涨粉</div></div>
    </div>`;

  // 模块流量排行
  renderBarChart('#cardModule .card-body', groupBy(used, 'module'), t => totalPlay(t));

  // 内容类型对比
  renderBarChart('#cardType .card-body', groupBy(used, 'contentType'), t => totalPlay(t));

  // 平台表现对比
  const platData = [
    {label:'抖音', val: used.reduce((s,t)=>s+(t.dy_play||0),0)},
    {label:'小红书', val: used.reduce((s,t)=>s+(t.xhs_play||0),0)},
    {label:'B站', val: used.reduce((s,t)=>s+(t.bili_play||0),0)},
    {label:'视频号', val: used.reduce((s,t)=>s+(t.sph_play||0),0)}
  ];
  const platMax = Math.max(...platData.map(p=>p.val), 1);
  document.querySelector('#cardPlatform .card-body').innerHTML = platData.map(p => `
    <div class="bar-row">
      <div class="bar-label">${p.label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(p.val/platMax*100).toFixed(1)}%">${p.val>0?shortNum(p.val):''}</div></div>
      <div class="bar-value">${p.val.toLocaleString()}</div>
    </div>`).join('');

  // 难度与流量
  renderBarChart('#cardDifficulty .card-body', groupBy(used, 'difficulty'), t => totalPlay(t), true);

  // Hook 类型效果
  const hooked = used.filter(t => t.hook);
  renderBarChart('#cardHook .card-body', groupBy(hooked, 'hook'), t => totalPlay(t), true);

  // 发布时间分析
  const timed = used.filter(t => t.publishTime);
  if (timed.length) {
    const timeGroups = {};
    timed.forEach(t => {
      const h = parseInt(t.publishTime);
      let slot = '其他';
      if (h >= 6 && h < 9) slot = '早间 6-9';
      else if (h >= 9 && h < 12) slot = '上午 9-12';
      else if (h >= 12 && h < 14) slot = '午间 12-14';
      else if (h >= 14 && h < 18) slot = '下午 14-18';
      else if (h >= 18 && h < 21) slot = '晚间 18-21';
      else if (h >= 21 || h < 6) slot = '深夜 21-6';
      if (!timeGroups[slot]) timeGroups[slot] = [];
      timeGroups[slot].push(t);
    });
    renderBarChartFromGroups('#cardTime .card-body', timeGroups, t => totalPlay(t), true);
  } else {
    document.querySelector('#cardTime .card-body').innerHTML = '<div style="color:#94a3b8;text-align:center;padding:20px;">暂无发布时间数据</div>';
  }

  // 高流量关键词
  const kwMap = {};
  used.forEach(t => {
    if (!t.keywords) return;
    t.keywords.split(/[;；,，]/).forEach(kw => {
      kw = kw.trim();
      if (!kw) return;
      if (!kwMap[kw]) kwMap[kw] = {count:0, play:0};
      kwMap[kw].count++;
      kwMap[kw].play += totalPlay(t);
    });
  });
  const kwList = Object.entries(kwMap).sort((a,b) => b[1].play - a[1].play).slice(0, 10);
  if (kwList.length) {
    const kwMax = Math.max(...kwList.map(k=>k[1].play), 1);
    document.querySelector('#cardKeywords .card-body').innerHTML = kwList.map(([kw, d]) => `
      <div class="bar-row">
        <div class="bar-label">${kw}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(d.play/kwMax*100).toFixed(1)}%">${shortNum(d.play)}</div></div>
        <div class="bar-value">×${d.count}</div>
      </div>`).join('');
  } else {
    document.querySelector('#cardKeywords .card-body').innerHTML = '<div style="color:#94a3b8;text-align:center;padding:20px;">暂无关键词数据</div>';
  }
}

function groupBy(arr, key) {
  const groups = {};
  arr.forEach(t => {
    const k = t[key] || '未知';
    if (!groups[k]) groups[k] = [];
    groups[k].push(t);
  });
  return groups;
}

function renderBarChart(selector, groups, valueFn, avg = false) {
  const entries = Object.entries(groups).map(([label, items]) => {
    const total = items.reduce((s,t) => s + valueFn(t), 0);
    return {label, val: avg ? Math.round(total / items.length) : total, count: items.length};
  }).sort((a,b) => b.val - a.val);

  const max = Math.max(...entries.map(e=>e.val), 1);
  document.querySelector(selector).innerHTML = entries.length ? entries.map(e => `
    <div class="bar-row">
      <div class="bar-label" title="${e.label}">${e.label.replace(/[《》]/g,'')}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(e.val/max*100).toFixed(1)}%">${e.val>0?shortNum(e.val):''}</div></div>
      <div class="bar-value">${avg?'均':'共'}${e.val.toLocaleString()} (${e.count}条)</div>
    </div>`).join('') : '<div style="color:#94a3b8;text-align:center;padding:20px;">暂无数据</div>';
}

function renderBarChartFromGroups(selector, groups, valueFn, avg = false) {
  const entries = Object.entries(groups).map(([label, items]) => {
    const total = items.reduce((s,t) => s + valueFn(t), 0);
    return {label, val: avg ? Math.round(total / items.length) : total, count: items.length};
  }).sort((a,b) => b.val - a.val);

  const max = Math.max(...entries.map(e=>e.val), 1);
  document.querySelector(selector).innerHTML = entries.map(e => `
    <div class="bar-row">
      <div class="bar-label">${e.label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(e.val/max*100).toFixed(1)}%">${e.val>0?shortNum(e.val):''}</div></div>
      <div class="bar-value">${avg?'均':'共'}${e.val.toLocaleString()} (${e.count}条)</div>
    </div>`).join('');
}

function shortNum(n) {
  if (n >= 10000) return (n/10000).toFixed(1) + 'w';
  if (n >= 1000) return (n/1000).toFixed(1) + 'k';
  return String(n);
}

// ========== 智能推荐 ==========
function renderRecommend() {
  const used = topics.filter(t => t.status === '已用' && totalPlay(t) > 0);

  // 1. 高潜力方向：找平均播放量最高的模块和类型组合
  const combos = {};
  used.forEach(t => {
    const key = t.module + ' × ' + t.contentType;
    if (!combos[key]) combos[key] = {items:[], module: t.module, type: t.contentType};
    combos[key].items.push(t);
  });
  const hotCombos = Object.entries(combos)
    .map(([label, d]) => ({
      label,
      avg: Math.round(d.items.reduce((s,t) => s+totalPlay(t), 0) / d.items.length),
      count: d.items.length
    }))
    .filter(c => c.count >= 1)
    .sort((a,b) => b.avg - a.avg)
    .slice(0, 8);

  document.querySelector('#cardHotModule .card-body').innerHTML = hotCombos.length
    ? hotCombos.map((c,i) => `<div class="rec-item">
        <strong>${i+1}. ${c.label}</strong>
        <div class="rec-reason">均播放 ${c.avg.toLocaleString()} | 已做 ${c.count} 条 ${c.count < 3 ? '⚡ 产量少但效果好，值得加量' : ''}</div>
      </div>`).join('')
    : '<div style="color:#94a3b8;padding:20px;text-align:center;">发布更多视频后解锁推荐</div>';

  // 2. 未覆盖知识点：找还没做过的模块
  const coveredModules = new Set(topics.map(t => t.module));
  const uncovered = ALL_MODULES.filter(m => !coveredModules.has(m));
  // 也找每个模块下选题少的
  const moduleCounts = {};
  ALL_MODULES.forEach(m => moduleCounts[m] = 0);
  topics.forEach(t => { if (moduleCounts[t.module] !== undefined) moduleCounts[t.module]++; });
  const sparse = ALL_MODULES
    .map(m => ({module: m, count: moduleCounts[m]}))
    .sort((a,b) => a.count - b.count)
    .slice(0, 5);

  let uncoveredHtml = '';
  if (uncovered.length) {
    uncoveredHtml += '<div style="margin-bottom:8px;font-weight:600;color:#ef4444;">完全未覆盖：</div>';
    uncoveredHtml += uncovered.map(m => `<div class="rec-item">${m}</div>`).join('');
  }
  uncoveredHtml += '<div style="margin-top:12px;margin-bottom:8px;font-weight:600;">选题最少的模块：</div>';
  uncoveredHtml += sparse.map(s => `<div class="rec-item">${s.module.replace(/[《》]/g,'')} — ${s.count} 条选题</div>`).join('');
  document.querySelector('#cardUncovered .card-body').innerHTML = uncoveredHtml;

  // 3. 值得翻新的选题：已用但流量好的老选题
  const redoable = used
    .filter(t => {
      if (!t.publishDate) return false;
      const days = (Date.now() - new Date(t.publishDate).getTime()) / 86400000;
      return days > 60; // 发布超过60天
    })
    .sort((a,b) => totalPlay(b) - totalPlay(a))
    .slice(0, 5);

  document.querySelector('#cardRedo .card-body').innerHTML = redoable.length
    ? redoable.map(t => `<div class="rec-item">
        <strong>${t.title}</strong>
        <div class="rec-reason">播放 ${totalPlay(t).toLocaleString()} | 发布于 ${t.publishDate} | 可以用新角度/新时政重做</div>
      </div>`).join('')
    : '<div style="color:#94a3b8;padding:20px;text-align:center;">发布60天以上的高流量选题会出现在这里</div>';

  // 4. 下一步建议
  const suggestions = [];

  // 建议1：基于最佳类型
  if (used.length >= 3) {
    const typeAvg = {};
    used.forEach(t => {
      if (!typeAvg[t.contentType]) typeAvg[t.contentType] = {sum:0, count:0};
      typeAvg[t.contentType].sum += totalPlay(t);
      typeAvg[t.contentType].count++;
    });
    const bestType = Object.entries(typeAvg)
      .map(([type, d]) => ({type, avg: d.sum/d.count}))
      .sort((a,b) => b.avg - a.avg)[0];
    if (bestType) {
      suggestions.push(`📈 「${bestType.type}」类内容平均播放最高（${shortNum(Math.round(bestType.avg))}），建议多产这类`);
    }
  }

  // 建议2：基于平台差异
  if (used.length >= 3) {
    const platTotals = {
      '抖音': used.reduce((s,t)=>s+(t.dy_play||0),0),
      '小红书': used.reduce((s,t)=>s+(t.xhs_play||0),0),
      'B站': used.reduce((s,t)=>s+(t.bili_play||0),0),
      '视频号': used.reduce((s,t)=>s+(t.sph_play||0),0)
    };
    const bestPlat = Object.entries(platTotals).sort((a,b)=>b[1]-a[1])[0];
    const worstPlat = Object.entries(platTotals).sort((a,b)=>a[1]-b[1])[0];
    if (bestPlat[1] > 0) {
      suggestions.push(`📱 ${bestPlat[0]}是你的主力平台（${shortNum(bestPlat[1])}播放），${worstPlat[0]}相对弱（${shortNum(worstPlat[1])}），可以针对性优化`);
    }
  }

  // 建议3：未用选题提醒
  const unused = topics.filter(t => t.status === '未用');
  if (unused.length > 0) {
    suggestions.push(`📝 还有 ${unused.length} 条选题未使用，别让好想法落灰`);
  }

  // 建议4：数据量提醒
  if (used.length < 10) {
    suggestions.push(`📊 目前只有 ${used.length} 条有流量数据，积累到 20+ 条后分析会更准`);
  }

  // 建议5：基于 hook
  const hookUsed = used.filter(t => t.hook);
  if (hookUsed.length >= 3) {
    const hookAvg = {};
    hookUsed.forEach(t => {
      if (!hookAvg[t.hook]) hookAvg[t.hook] = {sum:0, count:0};
      hookAvg[t.hook].sum += totalPlay(t);
      hookAvg[t.hook].count++;
    });
    const bestHook = Object.entries(hookAvg)
      .map(([hook, d]) => ({hook, avg: d.sum/d.count}))
      .sort((a,b) => b.avg - a.avg)[0];
    if (bestHook) {
      suggestions.push(`🎣 开头用「${bestHook.hook}」效果最好，均播放 ${shortNum(Math.round(bestHook.avg))}`);
    }
  }

  document.querySelector('#cardNext .card-body').innerHTML = suggestions.length
    ? suggestions.map(s => `<div class="rec-item">${s}</div>`).join('')
    : '<div style="color:#94a3b8;padding:20px;text-align:center;">积累更多数据后解锁个性化建议</div>';
}

// ========== 初始化 ==========
renderTopics();
