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
  const cats1 = [...new Set(topics.map(t=>t.category1).filter(Boolean))];
  const cats2 = [...new Set(topics.map(t=>t.category2).filter(Boolean))];
  filterCategory.innerHTML = '<option value="">全部分类</option>' + cats1.map(c=>`<option>${c}</option>`).join('');
  filterType.innerHTML = '<option value="">全部类型</option>' + cats2.map(c=>`<option>${c}</option>`).join('');
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
  f.category2.value = t.category2 || '';
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
