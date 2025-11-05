/*******************************
 * โหลดข้อมูลราคา (จาก JSON)
 *******************************/
let railData = [];
let curtainData = [];
let sheerCurtainData = [];
let blindKDN = null;     // blindsData.json
let blindKACEE = null;   // ฺblindsDataKacee.json

async function loadPrice() {
  // ราง / ม่านทึบ / ม่านโปร่ง
  const res = await fetch('priceData.json');
  if (!res.ok) throw new Error('โหลด priceData.json ไม่สำเร็จ');
  const json = await res.json();
  railData = json.railData || [];
  curtainData = json.curtainData || [];
  sheerCurtainData = json.sheerCurtainData || [];

  // มู่ลี่ KDN
  try {
    const r1 = await fetch('blindsData.json');
    if (r1.ok) blindKDN = await r1.json();
  } catch {}

  // มู่ลี่ KACEE (ชื่อไฟล์มีสระบน)
  try {
    const r2 = await fetch('ฺblindsDataKacee.json');
    if (r2.ok) blindKACEE = await r2.json();
  } catch {}
}

/*******************************
 * Utilities
 *******************************/
const $  = (sel, root=document) => root.querySelector(sel);
const el = (tag, attrs={}) => Object.assign(document.createElement(tag), attrs);

const fmt = (n) => Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 });

/** แสดงตัวเลขขนาด:
 * - ถ้าผู้ใช้พิมพ์ทศนิยม >= 3 ตำแหน่ง → แสดงเท่าที่พิมพ์ (สูงสุด 3)
 * - อื่นๆ → แสดง 2 ตำแหน่ง
*/
const fmtSize = (val, inputEl) => {
  if (val === '' || val == null || isNaN(val)) return 'สูงตามสั่ง';
  const raw = (inputEl?.value ?? '').trim();
  const dec = raw.includes('.') ? (raw.split('.')[1]?.length || 0) : 0;
  const use = dec >= 3 ? Math.min(dec, 3) : 2;
  return Number(val).toFixed(use);
};

// --- Half-from-rail helpers ---
function halfFromRail(id, targetId){
  const railEl = document.querySelector(`#rw-${id}`);
  const tEl    = document.querySelector(`#${targetId}`);
  if (!railEl || !tEl) return;
  const rw = parseFloat(railEl.value);
  if (isNaN(rw)) return;

  const val = rw / 2;
  // ถ้าระบุทศนิยมในราง ≥ 3 ตำแหน่ง ให้คง 3 ตำแหน่ง; ไม่งั้นใช้ 2
  const keep3 = /\.\d{3,}/.test(railEl.value || "");
  tEl.value = keep3 ? val.toFixed(3) : val.toFixed(2);

  // ให้ระบบคำนวณ/สรุปอัปเดต
  tEl.dispatchEvent(new Event('input'));
  tEl.dispatchEvent(new Event('change'));
}

function attachHalfBtnOnce(id, target) {
  const group = document.querySelector(`#${target}-${id}`)?.closest('.form-group');
  if (!group || group.querySelector('.half-btn')) return;
  const btn = document.createElement('button');
  btn.textContent = 'แยกกลาง';   // <-- เดิมอาจเป็น '½ จากราง'
  btn.className = 'half-btn';
  btn.type = 'button';
  btn.onclick = () => halfFromRail(id, target);
  group.appendChild(btn);
}

const toNum = (v, d=0) => {
  const n = parseFloat(v);
  return isNaN(n) ? d : n;
};

// --- Auto summary (debounce) ---
let _sumT = null;
function autoSummarize(now = false){
  if (now) { summarizeAllItems(); return; }
  clearTimeout(_sumT);
  _sumT = setTimeout(summarizeAllItems, 150);
}

// === แทนที่ของเดิมทั้งบล็อก ===
function makeComboLabel(ct, ft) {
  const esc = s => (s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // มีคำว่า "สูงพิเศษ" ไหม (ฝั่งไหนก็ได้)
  const hasHigh = /สูงพิเศษ/i.test(ct) || /สูงพิเศษ/i.test(ft);

  // ชนิดม่านพื้นฐาน (ตัดคำว่า สูงพิเศษ ออกก่อน)
  const baseCt = (ct || '').replace(/\s*สูงพิเศษ/gi, '').trim();

  // fabric พื้นฐาน:
  // 1) ตัดชื่อชนิดม่านพื้นฐานออก
  // 2) ตัดชื่อชนิดม่านที่อาจพ่วงมาใน fabric (กันกรณีข้อมูลบางแถวเขียนนำหน้าไว้)
  // 3) ตัดคำว่า สูงพิเศษ ออก
  let f = (ft || '')
    .replace(new RegExp(esc(baseCt), 'gi'), '')
    .replace(/ม่านตาไก่|ม่านจีบ|ม่านลอน(?:เทป|ตะขอ)?|ม่านซ่อนหู/gi, '')
    .replace(/\s*สูงพิเศษ/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // ถ้าเหลือว่าง ให้คืนค่า ft เดิม (กันกรณีถูกตัดจนหมด)
  if (!f) f = (ft || '').replace(/\s*สูงพิเศษ/gi, '').trim();

  // ประกอบชื่อสุดท้าย และเติม "สูงพิเศษ" แค่ครั้งเดียวถ้ามี
  const label = `${baseCt} ${f}`.replace(/\s+/g, ' ').trim();
  return hasHigh ? `${label} สูงพิเศษ` : label;
}

function baseType(ct) {
  return String(ct || '').replace(/\s*สูงพิเศษ/gi, '').trim();
}

function bindAuto(el, fn) {
  if (!el) return;
  const handler = () => { fn(); autoSummarize(); };
  el.addEventListener('input',  handler);
  el.addEventListener('change', handler);
}


/*******************************
 * รวมตัวเลือกบนสุดของการ์ด
 *******************************/
function getCurtainCombos() {
  // จากชุดม่านทึบ (curtainData)
  const rows = curtainData.filter(r => r.curtainType && r.fabricType && typeof r.price === 'number');
  const uniq = new Map();
  for (const r of rows) {
    const label = makeComboLabel(r.curtainType, r.fabricType);
    const value = `CURTAIN|${r.curtainType}|${r.fabricType}`;
    if (!uniq.has(value)) uniq.set(value, { label, value });
  }

  // เพิ่มชนิดอื่นๆ
  const extra = [
    { label: 'มู่ลี่ไม้', value: 'WOOD_BLIND' },
    { label: 'มู่ลี่ KDN (อลูมิเนียม STE)', value: 'KDN_BLIND' },
    { label: 'มู่ลี่ KACEE (อลูมิเนียม KC)', value: 'KACEE_BLIND' },
    { label: 'ม่านพับ (Dimout)', value: 'ROMAN|Dimout' },
    { label: 'ม่านพับ (Blackout)', value: 'ROMAN|Blackout' },
    { label: 'ม่านพับ (Sheer)', value: 'ROMAN|Sheer' },
  ];

  return [...uniq.values(), ...extra];
}

/*******************************
 * การแม็ปชนิดม่าน → ตัวเลือกย่อย
 *******************************/
// กติกาการจับคู่ "ชนิดม่าน" -> "ชนิดราง" และ "ชนิดผ้าโปร่ง"
const STYLE_MAP = {
  // ราง/โปร่งมาตรฐานของตาไก่
  'ม่านตาไก่':     { rail: /ตาไก่/,       sheer: /ตาไก่/ },

  // จีบ: ทั้งรางและโปร่งเป็น "จีบ"
  'ม่านจีบ':       { rail: /จีบ/,         sheer: /จีบ/ },

  // ซ่อนหู: รางใช้แบบเดียวกับ "ตาไก่", โปร่งเป็น "ซ่อนหู"
  'ม่านซ่อนหู':    { rail: /ตาไก่/,       sheer: /ซ่อนหู/ },

  // ลอนเทป: รางลอน/snake; โปร่งต้องเป็น "ลอนเทป"
  'ม่านลอนเทป':    { rail: /ลอน|snake/i,  sheer: /ลอนเทป/ },

  // ลอนตะขอ: รางต้องเป็น "จีบ"; โปร่งเป็น "ลอนตะขอ"
  'ม่านลอนตะขอ':   { rail: /จีบ/,         sheer: /ลอนตะขอ/ },

  // คอกระเช้า: รางแบบตาไก่; โปร่ง "คอกระเช้า"
  'ม่านคอกระเช้า': { rail: /ตาไก่/,       sheer: /คอกระเช้า/ },

  // สอด: รางแบบตาไก่; โปร่ง "สอด"
  'ม่านสอด':       { rail: /ตาไก่/,       sheer: /สอด/ },

  // ลอนโซ่: ทั้งรางและโปร่งเป็น "ลอนโซ่"
  'ม่านลอนโซ่':    { rail: /ลอนโซ่/,      sheer: /ลอนโซ่/ },
};


function getRailsForType(curtainType) {
  const key = baseType(curtainType);
  const rule = STYLE_MAP[key]?.rail;

  // ถ้ามีกติกา → คัดรางตาม regex, ถ้าไม่มีก็ไม่แสดง
  let rails = rule
    ? railData.filter(r => rule.test(r.railType || '') || rule.test(r.rail || ''))
    : [];

  // ข้อยกเว้น: ม่านจีบ/ม่านลอน → เพิ่มรางตาไก่ให้เลือกได้ด้วย
  if (/ม่านจีบ/.test(key) || /ม่านลอน/.test(key)) {
    const eyelet = railData.filter(r => /ตาไก่/.test(r.railType || '') || /ตาไก่/.test(r.rail || ''));
    for (const e of eyelet) if (!rails.some(x => x.rail === e.rail)) rails.push(e);
  }
  return rails;
}


function getOpaqueOptions(curtainType) {
  const key = baseType(curtainType);

  // จับคู่ให้ตรงชนิด ไม่ปนกัน
  return curtainData.filter(r => {
    const ct = baseType(r.curtainType);
    if (/^ม่านลอนเทป$/.test(key))      return /^ม่านลอนเทป$/.test(ct);
    if (/^ม่านลอนตะขอ$/.test(key))     return /^ม่านลอนตะขอ$/.test(ct);
    if (/^ม่านลอนโซ่$/.test(key))      return /^ม่านลอนโซ่$/.test(ct);
    if (/^ม่านคอกระเช้า$/.test(key))   return /^ม่านคอกระเช้า$/.test(ct);
    if (/^ม่านซ่อนหู$/.test(key))      return /^ม่านซ่อนหู$/.test(ct);
    if (/^ม่านสอด$/.test(key))         return /^ม่านสอด$/.test(ct);
    // ทั่วไป: เท่ากันตรงๆ (รวมกรณีสูงพิเศษ)
    return ct === key;
  });
}

function getSheerOptions(curtainType) {
  const key = baseType(curtainType);
  const rule = STYLE_MAP[key]?.sheer;
  return rule
    ? sheerCurtainData.filter(s => rule.test(s.sheerCurtainType || '') || rule.test(s.sheerFabricType || ''))
    : [];
}



/*******************************
 * มู่ลี่อลูมิเนียม: อ่านราคาจากตาราง
 *******************************/
function matrixPrice(blindJson, modelKey, width, height) {
  if (!blindJson?.blinds?.[modelKey]) return null;
  const blk = blindJson.blinds[modelKey];
  const W = blk.widths || [];
  const H = blk.heights || [];
  const P = blk.prices || []; // P[hIndex][wIndex]

  const round2 = (x) => Math.round(x * 100) / 100;
  const wi = W.findIndex(v => round2(v) === round2(width));
  const hi = H.findIndex(v => round2(v) === round2(height));
  if (wi < 0 || hi < 0) return null;
  if (!P[hi] || typeof P[hi][wi] !== 'number') return null;
  return P[hi][wi];
}

/*******************************
 * การ์ดรายการ + สถานะ
 *******************************/
let nextId = 1;
const items = new Map(); // id -> { rail, opaque, sheer, wood, kdn, kacee, roman }

function addItem(){
  const id = nextId++;
  const wrap = $('#itemsContainer');
  const card = el('div', { className:'item-card', id:`item-${id}` });

// ===== หัวการ์ด: select หลัก + ปุ่มลบ/ทำซ้ำ =====
const head = el('div', { className:'item-head' });

// สร้างตัวเลือกหลัก
const combo = el('select', { id:`combo-${id}`, className:'combo-full' });
const comboOpts = getCurtainCombos();
combo.innerHTML =
  `<option value="">เลือกแบบม่าน</option>` +
  comboOpts.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
combo.onchange = () => { hydrateCard(id); autoSummarize(); };


// ปุ่มลบ
const del  = el('button', { className:'item-delete', title:'ลบ', innerText:'×' });
del.onclick = () => { items.delete(id); card.remove(); };

// ปุ่มทำซ้ำ
const dup  = el('button', { className:'item-dup', title:'ทำซ้ำ', innerText:'⧉' });
dup.onclick = () => duplicateItem(id);

// วางของบนหัวการ์ด
head.append(combo, del, dup);


  // ===== SECTION: CURTAIN (ราง/ม่านทึบ/ม่านโปร่ง) =====
  const secCurtain = el('ul', { className:'bullet-list', id:`sec-curtain-${id}` });
  secCurtain.append(rowRail(id), rowOpaque(id), rowSheer(id));

  // ===== SECTION: WOOD BLIND =====
  const secWood = el('div', { className:'alt-box', id:`sec-wood-${id}`, style:'display:none' });
 secWood.innerHTML = `
  <div class="alt-row">
    <div class="form-group"><label>กว้าง (เมตร):</label><input type="number" id="wb-w-${id}" min="0" step="0.01" placeholder="เช่น 1.00"></div>
    <div class="form-group"><label>สูง (เมตร):</label><input type="number" id="wb-h-${id}" min="0" step="0.01" placeholder="เช่น 2.00"></div>
    <div class="form-group"><label>จำนวนชุด:</label><input type="number" id="wb-q-${id}" min="1" value="1"></div>
    <div class="price-box" id="wb-price-${id}"></div>
  </div>
`;

function recalcWood(){
  const w = toNum($(`#wb-w-${id}`).value);
  const h = toNum($(`#wb-h-${id}`).value);
  const q = Math.max(1, toNum($(`#wb-q-${id}`).value, 1));
  if (!w || !h) { $(`#wb-price-${id}`).textContent=''; items.get(id).wood=0; return; }
  let unit = w*h*1.2*1290;
  if (unit < 1548) unit = 1548;
  const total = unit*q;
  $(`#wb-price-${id}`).textContent = fmt(total) + ' บาท';
  items.get(id).wood = total;
}

setTimeout(() => {
  bindAuto($(`#wb-w-${id}`), recalcWood);
  bindAuto($(`#wb-h-${id}`), recalcWood);
  bindAuto($(`#wb-q-${id}`), recalcWood);
});


  // ===== SECTION: ALUMINUM BLIND (KDN / KACEE) =====
  const secAlu = el('div', { className:'alt-box', id:`sec-alu-${id}`, style:'display:none' });
 secAlu.innerHTML = `
  <div class="form-group">
    <label>รุ่นมู่ลี่:</label>
    <select id="alu-model-${id}">
      <option value="KDN">มู่ลี่ KDN (STE)</option>
      <option value="KACEE">มู่ลี่ KACEE (KC)</option>
    </select>
  </div>
  <div class="alt-row">
    <div class="form-group"><label>กว้าง (เมตร):</label><input type="number" id="alu-w-${id}" min="0" step="0.01" placeholder="เช่น 1.20"></div>
    <div class="form-group"><label>สูง (เมตร):</label><input type="number" id="alu-h-${id}" min="0" step="0.01" placeholder="เช่น 1.20"></div>
    <div class="form-group"><label>จำนวนชุด:</label><input type="number" id="alu-q-${id}" min="1" value="1"></div>
    <div class="price-box" id="alu-price-${id}"></div>
  </div>
  <div class="note">* ขนาดต้องตรงกับช่วงในตารางราคา</div>
`;

function recalcAlu(){
  const model = $(`#alu-model-${id}`).value; // KDN | KACEE
  const w = toNum($(`#alu-w-${id}`).value);
  const h = toNum($(`#alu-h-${id}`).value);
  const q = Math.max(1, toNum($(`#alu-q-${id}`).value, 1));
  if (!w || !h) { $(`#alu-price-${id}`).textContent=''; items.get(id).kdn=0; items.get(id).kacee=0; return; }
  const data = (model==='KDN') ? blindKDN : blindKACEE;
  const key  = (model==='KDN') ? 'KDN_25mm' : 'KACEE_25_35_50mm';
  const price = matrixPrice(data, key, w, h);
  if (price == null) { $(`#alu-price-${id}`).textContent=''; items.get(id).kdn=0; items.get(id).kacee=0; return; }
  const total = price*q;
  $(`#alu-price-${id}`).textContent = fmt(total) + ' บาท';
  const st = items.get(id);
  if (model==='KDN'){ st.kdn = total; st.kacee = 0; } else { st.kacee = total; st.kdn = 0; }
}

setTimeout(() => {
  bindAuto($(`#alu-model-${id}`), recalcAlu);
  bindAuto($(`#alu-w-${id}`),     recalcAlu);
  bindAuto($(`#alu-h-${id}`),     recalcAlu);
  bindAuto($(`#alu-q-${id}`),     recalcAlu);
});


  // ===== SECTION: ROMAN (ม่านพับ) =====
  const secRoman = el('div', { className:'alt-box', id:`sec-roman-${id}`, style:'display:none' });
 secRoman.innerHTML = `
  <div class="form-group">
    <label>ผ้าม่านพับ:</label>
    <select id="roman-fabric-${id}">
      <option value="Dimout">Dimout (1250/ม. ขั้นต่ำ 950)</option>
      <option value="Blackout">Blackout (1290/ม. ขั้นต่ำ 990)</option>
      <option value="Sheer">Sheer (1200/ม. ขั้นต่ำ 900)</option>
    </select>
  </div>
  <div class="alt-row">
    <div class="form-group"><label>กว้าง (เมตร):</label><input type="number" id="roman-w-${id}" min="0" step="0.01" placeholder="เช่น 1.00"></div>
    <div class="form-group"><label>จำนวนชุด:</label><input type="number" id="roman-q-${id}" min="1" value="1"></div>
    <div class="form-group check"><label><input type="checkbox" id="roman-norail-${id}"> ไม่รับราง (ลด 150)</label></div>
    <div class="price-box" id="roman-price-${id}"></div>
  </div>
  <div class="note">* ความสูงไม่มีผลต่อราคา ใช้เพื่อสรุปรายการเท่านั้น</div>
`;

function recalcRoman(){
  const fabric = $(`#roman-fabric-${id}`).value;
  const w = toNum($(`#roman-w-${id}`).value);
  const q = Math.max(1, toNum($(`#roman-q-${id}`).value, 1));
  const norail = $(`#roman-norail-${id}`).checked;

  if (!w) { $(`#roman-price-${id}`).textContent=''; items.get(id).roman = 0; return; }

  const rate  = (fabric==='Blackout') ? 1290 : (fabric==='Sheer' ? 1200 : 1250);
  const floor = (fabric==='Blackout') ? 990  : (fabric==='Sheer' ? 900  : 950);

  let perSet = Math.max(rate*w, floor);
  if (norail) perSet = Math.max(0, perSet - 150);

  const total = perSet*q;
  $(`#roman-price-${id}`).textContent = fmt(total) + ' บาท';
  items.get(id).roman = total;
}

setTimeout(() => {
  bindAuto($(`#roman-fabric-${id}`), recalcRoman);
  bindAuto($(`#roman-w-${id}`),      recalcRoman);
  bindAuto($(`#roman-q-${id}`),      recalcRoman);
  bindAuto($(`#roman-norail-${id}`), recalcRoman);
});


  // ===== FOOTER: ความสูงรวม (เพื่อสรุป) =====
  const foot = el('div', { className:'item-footer' });
  const hGroup = el('div', { className:'form-group grow' });
  hGroup.innerHTML = `<label>ความสูง (เมตร):</label><input type="number" id="h-${id}" min="0" step="0.01" placeholder="สูงตามสั่ง">`;
  foot.append(hGroup);

  // ประกอบการ์ด
  card.append(head, secCurtain, secWood, secAlu, secRoman, foot);
  $('#itemsContainer').append(card);   // หรือ wrap.append(card);

// init state (ย้ายมาวางก่อน autoSummarize/return)
items.set(id, { rail:0, opaque:0, sheer:0, wood:0, kdn:0, kacee:0, roman:0 });

// สรุปทันทีเมื่อเพิ่มการ์ด
autoSummarize(true);
return id;
}

/********************************
 * แถวใช้งานสำหรับ CURTAIN mode
 ********************************/
function rowRail(id){
  const li = el('li', { className:'bullet-row' });
  const right = el('div', { className:'bullet-right' });

  const selGrp = el('div', { className:'form-group' });
  selGrp.innerHTML = `<label>เลือกราง:</label><select id="rail-${id}" disabled></select>`;

  const widthGrp = el('div', { className:'form-group' });
  widthGrp.innerHTML = `<label>ความยาว (เมตร):</label><input type="number" id="rw-${id}" min="0" step="0.01" placeholder="เช่น 2.00">`;

  const qtyGrp = el('div', { className:'form-group' });
  qtyGrp.innerHTML = `<label>จำนวน:</label><input type="number" id="rq-${id}" min="1" value="1">`;

  const price = el('div', { className:'price-box', id:`rp-${id}` });

  function recalc(){
    const sel = $(`#rail-${id}`);
    const r = railData.find(x => x.rail === sel.value);
    const w = toNum($(`#rw-${id}`).value);
    const q = Math.max(1, toNum($(`#rq-${id}`).value, 1));
    if (!r || !w) { $(`#rp-${id}`).textContent = ''; items.get(id).rail = 0; return; }
    const val = r.price * w * q;
    $(`#rp-${id}`).textContent = fmt(val) + ' บาท';
    items.get(id).rail = val;
  }

  right.append(selGrp, widthGrp, qtyGrp, price);
  li.append(right);

  // bind auto-calc
  setTimeout(() => {
    bindAuto($(`#rail-${id}`), recalc);
    bindAuto($(`#rw-${id}`),   recalc);
    bindAuto($(`#rq-${id}`),   recalc);
  });

  return li;
}


function rowOpaque(id){
  const li = el('li', { className:'bullet-row' });
  const right = el('div', { className:'bullet-right' });

  const selGrp = el('div', { className:'form-group' });
  selGrp.innerHTML = `<label>สไตล์+ผ้า:</label><select id="op-${id}" disabled></select>`;

  const widthGrp = el('div', { className:'form-group' });
  widthGrp.innerHTML = `<label>ความกว้าง (เมตร):</label><input type="number" id="ow-${id}" min="0" step="0.01" placeholder="เช่น 2.00">`;

  const qtyGrp = el('div', { className:'form-group' });
  qtyGrp.innerHTML = `<label>จำนวนผืน:</label><input type="number" id="oq-${id}" min="1" value="2">`;

  const price = el('div', { className:'price-box', id:`oprice-${id}` });

  function recalc(){
    const valStr = $(`#op-${id}`).value;
    const [ctype, ftype] = (valStr || '').split('|');
    const row = curtainData.find(x => x.curtainType === ctype && x.fabricType === ftype);
    const w = toNum($(`#ow-${id}`).value);
    const q = Math.max(1, toNum($(`#oq-${id}`).value, 2));
    if (!row || !w) { $(`#oprice-${id}`).textContent = ''; items.get(id).opaque = 0; return; }
    const val = row.price * w * q;
    $(`#oprice-${id}`).textContent = fmt(val) + ' บาท';
    items.get(id).opaque = val;
  }

  right.append(selGrp, widthGrp, qtyGrp, price);
  li.append(right);

  setTimeout(() => {
    bindAuto($(`#op-${id}`), recalc);
    bindAuto($(`#ow-${id}`), recalc);
    bindAuto($(`#oq-${id}`), recalc);
  });

  return li;
}


function rowSheer(id){
  const li = el('li', { className:'bullet-row' });
  const right = el('div', { className:'bullet-right' });

  const selGrp = el('div', { className:'form-group' });
  selGrp.innerHTML = `<label>ชนิดผ้าโปร่ง:</label><select id="sh-${id}" disabled></select>`;

  const widthGrp = el('div', { className:'form-group' });
  widthGrp.innerHTML = `<label>ความกว้าง (เมตร):</label><input type="number" id="sw-${id}" min="0" step="0.01" placeholder="เช่น 2.00">`;

  const qtyGrp = el('div', { className:'form-group' });
  qtyGrp.innerHTML = `<label>จำนวนผืน:</label><input type="number" id="sq-${id}" min="1" value="2">`;

  const price = el('div', { className:'price-box', id:`sprice-${id}` });

  function recalc(){
    const type = $(`#sh-${id}`).value;
    const row = sheerCurtainData.find(x => x.sheerFabricType === type || x.sheerCurtainType === type);
    const w = toNum($(`#sw-${id}`).value);
    const q = Math.max(1, toNum($(`#sq-${id}`).value, 2));
    if (!row || !w) { $(`#sprice-${id}`).textContent = ''; items.get(id).sheer = 0; return; }
    const val = row.price * w * q;
    $(`#sprice-${id}`).textContent = fmt(val) + ' บาท';
    items.get(id).sheer = val;
  }

  right.append(selGrp, widthGrp, qtyGrp, price);
  li.append(right);

  setTimeout(() => {
    bindAuto($(`#sh-${id}`), recalc);
    bindAuto($(`#sw-${id}`), recalc);
    bindAuto($(`#sq-${id}`), recalc);
  });

  return li;
}

// แบ่งครึ่งจากรางแล้วใส่ในช่องกว้าง
function halfFromRail(id, target) {
  const railW = parseFloat(document.querySelector(`#rw-${id}`)?.value || 0);
  if (!railW) return alert('กรุณากรอกความยาวรางก่อน');
  const half = (railW / 2).toFixed(2);
  const inp = document.querySelector(`#${target}-${id}`);
  if (inp) {
    inp.value = half;
    inp.dispatchEvent(new Event('input'));
    inp.dispatchEvent(new Event('change'));
  }
}

// ผูกปุ่ม ½ จากราง ถ้ายังไม่มี
function attachHalfBtnOnce(id, target) {
  const group = document.querySelector(`#${target}-${id}`)?.closest('.form-group');
  if (!group || group.querySelector('.half-btn')) return;
  const btn = document.createElement('button');
  btn.textContent = '½ จากราง';
  btn.className = 'half-btn';
  btn.type = 'button';
  btn.onclick = () => halfFromRail(id, target);
  group.appendChild(btn);
}

// === NEW: ปุ่มกว้าง (แยกกลาง/เดี่ยว) ===
function widthFromRail(id, targetBase, mode) {
  const railEl = document.querySelector(`#rw-${id}`);
  const tgt = document.querySelector(`#${targetBase}-${id}`);
  if (!railEl || !tgt) return;
  const rw = parseFloat(railEl.value);
  if (isNaN(rw)) return;

  const keep3 = /\.\d{3,}/.test(railEl.value || '');
  const val = (mode === 'half') ? (rw / 2) : rw; // half = แยกกลาง, full = เดี่ยว
  tgt.value = keep3 ? val.toFixed(3) : val.toFixed(2);
  tgt.dispatchEvent(new Event('input'));
  tgt.dispatchEvent(new Event('change'));
}

function attachWidthButtons(id, targetBase) {
  const inp = document.querySelector(`#${targetBase}-${id}`);
  if (!inp) return;
  if (inp.dataset.widthBtns === '1') return; // กันซ้ำ

  const btnHalf = document.createElement('button');
  btnHalf.type = 'button';
  btnHalf.className = 'action-btn half-btn';
  btnHalf.textContent = 'แยกกลาง';
  btnHalf.onclick = () => widthFromRail(id, targetBase, 'half');

  const btnFull = document.createElement('button');
  btnFull.type = 'button';
  btnFull.className = 'action-btn full-btn';
  btnFull.textContent = 'เดี่ยว';
  btnFull.onclick = () => widthFromRail(id, targetBase, 'full');

  inp.insertAdjacentElement('afterend', btnFull);
  inp.insertAdjacentElement('afterend', btnHalf);

  inp.dataset.widthBtns = '1';
}


// === NEW: ปุ่มปรับความสูง ===
function adjustHeightBy(id, delta) {
  const hEl = document.querySelector(`#h-${id}`);
  if (!hEl) return;
  const now = parseFloat(hEl.value);
  if (isNaN(now)) return; // ไม่มีค่าความสูง ไม่ทำอะไร

  const keep3 = /\.\d{3,}/.test(hEl.value || '');
  const next = now - delta;
  hEl.value = keep3 ? next.toFixed(3) : next.toFixed(2);
  hEl.dispatchEvent(new Event('input'));
  hEl.dispatchEvent(new Event('change'));
}

function attachHeightButtonsPleat(id) {
  const hEl = document.querySelector(`#h-${id}`);
  if (!hEl) return;
  if (hEl.dataset.hookBtns === '1') return;

  const btnLong = document.createElement('button');
  btnLong.type = 'button';
  btnLong.className = 'hook-btn';
  btnLong.textContent = 'ตะขอยาว';
  btnLong.onclick = () => adjustHeightBy(id, 0.055);

  const btnShort = document.createElement('button');
  btnShort.type = 'button';
  btnShort.className = 'hook-btn';
  btnShort.textContent = 'ตะขอสั้น';
  btnShort.onclick = () => adjustHeightBy(id, 0.020);

  hEl.insertAdjacentElement('afterend', btnShort);
  hEl.insertAdjacentElement('afterend', btnLong);
  hEl.dataset.hookBtns = '1';
}

function attachHeightButtonWave(id) {
  const hEl = document.querySelector(`#h-${id}`);
  if (!hEl) return;
  if (hEl.dataset.waveBtn === '1') return;

  const btnCeil = document.createElement('button');
  btnCeil.type = 'button';
  btnCeil.className = 'hook-btn';
  btnCeil.textContent = 'ติดเพดาน';
  btnCeil.onclick = () => adjustHeightBy(id, 0.055);

  hEl.insertAdjacentElement('afterend', btnCeil);
  hEl.dataset.waveBtn = '1';
}

// 🧹 ล้างปุ่มเครื่องมือก่อนสลับแบบม่าน
function clearToolButtons(id) {
  // เดิมใช้ card-${id} ทำให้หาไม่เจอ
  const card = document.getElementById(`item-${id}`);
  if (!card) return;

  // ลบปุ่มทั้งหมดในการ์ดนี้
  card.querySelectorAll('.half-btn, .full-btn, .hook-btn').forEach(el => el.remove());

  // เคลียร์ flag dataset เพื่ออนุญาตให้สร้างปุ่มใหม่รอบหน้า
  const h = document.getElementById(`h-${id}`);
  if (h) {
    delete h.dataset.hookBtns;   // สำหรับ "ตะขอยาว/ตะขอสั้น"
    delete h.dataset.waveBtn;    // สำหรับ "ติดเพดาน"
  }

  // เคลียร์สถานะปุ่มกว้าง (แยกกลาง/เดี่ยว) ของม่านทึบ/โปร่ง
  ['ow', 'sw'].forEach(base => {
    const inp = document.getElementById(`${base}-${id}`);
    if (inp) delete inp.dataset.widthBtns;
  });
}



/********************************
 * เปลี่ยนหน้าการ์ดตามชนิดที่เลือก
 ********************************/
function hydrateCard(id){
 clearToolButtons(id);

  const v = $(`#combo-${id}`).value || '';
  const footerEl = document.querySelector(`#item-${id} .item-footer`);

  // ซ่อนทุก section ก่อน
  $(`#sec-curtain-${id}`).style.display = 'none';
  $(`#sec-wood-${id}`).style.display    = 'none';
  $(`#sec-alu-${id}`).style.display     = 'none';
  $(`#sec-roman-${id}`).style.display   = 'none';

  if (v.startsWith('CURTAIN|')) {
    // CURTAIN|ctype|ftype
    const [, ctype, ftype] = v.split('|');

    // ราง
    const rails = getRailsForType(ctype);
    const rSel = $(`#rail-${id}`);
    rSel.innerHTML = rails.map(r => `<option value="${r.rail}">${r.rail}</option>`).join('');
    rSel.disabled = rails.length === 0;

    // ม่านทึบ
    const opaques = getOpaqueOptions(ctype);
    const oSel = $(`#op-${id}`);
    oSel.innerHTML = opaques
      .map(o => `<option value="${o.curtainType}|${o.fabricType}">${makeComboLabel(o.curtainType, o.fabricType)}</option>`)
      .join('');
    oSel.value = `${ctype}|${ftype}`;
    oSel.disabled = opaques.length === 0;

    // ม่านโปร่ง
    const sheers = getSheerOptions(ctype);
    const sSel = $(`#sh-${id}`);
    sSel.innerHTML = sheers.map(s => `<option value="${s.sheerFabricType}">${s.sheerFabricType}</option>`).join('');
    sSel.disabled = sheers.length === 0;

       $(`#sec-curtain-${id}`).style.display = '';
    if (footerEl) footerEl.style.display = '';  // แสดงช่องความสูง

    // === ปุ่ม "แยกกลาง/เดี่ยว" + ปุ่มปรับความสูง (ไทยล้วน) ===
    const base = baseType(ctype); // ตัดคำว่า "สูงพิเศษ" ออกก่อน
    if (base === 'ม่านจีบ' || base === 'ม่านลอนเทป') {
      // ปุ่มข้างช่อง "กว้าง" ของ ม่านทึบ/โปร่ง
      attachWidthButtons(id, 'ow');
      attachWidthButtons(id, 'sw');

      // ปุ่มปรับความสูง
      if (base === 'ม่านจีบ') {
        // ตะขอยาว -0.055, ตะขอสั้น -0.02
        attachHeightButtonsPleat(id);
      } else {
        // ม่านลอนเทป: ติดเพดาน -0.055
        attachHeightButtonWave(id);
      }
    }

}
  else if (v === 'WOOD_BLIND') {
    $(`#sec-wood-${id}`).style.display = '';
    if (footerEl) footerEl.style.display = 'none';     // << ซ่อนช่องความสูง (มู่ลี่ไม้)
  }
  else if (v === 'KDN_BLIND' || v === 'KACEE_BLIND') {
    $(`#alu-model-${id}`).value = (v === 'KDN_BLIND') ? 'KDN' : 'KACEE';
    $(`#sec-alu-${id}`).style.display = '';
    if (footerEl) footerEl.style.display = 'none';     // << ซ่อนช่องความสูง (มู่ลี่อลูมิเนียม)
  }
  else if (v.startsWith('ROMAN|')) {
    const fabric = v.split('|')[1];
    $(`#roman-fabric-${id}`).value = fabric;
    $(`#sec-roman-${id}`).style.display = '';
    if (footerEl) footerEl.style.display = '';         // << แสดงช่องความสูง (ม่านพับ: ใช้ไว้สรุป)
  }
}


/*******************************
 * สรุปผลทุกการ์ด + คัดลอก
 *******************************/
function summarizeAllItems(){
  // --- เก็บสรุปต่อการ์ด (ไม่รวมอันที่จะไปกรุ๊ป) ---
  const cardSummaries = []; // { id, lines:[], subtotal }
  const cardHasAny = new Map();

  // --- เก็บรายการมู่ลี่ข้ามการ์ด ---
  const blindsAgg = {
    WOOD:  { label: 'มู่ลี่ไม้',            entries: [], total: 0 }, // entries: {id,line,amt}
    KDN:   { label: 'มู่ลี่อลูมิเนียม STE', entries: [], total: 0 },
    KACEE: { label: 'มู่ลี่อลูมิเนียม KC',  entries: [], total: 0 },
  };

  // --- เก็บ "ม่านพับ" แยกตามชนิดผ้า (Dimout/Blackout/Sheer) ---
  const romanAgg = {}; // key=fabric -> { label: `ม่านพับ (${fabric})`, entries:[], total:0 }

  // ---------- PASS 1: รวบรวมข้อมูลจากทุกการ์ด ----------
 // ก่อนเริ่มประกอบบรรทัด
for (const [id, st] of items) {
  // เริ่มประกอบการ์ดละบล็อก
  const lines = [];
  let subtotal = 0;

  // flags สำหรับนับหมวดในแต่ละการ์ด
  let hasRail = false;
  let hasOpaque = false;
  let hasSheer = false;

  const hVal  = parseFloat($(`#h-${id}`)?.value);
  const hText = isNaN(hVal) ? 'สูงตามสั่ง' : fmtSize(hVal, $(`#h-${id}`));

    // 1) ราง
    if (st.rail > 0) {
      const rw = fmtSize(toNum($(`#rw-${id}`)?.value), $(`#rw-${id}`));
      const rq = Math.max(1, toNum($(`#rq-${id}`)?.value, 1));
      const rname = $(`#rail-${id}`)?.value || 'ราง';
      lines.push(`${rname} ${rw} = ${rq} ชุด ${fmt(st.rail)} บาท`);
      subtotal += st.rail;
      hasRail = true;
    }

    // 2) ม่านทึบ
    if (st.opaque > 0) {
      const ow = fmtSize(toNum($(`#ow-${id}`)?.value), $(`#ow-${id}`));
      const oq = Math.max(1, toNum($(`#oq-${id}`)?.value, 2));
      const oname = ($(`#op-${id}`)?.value || '').split('|')[1] || 'ม่านทึบ';
      lines.push(`${oname}`);
      lines.push(`${ow}*${hText} = ${oq} ผืน ${fmt(st.opaque)} บาท`);
      subtotal += st.opaque;
       hasOpaque = true;   
    }

    // 3) ม่านโปร่ง
    if (st.sheer > 0) {
      const sw = fmtSize(toNum($(`#sw-${id}`)?.value), $(`#sw-${id}`));
      const sq = Math.max(1, toNum($(`#sq-${id}`)?.value, 2));
      const sname = $(`#sh-${id}`)?.value || 'ม่านโปร่ง';
      lines.push(`${sname}`);
      lines.push(`${sw}*${hText} = ${sq} ผืน ${fmt(st.sheer)} บาท`);
      subtotal += st.sheer;
       hasSheer = true; 
    }

    // 4) มู่ลี่ไม้ → ไปกรุ๊ป
    if (st.wood > 0) {
      const w = fmtSize(toNum($(`#wb-w-${id}`)?.value), $(`#wb-w-${id}`));
      const h = fmtSize(toNum($(`#wb-h-${id}`)?.value), $(`#wb-h-${id}`));
      const q = Math.max(1, toNum($(`#wb-q-${id}`)?.value, 1));
      blindsAgg.WOOD.entries.push({ id, line: `${w}*${h} = ${q} ชุด ${fmt(st.wood)} บาท`, amt: st.wood });
      blindsAgg.WOOD.total += st.wood;
    }

    // 5) มู่ลี่อลูมิเนียม → ไปกรุ๊ป (KDN/KACEE)
    if (st.kdn > 0) {
      const w = fmtSize(toNum($(`#alu-w-${id}`)?.value), $(`#alu-w-${id}`));
      const h = fmtSize(toNum($(`#alu-h-${id}`)?.value), $(`#alu-h-${id}`));
      const q = Math.max(1, toNum($(`#alu-q-${id}`)?.value, 1));
      blindsAgg.KDN.entries.push({ id, line: `${w}*${h} = ${q} ชุด ${fmt(st.kdn)} บาท`, amt: st.kdn });
      blindsAgg.KDN.total += st.kdn;
    }
    if (st.kacee > 0) {
      const w = fmtSize(toNum($(`#alu-w-${id}`)?.value), $(`#alu-w-${id}`));
      const h = fmtSize(toNum($(`#alu-h-${id}`)?.value), $(`#alu-h-${id}`));
      const q = Math.max(1, toNum($(`#alu-q-${id}`)?.value, 1));
      blindsAgg.KACEE.entries.push({ id, line: `${w}*${h} = ${q} ชุด ${fmt(st.kacee)} บาท`, amt: st.kacee });
      blindsAgg.KACEE.total += st.kacee;
    }

    // 6) ม่านพับ → ไปกรุ๊ปตามชนิดผ้า (Dimout/Blackout/Sheer)
    if (st.roman > 0) {
      const w = fmtSize(toNum($(`#roman-w-${id}`)?.value), $(`#roman-w-${id}`));
      const q = Math.max(1, toNum($(`#roman-q-${id}`)?.value, 1));
      const fabric = $(`#roman-fabric-${id}`)?.value || 'Dimout';
      if (!romanAgg[fabric]) romanAgg[fabric] = { label: `ม่านพับ (${fabric})`, entries: [], total: 0 };
      romanAgg[fabric].entries.push({ id, line: `${w}*${hText} = ${q} ชุด ${fmt(st.roman)} บาท`, amt: st.roman });
      romanAgg[fabric].total += st.roman;
    }

    const hasAny = (st.rail + st.opaque + st.sheer) > 0;
  cardSummaries.push({ id, lines, subtotal, hasRail, hasOpaque, hasSheer });
  cardHasAny.set(id, hasAny);
}

  // ตรวจว่าแต่ละกลุ่มมีหลายการ์ดไหม (เพื่อจะกรุ๊ปหรือแสดงในการ์ด)
  const multiWood  = blindsAgg.WOOD.entries.length  >= 2;
  const multiKDN   = blindsAgg.KDN.entries.length   >= 2;
  const multiKACEE = blindsAgg.KACEE.entries.length >= 2;

  const romanKeys = Object.keys(romanAgg);
  const romanMultiMap = {};
  for (const k of romanKeys) romanMultiMap[k] = romanAgg[k].entries.length >= 2;

  // ---------- PASS 2: สร้างข้อความสรุป ----------
  let output = '';
  let otherTotal = 0;     // รวมเฉพาะที่ "ไม่ถูกรวมกลุ่ม" (เหลือในแต่ละการ์ด)
  let printedAnyGroup = false;
  let cardsPrinted = 0;

  // 2.1 แสดงผลการ์ด (แต่อาจเติมมู่ลี่/ม่านพับลงการ์ด ถ้าไม่ใช่กรณี multi)
  for (const cs of cardSummaries) {
    const { id, lines } = cs;
let cardOut = '';
let cardTotal = 0;

// เริ่มนับหมวดจาก flag ที่เก็บมาจาก Pass 1
let blockCount = 0;
if (cs.hasRail)   blockCount++;
if (cs.hasOpaque) blockCount++;
if (cs.hasSheer)  blockCount++;

// ------- เพิ่มรายการจากการ์ด (ราง/ทึบ/โปร่ง) -------
if (lines.length) {
  cardOut += lines.join('\n') + '\n';
  cardTotal += cs.subtotal;
}

// ------- แทรกมู่ลี่ลงการ์ด ถ้าไม่ใช่กรณี multi -------
const woodHere  = blindsAgg.WOOD.entries.filter(e => e.id === id);
if (!multiWood && woodHere.length === 1) {
  cardOut += `มู่ลี่ไม้\n${woodHere[0].line}\n`;
  cardTotal += woodHere[0].amt;
  blockCount++;                // <<< นับเป็น 1 หมวด
}
const kdnHere   = blindsAgg.KDN.entries.filter(e => e.id === id);
if (!multiKDN && kdnHere.length === 1) {
  cardOut += `มู่ลี่อลูมิเนียม STE\n${kdnHere[0].line}\n`;
  cardTotal += kdnHere[0].amt;
  blockCount++;                // <<< นับเป็น 1 หมวด
}
const kaceeHere = blindsAgg.KACEE.entries.filter(e => e.id === id);
if (!multiKACEE && kaceeHere.length === 1) {
  cardOut += `มู่ลี่อลูมิเนียม KC\n${kaceeHere[0].line}\n`;
  cardTotal += kaceeHere[0].amt;
  blockCount++;                // <<< นับเป็น 1 หมวด
}

// ------- แทรกม่านพับลงการ์ด ถ้า fabric นั้นไม่ใช่ multi -------
for (const k of romanKeys) {
  const here = romanAgg[k].entries.filter(e => e.id === id);
  if (!romanMultiMap[k] && here.length === 1) {
    cardOut += `${romanAgg[k].label}\n${here[0].line}\n`;
    cardTotal += here[0].amt;
    blockCount++;              // <<< นับเป็น 1 หมวด
  }
}

// ------- เงื่อนไขขึ้นคำว่า "รวม ... บาท" -------
// ขึ้นเฉพาะเมื่อ "มีอย่างน้อย 2 หมวด" ในการ์ด
if (cardOut.trim()) {
  if (blockCount >= 2)
    cardOut = cardOut.trimEnd() + `\nรวม ${fmt(cardTotal)} บาท`;
  output += (output ? '\n\n' : '') + cardOut.trim();
  otherTotal += cardTotal;
}


  }

  // 2.2 ต่อท้ายบล็อกกรุ๊ป “มู่ลี่” ที่มีหลายการ์ด
 function appendBlindGroup(group) {
  if (group.entries.length < 2) return;
  const body = group.entries.map(e => e.line).join('\n');
  output += (output ? '\n\n' : '') + group.label + '\n' + body + `\nรวม ${fmt(group.total)} บาท`;
  printedAnyGroup = true;
  groupsPrinted++;               // << เพิ่มบรรทัดนี้
}

  let groupsPrinted = 0;
  appendBlindGroup(blindsAgg.WOOD);
  appendBlindGroup(blindsAgg.KDN);
  appendBlindGroup(blindsAgg.KACEE);

  // 2.3 ต่อท้ายบล็อกกรุ๊ป “ม่านพับ” (ตามชนิดผ้า) ที่มีหลายการ์ด
  function appendRomanGroup(group) {
    if (group.entries.length < 2) return;
    const body = group.entries.map(e => e.line).join('\n');
    output += (output ? '\n\n' : '') + group.label + '\n' + body + `\nรวม ${fmt(group.total)} บาท`;
    printedAnyGroup = true;
     groupsPrinted++;   
  }
  for (const k of romanKeys) appendRomanGroup(romanAgg[k]);

// 2.4 รวมทั้งหมด:
// แสดงเฉพาะเมื่อมี “อย่างน้อย 2 บล็อก” (การ์ดที่มีรายการ + บล็อกกรุ๊ป)
const blocks = cardsPrinted + groupsPrinted;
if (blocks >= 2) {
  const grand = otherTotal
              + (multiWood  ? blindsAgg.WOOD.total : 0)
              + (multiKDN   ? blindsAgg.KDN.total  : 0)
              + (multiKACEE ? blindsAgg.KACEE.total: 0)
              + romanKeys.reduce((s,k)=> s + (romanMultiMap[k] ? romanAgg[k].total : 0), 0);
  output += `\n\nรวมทั้งหมด ${fmt(grand)} บาท`;
}


  $('#summaryResult').value = output || 'ยังไม่มีรายการ';
}


function duplicateItem(srcId){
  // อ่าน “ตัวเลือกหลัก” ของการ์ดต้นฉบับ
  const comboVal    = $(`#combo-${srcId}`)?.value || '';

  // อ่าน “ตัวเลือกย่อย” (ถ้ามีในการ์ดนั้น)
  const railVal     = $(`#rail-${srcId}`)?.value || null;
  const opaqueVal   = $(`#op-${srcId}`)?.value   || null; // curtainType|fabricType
  const sheerVal    = $(`#sh-${srcId}`)?.value   || null;

  const aluModel    = $(`#alu-model-${srcId}`)?.value || null;       // KDN|KACEE
  const romanFabric = $(`#roman-fabric-${srcId}`)?.value || null;    // Dimout|Blackout|Sheer

  // สร้างการ์ดใหม่ต่อท้าย
  const newId = addItem();

  // เซ็ตชนิดหลักเหมือนต้นฉบับ แล้ว hydrate sections
  $(`#combo-${newId}`).value = comboVal;
  hydrateCard(newId);

  // ตั้งค่าตัวเลือกย่อยให้เหมือน (ไม่คัดลอก “ขนาด/จำนวน”)
  setTimeout(() => {
    if (railVal && $(`#rail-${newId}`)) {
      $(`#rail-${newId}`).value = railVal;
      $(`#rail-${newId}`).dispatchEvent(new Event('change'));
    }
    if (opaqueVal && $(`#op-${newId}`)) {
      $(`#op-${newId}`).value = opaqueVal;
      $(`#op-${newId}`).dispatchEvent(new Event('change'));
    }
    if (sheerVal && $(`#sh-${newId}`)) {
      $(`#sh-${newId}`).value = sheerVal;
      $(`#sh-${newId}`).dispatchEvent(new Event('change'));
    }
    if (aluModel && $(`#alu-model-${newId}`)) {
      $(`#alu-model-${newId}`).value = aluModel;
      $(`#alu-model-${newId}`).dispatchEvent(new Event('change'));
    }
    if (romanFabric && $(`#roman-fabric-${newId}`)) {
      $(`#roman-fabric-${newId}`).value = romanFabric;
      $(`#roman-fabric-${newId}`).dispatchEvent(new Event('change'));
    }

    // ล้างค่ากว้าง/สูง/จำนวนของการ์ดใหม่ให้ว่างหรือค่าเริ่มต้น
    const ids = [
      `rw-${newId}`, `rq-${newId}`,
      `ow-${newId}`, `oq-${newId}`,
      `sw-${newId}`, `sq-${newId}`,
      `wb-w-${newId}`, `wb-h-${newId}`, `wb-q-${newId}`,
      `alu-w-${newId}`, `alu-h-${newId}`, `alu-q-${newId}`,
      `roman-w-${newId}`, `roman-q-${newId}`,
      `h-${newId}`
    ];
    ids.forEach(cid => {
      const elx = $(`#${cid}`);
      if (!elx) return;
      if (/-(q|rq|oq|sq)$/.test(cid)) {
        // รีเซ็ตจำนวน: ราง=1, ทึบ/โปร่ง=2, อื่นๆ=1
        elx.value = cid.endsWith('rq') ? 1 :
                    (cid.endsWith('oq') || cid.endsWith('sq') ? 2 : 1);
      } else {
        elx.value = '';
      }
      elx.dispatchEvent(new Event('input'));
      elx.dispatchEvent(new Event('change'));
    });
  }, 0);
}


function copySummary(){
  const t = $('#summaryResult');
  t.select(); t.setSelectionRange(0, 99999);
  document.execCommand('copy');
  alert('คัดลอกแล้ว');
}

/*******************************
 * เริ่มทำงาน
 *******************************/
window.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadPrice();
    const btn = document.getElementById('addItemBtn');
    if (btn) btn.addEventListener('click', addItem);
    autoSummarize(true);
  } catch (e) {
    console.error(e);
    alert('โหลดข้อมูลไม่สำเร็จ');
  }
});
