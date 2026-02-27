// ========== 数据层 ==========
const STORAGE_KEY = 'politics_topics_pro';
const ALL_MODULES = [
  '必修1《中国特色社会主义》','必修2《经济与社会》','必修3《政治与法治》',
  '必修4《哲学与文化》','选必1《当代国际政治与经济》','选必2《法律与生活》','选必3《逻辑与思维》'
];
const FIELDS = [
  'id','title','series','category1','category2','questionType','examPoint','keywords',
  'grade','scene','coreProblem','valuePromise','hook','outline','caseSource','solution',
  'templateSentence','materialHook','conversionAction','productLink','priority','status',
  'owner','planShootDate','planPublishDate','publishDate','channel','publishTime','duration',
  'coverTitle','coverSub','titleA','titleB','titleC','publishUrl',
  'views','finishRate','avgWatch','likes','favs','comments','shares','inquiries',
  'conversionResult','topComments','reviewNotes','nextTopic','nextAction','createdAt'
];
const CSV_HEADERS = [
  'ID','选题标题','系列/栏目','一级分类（母题）','二级分类（内容类型）','题型','对应考点/章节','关键词标签（3-5个）',
  '目标年级/人群','场景/触发','核心矛盾（他们卡在哪）','价值承诺（看完收获）','钩子一句话（前3秒）','结构大纲（3点）','例题/案例来源','你提供的解法（一句话）',
  '可抄模板/关键句','资料钩子（领什么）','转化动作（评论/私信关键词）','产品承接（试听/课包/1v1）','优先级评分（1-10）','制作状态',
  '负责人','计划拍摄日','计划发布日期','实际发布日期','发布渠道','发布时间段','时长（秒）',
  '封面6字大字','封面副标题（12字）','标题A','标题B','标题C','发布链接',
  '播放量','完播率','平均观看时长（秒）','点赞数','收藏数','评论数','转发数','私信/咨询数',
  '转化结果（加微/报名/成交）','评论区高频问题','复盘要点（为什么好/差）','下一条延伸选题','下次优化动作（1句话）','创建日期'
];
const NUM_FIELDS = ['views','avgWatch','likes','favs','comments','shares','inquiries','duration','priority'];

function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } }
function save(d) { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }
function nextId(d) {
  const nums = d.map(t => parseInt(String(t.id).replace(/\D/g,''))).filter(n=>!isNaN(n));
  return String((nums.length ? Math.max(...nums) : 0) + 1);
}
function today() { return new Date().toISOString().slice(0,10); }
function num(el) { return parseInt(el.value) || 0; }
function shortNum(n) { if(n>=10000) return (n/10000).toFixed(1)+'w'; if(n>=1000) return (n/1000).toFixed(1)+'k'; return String(n); }

let topics = load();
let editingId = null;

// ========== 分类联动 ==========
const CAT2_MAP = {
  '1.流量获客类': ['1.1 热点政治解读','1.2 学科价值重塑','1.3 考试避坑指南','1.4 学习方法论'],
  '2.信任建立类': ['2.1 干货知识拆解','2.2 真题逻辑复盘','2.3 备考进度规划','2.4 作业/试卷点评'],
  '3.变现转化类': ['3.1 课程精华片段','3.2 学员反馈见证','3.3 课程大纲解读','3.4 限时变现活动'],
  '4.辅助选题': ['4.1 教师日常生活','4.2 教育观念碰撞']
};
const ALL_CAT2 = Object.values(CAT2_MAP).flat();

function updateCat2(selectEl, cat1, currentVal) {
  const opts = cat1 && CAT2_MAP[cat1] ? CAT2_MAP[cat1] : ALL_CAT2;
  selectEl.innerHTML = '<option value="">请选择</option>' + opts.map(o =>
    `<option${o === currentVal ? ' selected' : ''}>${o}</option>`
  ).join('');
}

// 表单内联动
document.querySelector('select[name="category1"]').addEventListener('change', function() {
  updateCat2(document.getElementById('category2Select'), this.value, '');
});

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

// Form tabs
document.querySelectorAll('.ftab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.ftab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.ftab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('ftab-' + btn.dataset.ftab).classList.add('active');
  });
});

// ========== 搜索 & 筛选 ==========
const searchInput = document.getElementById('searchInput');
const filterGrade = document.getElementById('filterGrade');
const filterCategory = document.getElementById('filterCategory');
const filterType = document.getElementById('filterType');
const filterStatus = document.getElementById('filterStatus');
const filterPriority = document.getElementById('filterPriority');

[searchInput].forEach(el => el.addEventListener('input', renderTopics));
[filterGrade, filterCategory, filterType, filterStatus, filterPriority].forEach(el => el.addEventListener('change', renderTopics));

function updateFilterOptions() {
  // 筛选选项已预设在HTML中，无需动态更新
}

function getFiltered() {
  const q = searchInput.value.toLowerCase();
  return topics.filter(t => {
    if (q) {
      const hay = [t.title,t.examPoint,t.keywords,t.hook,t.category1,t.category2,t.series].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filterGrade.value && t.grade !== filterGrade.value) return false;
    if (filterCategory.value && t.category1 !== filterCategory.value) return false;
    if (filterType.value && t.category2 !== filterType.value) return false;
    if (filterStatus.value && t.status !== filterStatus.value) return false;
    if (filterPriority.value) {
      const p = t.priority || 5;
      if (filterPriority.value === 'high' && p < 8) return false;
      if (filterPriority.value === 'mid' && (p < 5 || p > 7)) return false;
      if (filterPriority.value === 'low' && p > 4) return false;
    }
    return true;
  });
}

// ========== 选题列表渲染 ==========
function renderTopics() {
  const filtered = getFiltered();
  const list = document.getElementById('topicList');
  const statsBar = document.getElementById('statsBar');

  const published = filtered.filter(t => t.status === '已发布');
  const totalViews = published.reduce((s,t) => s + (t.views||0), 0);
  statsBar.innerHTML = `共 <span>${filtered.length}</span> 条 | 已发布 <span>${published.length}</span> | 待拍摄 <span>${filtered.filter(t=>t.status==='待拍摄').length}</span> | 总播放 <span>${totalViews.toLocaleString()}</span>`;

  if (!filtered.length) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">暂无选题，点击"+ 新增选题"开始</div>';
    return;
  }

  list.innerHTML = filtered.map(t => {
    const p = t.priority || 5;
    const pClass = p >= 8 ? 'priority-high' : p >= 5 ? 'priority-mid' : 'priority-low';
    const hasTraffic = (t.views||0) > 0;
    const interact = (t.likes||0)+(t.comments||0)+(t.favs||0)+(t.shares||0);

    return `<div class="topic-card" data-id="${t.id}">
      <div class="topic-header">
        <span class="topic-title">${t.title||'无标题'}</span>
        <span class="topic-priority ${pClass}">${p}</span>
        <span class="topic-id">#${t.id}</span>
      </div>
      <div class="topic-tags">
        ${t.grade ? `<span class="tag tag-grade">${t.grade}</span>` : ''}
        ${t.category1 ? `<span class="tag tag-cat1">${t.category1}</span>` : ''}
        ${t.category2 ? `<span class="tag tag-cat2">${t.category2}</span>` : ''}
        ${t.status ? `<span class="tag tag-status">${t.status}</span>` : ''}
        ${t.series ? `<span class="tag">${t.series}</span>` : ''}
      </div>
      ${t.hook ? `<div class="topic-hook">🎣 "${t.hook}"</div>` : ''}
      ${t.examPoint ? `<div class="topic-meta">📌 ${t.examPoint}</div>` : ''}
      ${t.coverTitle ? `<div class="topic-meta">🖼️ ${t.coverTitle}${t.coverSub ? ' — '+t.coverSub : ''}</div>` : ''}
      ${hasTraffic ? `<div class="topic-traffic">
        <span>播放 <strong>${(t.views||0).toLocaleString()}</strong></span>
        <span>互动 <strong>${interact.toLocaleString()}</strong></span>
        ${t.finishRate ? `<span>完播 <strong>${t.finishRate}</strong></span>` : ''}
        ${t.inquiries ? `<span>咨询 <strong>${t.inquiries}</strong></span>` : ''}
      </div>` : ''}
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
  // 重置到第一个tab
  document.querySelectorAll('.ftab').forEach((b,i) => b.classList.toggle('active', i===0));
  document.querySelectorAll('.ftab-panel').forEach((p,i) => p.classList.toggle('active', i===0));
  modal.classList.remove('hidden');
});

document.getElementById('modalClose').addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });

function openEdit(id) {
  const t = topics.find(x => String(x.id) === String(id));
  if (!t) return;
  editingId = id;
  document.getElementById('modalTitle').textContent = '编辑选题 #' + id;
  btnDelete.classList.remove('hidden');
  // 重置到第一个tab
  document.querySelectorAll('.ftab').forEach((b,i) => b.classList.toggle('active', i===0));
  document.querySelectorAll('.ftab-panel').forEach((p,i) => p.classList.toggle('active', i===0));

  const f = form;
  f.title.value = t.title || '';
  f.series.value = t.series || '';
  f.category1.value = t.category1 || '';
  updateCat2(document.getElementById('category2Select'), t.category1, t.category2);
  f.questionType.value = t.questionType || '';
  f.examPoint.value = t.examPoint || '';
  f.keywords.value = t.keywords || '';
  f.grade.value = t.grade || '高三';
  f.priority.value = t.priority || 5;
  f.status.value = t.status || '待策划';
  f.owner.value = t.owner || '';
  f.planShootDate.value = t.planShootDate || '';
  f.planPublishDate.value = t.planPublishDate || '';
  f.scene.value = t.scene || '';
  f.coreProblem.value = t.coreProblem || '';
  f.valuePromise.value = t.valuePromise || '';
  f.hook.value = t.hook || '';
  f.outline.value = t.outline || '';
  f.caseSource.value = t.caseSource || '';
  f.solution.value = t.solution || '';
  f.templateSentence.value = t.templateSentence || '';
  f.materialHook.value = t.materialHook || '';
  f.conversionAction.value = t.conversionAction || '';
  f.productLink.value = t.productLink || '';
  f.publishDate.value = t.publishDate || '';
  f.channel.value = t.channel || '';
  f.publishTime.value = t.publishTime || '';
  f.duration.value = t.duration || '';
  f.coverTitle.value = t.coverTitle || '';
  f.coverSub.value = t.coverSub || '';
  f.titleA.value = t.titleA || '';
  f.titleB.value = t.titleB || '';
  f.titleC.value = t.titleC || '';
  f.publishUrl.value = t.publishUrl || '';
  f.views.value = t.views || '';
  f.finishRate.value = t.finishRate || '';
  f.avgWatch.value = t.avgWatch || '';
  f.likes.value = t.likes || '';
  f.favs.value = t.favs || '';
  f.comments.value = t.comments || '';
  f.shares.value = t.shares || '';
  f.inquiries.value = t.inquiries || '';
  f.conversionResult.value = t.conversionResult || '';
  f.topComments.value = t.topComments || '';
  f.reviewNotes.value = t.reviewNotes || '';
  f.nextTopic.value = t.nextTopic || '';
  f.nextAction.value = t.nextAction || '';

  modal.classList.remove('hidden');
}

// ========== 保存 ==========
form.addEventListener('submit', e => {
  e.preventDefault();
  const f = form;
  const data = {
    id: editingId || nextId(topics),
    title: f.title.value.trim(),
    series: f.series.value.trim(),
    category1: f.category1.value.trim(),
    category2: f.category2.value.trim(),
    questionType: f.questionType.value.trim(),
    examPoint: f.examPoint.value.trim(),
    keywords: f.keywords.value.trim(),
    grade: f.grade.value,
    scene: f.scene.value.trim(),
    coreProblem: f.coreProblem.value.trim(),
    valuePromise: f.valuePromise.value.trim(),
    hook: f.hook.value.trim(),
    outline: f.outline.value.trim(),
    caseSource: f.caseSource.value.trim(),
    solution: f.solution.value.trim(),
    templateSentence: f.templateSentence.value.trim(),
    materialHook: f.materialHook.value.trim(),
    conversionAction: f.conversionAction.value.trim(),
    productLink: f.productLink.value.trim(),
    priority: num(f.priority),
    status: f.status.value,
    owner: f.owner.value.trim(),
    planShootDate: f.planShootDate.value,
    planPublishDate: f.planPublishDate.value,
    publishDate: f.publishDate.value,
    channel: f.channel.value.trim(),
    publishTime: f.publishTime.value.trim(),
    duration: num(f.duration),
    coverTitle: f.coverTitle.value.trim(),
    coverSub: f.coverSub.value.trim(),
    titleA: f.titleA.value.trim(),
    titleB: f.titleB.value.trim(),
    titleC: f.titleC.value.trim(),
    publishUrl: f.publishUrl.value.trim(),
    views: num(f.views),
    finishRate: f.finishRate.value.trim(),
    avgWatch: num(f.avgWatch),
    likes: num(f.likes),
    favs: num(f.favs),
    comments: num(f.comments),
    shares: num(f.shares),
    inquiries: num(f.inquiries),
    conversionResult: f.conversionResult.value.trim(),
    topComments: f.topComments.value.trim(),
    reviewNotes: f.reviewNotes.value.trim(),
    nextTopic: f.nextTopic.value.trim(),
    nextAction: f.nextAction.value.trim(),
    createdAt: editingId ? (topics.find(t=>String(t.id)===String(editingId))||{}).createdAt || today() : today()
  };

  if (editingId) {
    const idx = topics.findIndex(t => String(t.id) === String(editingId));
    if (idx >= 0) topics[idx] = data;
  } else {
    topics.push(data);
  }

  save(topics);
  updateFilterOptions();
  modal.classList.add('hidden');
  renderTopics();
});

// ========== 删除 ==========
btnDelete.addEventListener('click', () => {
  if (!editingId) return;
  if (!confirm('确定删除这条选题？')) return;
  topics = topics.filter(t => String(t.id) !== String(editingId));
  save(topics);
  updateFilterOptions();
  modal.classList.add('hidden');
  renderTopics();
});

// ========== CSV 导出 ==========
document.getElementById('btnExport').addEventListener('click', () => {
  const rows = [CSV_HEADERS.join(',')];
  topics.forEach(t => {
    rows.push(FIELDS.map(f => {
      const v = String(t[f] == null ? '' : t[f]);
      return v.includes(',') || v.includes('"') || v.includes('\n') ? '"'+v.replace(/"/g,'""')+'"' : v;
    }).join(','));
  });
  const blob = new Blob(['\uFEFF'+rows.join('\n')], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '选题库_' + today() + '.csv';
  a.click();
});

// ========== CSV 导入 ==========
document.getElementById('btnImport').addEventListener('click', () => document.getElementById('fileImport').click());
document.getElementById('fileImport').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const lines = ev.target.result.split('\n').filter(l => l.trim());
    if (lines.length < 2) return alert('CSV 文件为空');
    const headers = parseCSVLine(lines[0]);
    const headerMap = {};
    headers.forEach((h, i) => {
      const idx = CSV_HEADERS.indexOf(h.trim().replace(/^\uFEFF/,''));
      if (idx >= 0) headerMap[i] = FIELDS[idx];
    });

    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const vals = parseCSVLine(lines[i]);
      const obj = {};
      vals.forEach((v, ci) => { if (headerMap[ci]) obj[headerMap[ci]] = v.trim(); });
      if (!obj.title) continue;
      NUM_FIELDS.forEach(k => { if (obj[k]) obj[k] = parseInt(obj[k]) || 0; });
      if (!obj.id) obj.id = nextId(topics);
      if (!obj.status) obj.status = '待策划';
      if (!obj.createdAt) obj.createdAt = today();

      const existing = topics.findIndex(t => String(t.id) === String(obj.id));
      if (existing >= 0) topics[existing] = {...topics[existing], ...obj};
      else topics.push(obj);
      imported++;
    }
    save(topics);
    updateFilterOptions();
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
  const published = topics.filter(t => t.status === '已发布');
  const withData = published.filter(t => (t.views||0) > 0);

  // 总览
  const totalViews = withData.reduce((s,t) => s+(t.views||0), 0);
  const totalLikes = withData.reduce((s,t) => s+(t.likes||0), 0);
  const totalFavs = withData.reduce((s,t) => s+(t.favs||0), 0);
  const totalComments = withData.reduce((s,t) => s+(t.comments||0), 0);
  const totalInquiries = withData.reduce((s,t) => s+(t.inquiries||0), 0);
  document.querySelector('#cardOverview .card-body').innerHTML = `
    <div class="overview-grid">
      <div><div class="overview-num">${topics.length}</div><div class="overview-label">总选题</div></div>
      <div><div class="overview-num">${published.length}</div><div class="overview-label">已发布</div></div>
      <div><div class="overview-num">${topics.filter(t=>t.status==='待策划'||t.status==='待拍摄').length}</div><div class="overview-label">待制作</div></div>
      <div><div class="overview-num">${totalViews.toLocaleString()}</div><div class="overview-label">总播放</div></div>
      <div><div class="overview-num">${(totalLikes+totalFavs+totalComments).toLocaleString()}</div><div class="overview-label">总互动</div></div>
      <div><div class="overview-num">${totalInquiries}</div><div class="overview-label">总咨询</div></div>
    </div>`;

  // 分类流量排行
  renderBarChart('#cardCategory .card-body', groupBy(withData,'category1'), t=>t.views||0);
  // 内容类型对比
  renderBarChart('#cardType .card-body', groupBy(withData,'category2'), t=>t.views||0);

  // 发布渠道分析
  const channels = {};
  withData.forEach(t => {
    if (!t.channel) return;
    t.channel.split(/[/\/、,，]/).forEach(ch => {
      ch = ch.trim();
      if (!ch) return;
      if (!channels[ch]) channels[ch] = [];
      channels[ch].push(t);
    });
  });
  renderBarChartFromGroups('#cardChannel .card-body', channels, t=>t.views||0);

  // 钩子效果
  const hooked = withData.filter(t => t.hook);
  if (hooked.length) {
    const hookLen = {};
    hooked.forEach(t => {
      const len = t.hook.length <= 15 ? '短(≤15字)' : t.hook.length <= 25 ? '中(16-25字)' : '长(>25字)';
      if (!hookLen[len]) hookLen[len] = [];
      hookLen[len].push(t);
    });
    renderBarChartFromGroups('#cardHook .card-body', hookLen, t=>t.views||0, true);
  } else {
    document.querySelector('#cardHook .card-body').innerHTML = noData();
  }

  // 发布时间分析
  const timed = withData.filter(t => t.publishTime);
  if (timed.length) {
    const timeGroups = {};
    timed.forEach(t => {
      const h = parseInt(t.publishTime);
      let slot = '其他';
      if (h >= 6 && h < 12) slot = '上午 6-12';
      else if (h >= 12 && h < 18) slot = '下午 12-18';
      else if (h >= 18 && h < 21) slot = '晚间 18-21';
      else if (h >= 21 || h < 6) slot = '深夜 21-6';
      if (!timeGroups[slot]) timeGroups[slot] = [];
      timeGroups[slot].push(t);
    });
    renderBarChartFromGroups('#cardTime .card-body', timeGroups, t=>t.views||0, true);
  } else {
    document.querySelector('#cardTime .card-body').innerHTML = noData();
  }

  // 转化漏斗
  if (withData.length) {
    const funnel = [
      {label:'播放', val: totalViews},
      {label:'点赞', val: totalLikes},
      {label:'收藏', val: totalFavs},
      {label:'评论', val: totalComments},
      {label:'咨询', val: totalInquiries}
    ];
    const fMax = Math.max(...funnel.map(f=>f.val), 1);
    document.querySelector('#cardConversion .card-body').innerHTML = funnel.map(f => `
      <div class="funnel-step">
        <div class="funnel-label">${f.label}</div>
        <div class="funnel-bar" style="width:${Math.max((f.val/fMax*100),5).toFixed(1)}%">${shortNum(f.val)}</div>
        <div class="funnel-value">${f.val.toLocaleString()}</div>
      </div>`).join('');
  } else {
    document.querySelector('#cardConversion .card-body').innerHTML = noData();
  }

  // 高流量关键词
  const kwMap = {};
  withData.forEach(t => {
    if (!t.keywords) return;
    t.keywords.split(/[;；,，、]/).forEach(kw => {
      kw = kw.trim();
      if (!kw) return;
      if (!kwMap[kw]) kwMap[kw] = {count:0, views:0};
      kwMap[kw].count++;
      kwMap[kw].views += (t.views||0);
    });
  });
  const kwList = Object.entries(kwMap).sort((a,b) => b[1].views - a[1].views).slice(0,10);
  if (kwList.length) {
    const kwMax = Math.max(...kwList.map(k=>k[1].views), 1);
    document.querySelector('#cardKeywords .card-body').innerHTML = kwList.map(([kw,d]) => `
      <div class="bar-row">
        <div class="bar-label">${kw}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(d.views/kwMax*100).toFixed(1)}%">${shortNum(d.views)}</div></div>
        <div class="bar-value">×${d.count}</div>
      </div>`).join('');
  } else {
    document.querySelector('#cardKeywords .card-body').innerHTML = noData();
  }
}

function noData() { return '<div style="color:#94a3b8;text-align:center;padding:20px;">暂无数据</div>'; }

function groupBy(arr, key) {
  const g = {};
  arr.forEach(t => { const k = t[key] || '未分类'; if (!g[k]) g[k] = []; g[k].push(t); });
  return g;
}

function renderBarChart(sel, groups, valFn, avg=false) {
  const entries = Object.entries(groups).map(([label, items]) => {
    const total = items.reduce((s,t) => s + valFn(t), 0);
    return {label, val: avg ? Math.round(total/items.length) : total, count: items.length};
  }).sort((a,b) => b.val - a.val);
  const max = Math.max(...entries.map(e=>e.val), 1);
  document.querySelector(sel).innerHTML = entries.length ? entries.map(e => `
    <div class="bar-row">
      <div class="bar-label" title="${e.label}">${e.label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(e.val/max*100).toFixed(1)}%">${e.val>0?shortNum(e.val):''}</div></div>
      <div class="bar-value">${avg?'均':'共'}${e.val.toLocaleString()} (${e.count})</div>
    </div>`).join('') : noData();
}

function renderBarChartFromGroups(sel, groups, valFn, avg=false) {
  const entries = Object.entries(groups).map(([label, items]) => {
    const total = items.reduce((s,t) => s + valFn(t), 0);
    return {label, val: avg ? Math.round(total/items.length) : total, count: items.length};
  }).sort((a,b) => b.val - a.val);
  const max = Math.max(...entries.map(e=>e.val), 1);
  document.querySelector(sel).innerHTML = entries.length ? entries.map(e => `
    <div class="bar-row">
      <div class="bar-label">${e.label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(e.val/max*100).toFixed(1)}%">${e.val>0?shortNum(e.val):''}</div></div>
      <div class="bar-value">${avg?'均':'共'}${e.val.toLocaleString()} (${e.count})</div>
    </div>`).join('') : noData();
}

// ========== 智能推荐 ==========
function renderRecommend() {
  const withData = topics.filter(t => t.status === '已发布' && (t.views||0) > 0);

  // 高潜力方向
  const combos = {};
  withData.forEach(t => {
    const key = (t.category1||'未分类') + ' × ' + (t.category2||'未分类');
    if (!combos[key]) combos[key] = [];
    combos[key].push(t);
  });
  const hotCombos = Object.entries(combos)
    .map(([label,items]) => ({label, avg: Math.round(items.reduce((s,t)=>s+(t.views||0),0)/items.length), count: items.length}))
    .sort((a,b) => b.avg - a.avg).slice(0,8);

  document.querySelector('#cardHotDir .card-body').innerHTML = hotCombos.length
    ? hotCombos.map((c,i) => `<div class="rec-item">
        <strong>${i+1}. ${c.label}</strong>
        <div class="rec-reason">均播放 ${c.avg.toLocaleString()} | ${c.count} 条 ${c.count<3?'⚡ 产量少效果好':''}
        </div></div>`).join('')
    : noData();

  // 未覆盖分类
  const coveredCat2 = new Set(topics.map(t=>t.category2).filter(Boolean));
  const uncovered = ALL_CAT2.filter(c => !coveredCat2.has(c));
  const cat1Count = {};
  Object.keys(CAT2_MAP).forEach(k => cat1Count[k] = 0);
  topics.forEach(t => { if (cat1Count[t.category1] !== undefined) cat1Count[t.category1]++; });
  const sparse = Object.entries(cat1Count).sort((a,b)=>a[1]-b[1]);

  let html = '';
  if (uncovered.length) {
    html += '<div style="margin-bottom:8px;font-weight:600;color:#ef4444;">未覆盖的内容类型：</div>';
    html += uncovered.map(c => `<div class="rec-item">${c}</div>`).join('');
  }
  html += '<div style="margin-top:12px;margin-bottom:8px;font-weight:600;">各分类选题数量：</div>';
  html += sparse.map(([k,v]) => `<div class="rec-item">${k} — ${v} 条</div>`).join('');
  document.querySelector('#cardUncovered .card-body').innerHTML = html;

  // 值得翻新
  const redoable = withData
    .filter(t => { if (!t.publishDate) return false; return (Date.now()-new Date(t.publishDate).getTime())/86400000 > 60; })
    .sort((a,b) => (b.views||0)-(a.views||0)).slice(0,5);
  document.querySelector('#cardRedo .card-body').innerHTML = redoable.length
    ? redoable.map(t => `<div class="rec-item"><strong>${t.title}</strong>
        <div class="rec-reason">播放 ${(t.views||0).toLocaleString()} | 发布于 ${t.publishDate}</div></div>`).join('')
    : '<div style="color:#94a3b8;padding:20px;text-align:center;">发布60天以上的高流量选题会出现在这里</div>';

  // 下一步建议
  const suggestions = [];
  if (withData.length >= 3) {
    const catAvg = {};
    withData.forEach(t => {
      const k = t.category1 || '未分类';
      if (!catAvg[k]) catAvg[k] = {sum:0,count:0};
      catAvg[k].sum += (t.views||0);
      catAvg[k].count++;
    });
    const best = Object.entries(catAvg).map(([k,d])=>({k,avg:d.sum/d.count})).sort((a,b)=>b.avg-a.avg)[0];
    if (best) suggestions.push(`📈 「${best.k}」均播放最高（${shortNum(Math.round(best.avg))}），建议多产`);
  }

  const unused = topics.filter(t => t.status === '待策划' || t.status === '待拍摄');
  if (unused.length) suggestions.push(`📝 还有 ${unused.length} 条选题待制作`);
  if (withData.length < 10) suggestions.push(`📊 目前 ${withData.length} 条有数据，积累20+条后分析更准`);

  if (withData.length >= 3) {
    const cat2Avg = {};
    withData.forEach(t => {
      const k = t.category2 || '未分类';
      if (!cat2Avg[k]) cat2Avg[k] = {sum:0,count:0};
      cat2Avg[k].sum += (t.views||0);
      cat2Avg[k].count++;
    });
    const bestType = Object.entries(cat2Avg).map(([k,d])=>({k,avg:d.sum/d.count})).sort((a,b)=>b.avg-a.avg)[0];
    if (bestType) suggestions.push(`🎯 「${bestType.k}」类型效果最好，均播放 ${shortNum(Math.round(bestType.avg))}`);
  }

  document.querySelector('#cardNext .card-body').innerHTML = suggestions.length
    ? suggestions.map(s => `<div class="rec-item">${s}</div>`).join('')
    : '<div style="color:#94a3b8;padding:20px;text-align:center;">积累更多数据后解锁建议</div>';
}

// ========== 初始化 ==========
async function init() {
  // 自动加载远程CSV数据
  try {
    const res = await fetch('data/new-topic.csv?t=' + Date.now());
    if (res.ok) {
      const text = await res.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length >= 2) {
        const headers = parseCSVLine(lines[0]);
        const headerMap = {};
        headers.forEach((h, i) => {
          const idx = CSV_HEADERS.indexOf(h.trim().replace(/^\uFEFF/,''));
          if (idx >= 0) headerMap[i] = FIELDS[idx];
        });

        let imported = 0;
        for (let i = 1; i < lines.length; i++) {
          const vals = parseCSVLine(lines[i]);
          const obj = {};
          vals.forEach((v, ci) => { if (headerMap[ci]) obj[headerMap[ci]] = v.trim(); });
          if (!obj.title) continue;
          NUM_FIELDS.forEach(k => { if (obj[k]) obj[k] = parseInt(obj[k]) || 0; });
          if (!obj.id) obj.id = nextId(topics);
          if (!obj.status) obj.status = '待策划';
          if (!obj.createdAt) obj.createdAt = today();

          // 只导入本地没有的（按ID判断）
          const existing = topics.findIndex(t => String(t.id) === String(obj.id));
          if (existing >= 0) topics[existing] = {...topics[existing], ...obj};
          else { topics.push(obj); imported++; }
        }
        if (imported > 0) save(topics);
      }
    }
  } catch(e) { /* 离线或加载失败，忽略 */ }

  updateFilterOptions();
  renderTopics();
}
init();
