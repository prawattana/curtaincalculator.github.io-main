/*******************************
 * โหลดข้อมูลราคา (จาก JSON)
 *******************************/
let railData = [];
let curtainData = [];
let sheerCurtainData = [];
let rollerCurtainData = [];
let blindKDN = null;     // blindsData.json
let blindKACEE = null;   // ฺblindsDataKacee.json

let KACEE_MODELS_DATA = {};
let KACEE_MODEL_LIST = [];

async function loadPrice() {
  // ราง / ม่านทึบ / ม่านโปร่ง
  const res = await fetch('priceData.json');
  if (!res.ok) throw new Error('โหลด priceData.json ไม่สำเร็จ');
  const json = await res.json();
  railData = json.railData || [];
  curtainData = json.curtainData || [];
  sheerCurtainData = json.sheerCurtainData || [];
  rollerCurtainData = json.rollerCurtainData || [];

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

  // มู่ลี่ KACEE — ตารางราคาแยกตามรุ่น
  try {
    const r3 = await fetch('kaceeModels.json');
    if (r3.ok) {
      const kj = await r3.json();
      KACEE_MODELS_DATA = kj.blinds || {};
      KACEE_MODEL_LIST  = Object.keys(KACEE_MODELS_DATA);
    }
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

const toNum = (v, d=0) => {
  const n = parseFloat(v);
  return isNaN(n) ? d : n;
};

function formatHeightSmart(num){
  if (isNaN(num)) return '';

  const val = Number(num);
  const fixed3 = val.toFixed(3);

  // ถ้าหลักที่ 3 เป็น 0 → ใช้ 2 ตำแหน่ง
  if (fixed3.endsWith('0')) {
    return val.toFixed(2);
  }

  return fixed3;
}

function calcFabricMode(width,type,fabricWidth){

let realWidth = width;

if(type.includes("ม่านจีบ")){
realWidth = width*2.3;
}

if(type.includes("ม่านลอนเทป")){
realWidth = width*2.7;
}

let limit = fabricWidth;

if(fabricWidth==2.8){

if(type.includes("ม่านลอนเทป")){
limit = 2.7;
}else{
limit = 2.63;
}

}

if(fabricWidth==3.2){
limit = 3.0;
}

if(fabricWidth==1.4){
limit = 1.4;
}

return realWidth<=limit ? "ขวางผ้า" : "ต่อผ้า";
}

function calcJoinFabricCost(width,height,fabricWidth,pricePerYard,qty,type){

const seamRate = 100;
const profit = 1.7;

let realWidth;

// ตาไก่ / ซ่อนหู / คอกระเช้า / ลอนตะขอ / ลอนโซ่ / สอด
if(
type.includes("ตาไก่") ||
type.includes("ซ่อนหู") ||
type.includes("คอกระเช้า") ||
type.includes("ลอนตะขอ") ||
type.includes("ลอนโซ่") ||
type.includes("สอด")
){
realWidth = width + 0.15;
}
else if(type.includes("จีบ")){
realWidth = width * 2.3;
}
else if(type.includes("ลอน")){
realWidth = width * 2.7;
}
else{
realWidth = width;
}

// จำนวนชิ้น (สูตรตาม Excel)
let pieces;

if(realWidth <= 2.8){
pieces = 1;
}
else if(realWidth <= fabricWidth){
pieces = 1;
}
else{
pieces = Math.ceil(realWidth / fabricWidth);
}

// ความสูงผ้า
const fabricHeight = height + 0.3;

// เมตรผ้า
const totalMeter = pieces * fabricHeight;

// แปลงหลา
const yards = Math.ceil(totalMeter / 0.9);

// ต้นทุนผ้า
const fabricCost = yards * pricePerYard;

// ค่าเย็บพื้นฐาน
const sewCost = realWidth * seamRate;

// ต้นทุนรวม
const totalCost = fabricCost + sewCost;

// ราคาขาย
return totalCost * profit * qty;

}

function getFabricYardPrice(ftype){

// blackout
if(ftype.includes("Blackout") && ftype.includes("สูงพิเศษ")) return 230;
if(ftype.includes("Blackout")) return 180;

// dimout
if(ftype.includes("Dimout") && ftype.includes("สูงพิเศษ")) return 150;
if(ftype.includes("Dimout")) return 130;

// sheer
if(ftype.includes("โปร่งหนาพิเศษ")) return 80;
if(ftype.includes("โปร่ง") && ftype.includes("สูงพิเศษ")) return 80;
if(ftype.includes("โปร่ง")) return 60;

return 130;

}

function getDefaultFabricWidth(ftype){

// Blackout
if(ftype.includes("Blackout") && ftype.includes("สูงพิเศษ")) return 3.2;
if(ftype.includes("Blackout")) return 3.2;

// Dimout
if(ftype.includes("Dimout") && ftype.includes("สูงพิเศษ")) return 3.2;
if(ftype.includes("Dimout")) return 2.8;

// Linen
if(ftype.includes("ลินิน")) return 2.8;

// Sheer
if(ftype.includes("โปร่งหนาพิเศษ")) return 3.2;
if(ftype.includes("โปร่ง") && ftype.includes("สูงพิเศษ")) return 3.2;
if(ftype.includes("โปร่ง")) return 2.8;

return 2.8;

}


// ปัดสำหรับ lookup ตารางมู่ลี่: ถ้าใส่ทศนิยม "สองตำแหน่ง" ให้ปัดที่หลักร้อย (2nd decimal)
// 0-4 ลง, 5-9 ขึ้น -> ให้ได้ค่าเป็น "ทศนิยม 1 ตำแหน่ง"
function lookupTenthByHundredths(rawStr) {
  if (rawStr == null) return NaN;
  const s = String(rawStr).trim();
  if (!s) return NaN;
  if (!s.includes('.')) return parseFloat(s);

  const [intPart, decPartRaw=''] = s.split('.');
  const decPart = decPartRaw.replace(/\D/g,''); // กัน user ใส่คอมมา/ตัวอักษร

  if (decPart.length === 2) {
    const tenth = parseInt(decPart[0] || '0', 10);     // หลักทศนิยมที่ 1
    const hund  = parseInt(decPart[1] || '0', 10);     // หลักทศนิยมที่ 2
    let val = parseFloat(`${intPart}.${tenth}`);
    if (!isNaN(hund) && hund >= 5) val += 0.1;
    // บีบให้ได้ step 0.1 แบบสวย ๆ
    return Math.round(val * 10) / 10;
  }

  // กรณีอื่น ๆ ไม่บังคับปัด (ให้เป็นค่าที่ผู้ใช้ใส่มา)
  return parseFloat(s);
}


// --- Auto summary (debounce) ---
let _sumT = null;
function autoSummarize(now = false){
  if (now) { summarizeAllItems(); return; }
  clearTimeout(_sumT);
  _sumT = setTimeout(summarizeAllItems, 150);
}

/*******************************
 * ป้ายชื่อรวม “ชนิดม่าน + เนื้อผ้า”
 *******************************/
function makeComboLabel(ct, ft) {
  const esc = s => (s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hasHigh = /สูงพิเศษ/i.test(ct) || /สูงพิเศษ/i.test(ft);
  const baseCt = (ct || '').replace(/\s*สูงพิเศษ/gi, '').trim();
  let f = (ft || '')
    .replace(new RegExp(esc(baseCt), 'gi'), '')
    .replace(/ม่านตาไก่|ม่านจีบ|ม่านลอน(?:เทป|ตะขอ)?|ม่านซ่อนหู/gi, '')
    .replace(/\s*สูงพิเศษ/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!f) f = (ft || '').replace(/\s*สูงพิเศษ/gi, '').trim();
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
  const rows = curtainData.filter(r => r.curtainType && r.fabricType && typeof r.price === 'number');
  const uniq = new Map();
  for (const r of rows) {
    const label = makeComboLabel(r.curtainType, r.fabricType);
    const value = `CURTAIN|${r.curtainType}|${r.fabricType}`;
    if (!uniq.has(value)) uniq.set(value, { label, value });
  }
  const extra = [
    { label: 'มู่ลี่ไม้', value: 'WOOD_BLIND' },
    { label: 'มู่ลี่ KDN (อลูมิเนียม STE)', value: 'KDN_BLIND' },
    { label: 'มู่ลี่ KACEE (อลูมิเนียม KC)', value: 'KACEE_BLIND' },
    { label: 'ม่านพับ (Dimout)', value: 'ROMAN|Dimout' },
    { label: 'ม่านพับ (Blackout)', value: 'ROMAN|Blackout' },
    { label: 'ม่านพับ (Sheer)', value: 'ROMAN|Sheer' },
    { label: 'ม่านม้วน Blackout', value: 'ROLLER|Blackout' },
{ label: 'ม่านม้วน 3%', value: 'ROLLER|3%' },
{ label: 'ม่านม้วน 1%', value: 'ROLLER|1%' },
{ label: 'มุ้งจีบ Luxury กันยุง (ราคาลูกค้าออนไลน์)', value: 'MOSQ|LUXURY' },
{ label: 'มุ้งจีบนิรภัย (ราคาลูกค้าออนไลน์)', value: 'MOSQ|SAFE' },
{ label: 'มุ้งจีบ P-net หนาพิเศษ (ราคาลูกค้างานติดตั้ง)', value: 'MOSQ|PNET' },
{ label: 'มุ้งรังผึ้ง', value: 'HONEYCOMB' },
  ];
  return [...uniq.values(), ...extra];
}

/*******************************
 * การแม็ปชนิดม่าน → ตัวเลือกย่อย
 *******************************/
const STYLE_MAP = {
  'ม่านตาไก่':     { rail: /ตาไก่/,       sheer: /ตาไก่/ },
  'ม่านจีบ':       { rail: /จีบ/,         sheer: /จีบ/ },
  'ม่านซ่อนหู':    { rail: /ตาไก่/,       sheer: /ซ่อนหู/ },
  'ม่านลอนเทป':    { rail: /ลอน|snake/i,  sheer: /ลอนเทป/ },
  'ม่านลอนตะขอ':   { rail: /จีบ/,         sheer: /ลอนตะขอ/ },
  'ม่านคอกระเช้า': { rail: /ตาไก่/,       sheer: /คอกระเช้า/ },
  'ม่านสอด':       { rail: /ตาไก่/,       sheer: /สอด/ },
  'ม่านลอนโซ่':    { rail: /ลอนโซ่/,      sheer: /ลอนโซ่/ },
};

function getRailsForType(curtainType) {
  const key = baseType(curtainType);
  const rule = STYLE_MAP[key]?.rail;
  let rails = rule
    ? railData.filter(r => rule.test(r.railType || '') || rule.test(r.rail || ''))
    : [];
  if (/ม่านจีบ/.test(key) || /ม่านลอน/.test(key)) {
    const eyelet = railData.filter(r => /ตาไก่/.test(r.railType || '') || /ตาไก่/.test(r.rail || ''));
    for (const e of eyelet) if (!rails.some(x => x.rail === e.rail)) rails.push(e);
  }
  return rails;
}
function getOpaqueOptions(curtainType) {
  const key = baseType(curtainType);
  return curtainData.filter(r => {
    const ct = baseType(r.curtainType);
    if (/^ม่านลอนเทป$/.test(key))      return /^ม่านลอนเทป$/.test(ct);
    if (/^ม่านลอนตะขอ$/.test(key))     return /^ม่านลอนตะขอ$/.test(ct);
    if (/^ม่านลอนโซ่$/.test(key))      return /^ม่านลอนโซ่$/.test(ct);
    if (/^ม่านคอกระเช้า$/.test(key))   return /^ม่านคอกระเช้า$/.test(ct);
    if (/^ม่านซ่อนหู$/.test(key))      return /^ม่านซ่อนหู$/.test(ct);
    if (/^ม่านสอด$/.test(key))         return /^ม่านสอด$/.test(ct);
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
  const P = blk.prices || []; // P[hi][wi]
  const round2 = (x) => Math.round(x * 100) / 100;

  // exact match ก่อน — ถ้าไม่เจอ ให้ใช้ค่าถัดขึ้นไปในตาราง (ceiling)
  let wi = W.findIndex(v => round2(v) === round2(width));
  if (wi < 0) {
    const rw = round2(width);
    wi = W.findIndex(v => round2(v) > rw);
  }

  let hi = H.findIndex(v => round2(v) === round2(height));
  if (hi < 0) {
    const rh = round2(height);
    hi = H.findIndex(v => round2(v) > rh);
  }

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
  const card = el('div', { className:'item-card', id:`item-${id}` });

  // ===== หัวการ์ด: select หลัก + ปุ่มลบ/ทำซ้ำ =====
  const head = el('div', { className:'item-head' });
  const combo = el('select', { id:`combo-${id}`, className:'combo-full' });
  const comboOpts = getCurtainCombos();
  combo.innerHTML =
    `<option value="">เลือกแบบม่าน</option>` +
    comboOpts.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
  combo.onchange = () => { hydrateCard(id); autoSummarize(); };

  const del  = el('button', { className:'item-delete', title:'ลบ', innerText:'×' });
  del.onclick = () => { items.delete(id); card.remove(); autoSummarize(true); };

  const dup  = el('button', { className:'item-dup', title:'ทำซ้ำ', innerText:'⧉' });
  dup.onclick = () => duplicateItem(id);

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

  setTimeout(()=>{


});

  // ===== SECTION: ALUMINUM BLIND (KDN / KACEE) =====
  const secAlu = el('div', { className:'alt-box', id:`sec-alu-${id}`, style:'display:none' });
  const _kaceeOpts = KACEE_MODEL_LIST.map(m => `<option value="${m}">${m}</option>`).join('');
  secAlu.innerHTML = `
    <div class="form-group" id="alu-brand-grp-${id}">
      <label>ยี่ห้อมู่ลี่:</label>
      <select id="alu-model-${id}">
        <option value="KDN">มู่ลี่ KDN (STE)</option>
        <option value="KACEE">มู่ลี่ KACEE (KC)</option>
      </select>
    </div>
    <div class="form-group" id="kacee-sub-grp-${id}" style="display:none">
      <label>รุ่น:</label>
      <select id="kacee-sub-${id}">
        ${_kaceeOpts}
      </select>
    </div>
    <div class="alt-row">
      <div class="form-group"><label>กว้าง (เมตร):</label><input type="number" id="alu-w-${id}" min="0" step="0.01" placeholder="เช่น 1.20"></div>
      <div class="form-group"><label>สูง (เมตร):</label><input type="number" id="alu-h-${id}" min="0" step="0.01" placeholder="เช่น 1.20"></div>
      <div class="form-group"><label>จำนวนชุด:</label><input type="number" id="alu-q-${id}" min="1" value="1"></div>
      <div class="price-box" id="alu-price-${id}"></div>
    </div>
    <div class="note">* ขนาดต้องตรงกับช่วงในตารางราคา</div>
  `.replace('${_kaceeOpts}', _kaceeOpts);
 function recalcAlu(){
  const model = $(`#alu-model-${id}`).value; // KDN | KACEE
  const wStr = $(`#alu-w-${id}`).value;
  const hStr = $(`#alu-h-${id}`).value;
  const q = Math.max(1, toNum($(`#alu-q-${id}`).value, 1));

  // แสดง/ซ่อน dropdown รุ่น KACEE
  const subGrp = $(`#kacee-sub-grp-${id}`);
  if (subGrp) subGrp.style.display = (model === 'KACEE') ? '' : 'none';

  const wDisplay = toNum(wStr);
  const hDisplay = toNum(hStr);
  if (!wDisplay || !hDisplay) {
    $(`#alu-price-${id}`).textContent='';
    const st=items.get(id); st.kdn=0; st.kacee=0;
    return;
  }

  const wLookup = lookupTenthByHundredths(wStr);
  const hLookup = lookupTenthByHundredths(hStr);

  let price = null;
  if (model === 'KDN') {
    price = matrixPrice(blindKDN, 'KDN_25mm', wLookup, hLookup);
  } else {
    // KACEE — ใช้ข้อมูลฝังตัวตามรุ่นที่เลือก
    const subModel = $(`#kacee-sub-${id}`)?.value || KACEE_MODEL_LIST[0];
    const modelData = KACEE_MODELS_DATA[subModel];
    if (modelData) {
      const wrapper = { blinds: { _k: modelData } };
      price = matrixPrice(wrapper, '_k', wLookup, hLookup);
      // ราคาขั้นต่ำ = ราคาขนาด 1.00*1.00 ของรุ่นนั้น
      const minPrice = matrixPrice(wrapper, '_k', 1.0, 1.0);
      if (price != null && minPrice != null && price < minPrice) {
        price = minPrice;
      }
    }
  }

  if (price == null) {
    $(`#alu-price-${id}`).textContent='';
    const st=items.get(id); st.kdn=0; st.kacee=0;
    return;
  }

  const total = price * q;
  $(`#alu-price-${id}`).textContent = fmt(total) + ' บาท';

  const st = items.get(id);
  if (model==='KDN'){ st.kdn = total; st.kacee = 0; } else { st.kacee = total; st.kdn = 0; }
}

  setTimeout(() => {
    bindAuto($(`#alu-model-${id}`),  recalcAlu);
    bindAuto($(`#kacee-sub-${id}`),  recalcAlu);
    bindAuto($(`#alu-w-${id}`),      recalcAlu);
    bindAuto($(`#alu-h-${id}`),      recalcAlu);
    bindAuto($(`#alu-q-${id}`),      recalcAlu);
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

  // ===== SECTION: ROLLER =====
const secRoller = el('div', { className:'alt-box', id:`sec-roller-${id}`, style:'display:none' });

secRoller.innerHTML = `
<div class="alt-row">
<div class="form-group">
<label>กว้าง (เมตร):</label>
<input type="number" id="roller-w-${id}" step="0.01">
</div>

<div class="form-group">
<label>สูง (เมตร):</label>
<input type="number" id="roller-h-${id}" step="0.01">
</div>

<div class="form-group">
<label>จำนวนชุด:</label>
<input type="number" id="roller-q-${id}" value="1">
</div>

<div class="price-box" id="roller-price-${id}"></div>
</div>
`;

function recalcRoller(){

  const combo = $(`#combo-${id}`).value;
const type = combo.split('|')[1]; // Blackout / 3% / 1%
  const w = toNum($(`#roller-w-${id}`).value);
  const h = toNum($(`#roller-h-${id}`).value);
  const q = Math.max(1, toNum($(`#roller-q-${id}`).value, 1));

  if (!w || !h){
    $(`#roller-price-${id}`).textContent = '';
    items.get(id).roller = 0;
    return;
  }

  // ✅ ตารางราคา (ตามชีท)
  let pricePerSqm = 0;
  let minPrice = 0;

  if(type === "Blackout"){
    pricePerSqm = 550;
    minPrice = 825;
  }
  else if(type === "3%"){
    pricePerSqm = 590;
    minPrice = 885;
  }
  else if(type === "1%"){
    pricePerSqm = 750;
    minPrice = 1125;
  }

  // ✅ สูตรชีท
  let area = w * h * 1.2;

  // ถ้าไม่ถึง 1.50 → ปัดเป็น 1.50
  if(area < 1.5){
    area = 1.5;
  }

  let unitPrice = area * pricePerSqm;

  // ✅ บังคับขั้นต่ำ
  if(unitPrice < minPrice){
    unitPrice = minPrice;
  }

  const total = unitPrice * q;

  $(`#roller-price-${id}`).textContent = fmt(total) + ' บาท';

  items.get(id).roller = total;
}

setTimeout(()=>{

bindAuto($(`#roller-w-${id}`),recalcRoller);
bindAuto($(`#roller-h-${id}`),recalcRoller);
bindAuto($(`#roller-q-${id}`),recalcRoller);
bindAuto($(`#combo-${id}`), recalcRoller);
});


const secMosq = el('div', { className:'alt-box', id:`sec-mosq-${id}`, style:'display:none' });

secMosq.innerHTML = `
<div class="form-group">
<label>รูปแบบ:</label>
<select id="mosq-type-${id}">
<option value="center">แยกกลาง</option>
<option value="single">สไลด์เดี่ยว</option>
</select>
</div>

<div class="alt-row">
<div class="form-group">
<label>กว้าง (เมตร):</label>
<input type="number" id="mosq-w-${id}" step="0.01">
</div>

<div class="form-group">
<label>สูง (เมตร):</label>
<input type="number" id="mosq-h-${id}" step="0.01">
</div>

<div class="form-group">
<label>จำนวนชุด:</label>
<input type="number" id="mosq-q-${id}" value="1">
</div>

<div class="price-box" id="mosq-price-${id}"></div>
</div>
`;
function recalcMosq(){

const combo = $(`#combo-${id}`).value;
const brand = combo.split('|')[1];

const type = $(`#mosq-type-${id}`).value;

const w = toNum($(`#mosq-w-${id}`).value);
const h = toNum($(`#mosq-h-${id}`).value);
const q = Math.max(1,toNum($(`#mosq-q-${id}`).value,1));

if(!w || !h){
  $(`#mosq-price-${id}`).textContent='';
  items.get(id).mosq=0;
  autoSummarize();
  return;
}

let price=0;

if(brand==="LUXURY"){
  price=1400;
}

if(brand==="SAFE"){
  price = (type==="center") ? 2500 : 1400;
}

if(brand==="PNET"){
  price=1500;
}

const total = w*h*price*q;

$(`#mosq-price-${id}`).textContent = fmt(total)+' บาท';

items.get(id).mosq = total;

autoSummarize();
}

setTimeout(()=>{
bindAuto($(`#mosq-w-${id}`),recalcMosq);
bindAuto($(`#mosq-h-${id}`),recalcMosq);
bindAuto($(`#mosq-q-${id}`),recalcMosq);
bindAuto($(`#mosq-type-${id}`),recalcMosq);
});

// ===== SECTION: HONEYCOMB (มุ้งรังผึ้ง) =====
const secHoney = el('div', { className:'alt-box', id:`sec-honey-${id}`, style:'display:none' });

secHoney.innerHTML = `
<div class="form-group">
<label>รูปแบบ:</label>
<select id="honey-type-${id}">
<option value="single">สไลด์เดี่ยว</option>
<option value="center">แยกกลาง</option>
</select>
</div>

<div class="alt-row">
<div class="form-group">
<label>กว้าง (เมตร):</label>
<input type="number" id="honey-w-${id}" step="0.01">
</div>

<div class="form-group">
<label>สูง (เมตร):</label>
<input type="number" id="honey-h-${id}" step="0.01">
</div>

<div class="price-box" id="honey-price-${id}"></div>
</div>

<div class="note">* 1,800 บาท/ตร.ม. ขั้นต่ำ 1 ตร.ม. (แยกกลางขั้นต่ำ 2 ตร.ม.)</div>
`;

function recalcHoney(){

const type = $(`#honey-type-${id}`).value;

const w = toNum($(`#honey-w-${id}`).value);
const h = toNum($(`#honey-h-${id}`).value);

if(!w || !h){
  $(`#honey-price-${id}`).textContent='';
  items.get(id).honey=0;
  autoSummarize();
  return;
}

// 1,800 บาท/ตร.ม. — ขั้นต่ำ 1 ตร.ม. / แยกกลางขั้นต่ำ 2 ตร.ม.
const minArea = (type==="center") ? 2 : 1;

let area = w*h;
if(area < minArea) area = minArea;

const total = area*1800;

$(`#honey-price-${id}`).textContent = fmt(total)+' บาท';

items.get(id).honey = total;

autoSummarize();
}

setTimeout(()=>{
bindAuto($(`#honey-w-${id}`),recalcHoney);
bindAuto($(`#honey-h-${id}`),recalcHoney);
bindAuto($(`#honey-type-${id}`),recalcHoney);
});

  // ===== FOOTER: ความสูงรวม (เพื่อสรุป) =====
  const foot = el('div', { className:'item-footer' });
  const hGroup = el('div', { className:'form-group grow' });
  hGroup.innerHTML = `<label>ความสูง (เมตร):</label><input type="number" id="h-${id}" min="0" step="0.01" placeholder="สูงตามสั่ง">`;
  foot.append(hGroup);

  // ประกอบการ์ด
card.append(head, secCurtain, secWood, secAlu, secRoman, secRoller, secMosq, secHoney, foot);
  $('#itemsContainer').append(card);

  setTimeout(() => {
    const hEl = document.querySelector(`#h-${id}`);
    if (!hEl) return;
    ['input','change','keyup','blur'].forEach(ev => {
      hEl.addEventListener(ev, summarizeAllItems);
    });
  });

  // init state
  items.set(id, {
  rail:0,
  opaque:0,
  sheer:0,
  wood:0,
  kdn:0,
  kacee:0,
  roman:0,
  roller:0,
  mosq:0,
  honey:0,
  hookRing: 0,
  hookRingOpaque: false,
hookRingSheer: false,
});

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

  setTimeout(() => {
    bindAuto($(`#rail-${id}`), recalc);
    bindAuto($(`#rw-${id}`),   recalc);
    bindAuto($(`#rq-${id}`),   recalc);
  });

  setTimeout(()=>{

const chk1 = document.querySelector(`#overheight-opaque-${id}`);
const chk2 = document.querySelector(`#overheight-sheer-${id}`);
const box  = document.querySelector(`#fabricBox-${id}`);

function toggleFabric(){

if(!box) return;

if((chk1 && chk1.checked) || (chk2 && chk2.checked)){
box.style.display = 'inline-block';
}else{
box.style.display = 'none';
}

}

if(chk1) chk1.addEventListener('change',toggleFabric);
if(chk2) chk2.addEventListener('change',toggleFabric);

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

  const overBox = el('div',{className:'form-group check',style:'display:flex;align-items:center;gap:6px;'});
overBox.innerHTML = `
<label>
<input type="checkbox" id="overheight-opaque-${id}">
สูงเกินหน้าผ้า
</label>
`;

const fabricSel = el('span',{
id:`fabricWidthOpaqueBox-${id}`,
style:'display:none;margin-left:6px;'
});

fabricSel.innerHTML=`
<select id="fabricWidthOpaque-${id}" style="width:70px">
<option value="1.4">1.4</option>
<option value="2.8">2.8</option>
<option value="3.2">3.2</option>
</select>
`;

overBox.append(fabricSel);

setTimeout(()=>{

const chk = document.querySelector(`#overheight-opaque-${id}`);
const box = document.querySelector(`#fabricWidthOpaqueBox-${id}`);

if(chk){
chk.addEventListener('change',()=>{

box.style.display = chk.checked ? 'inline-block' : 'none';

if(chk.checked){

const valStr = $(`#op-${id}`).value;
const [ctype, ftype] = (valStr || '').split('|');

const def = getDefaultFabricWidth(ftype);

$(`#fabricWidthOpaque-${id}`).value = def;

}

recalc();

});
}

});


function recalc(){

const valStr = $(`#op-${id}`).value;
const [ctype, ftype] = (valStr || '').split('|');

const row = curtainData.find(
x => x.curtainType === ctype && x.fabricType === ftype
);

const w = toNum($(`#ow-${id}`).value);
const h = toNum($(`#h-${id}`)?.value);
const q = Math.max(1,toNum($(`#oq-${id}`).value,2));

if(!row || !w){
$(`#oprice-${id}`).textContent='';
items.get(id).opaque = 0;
return;
}

// ราคาปกติ
let val = row.price * w * q;

const over = $(`#overheight-opaque-${id}`)?.checked;

if(!over){
  delete items.get(id).fabricMode;
}

if(over && h){

const fabricWidth = parseFloat($(`#fabricWidthOpaque-${id}`).value);

// เช็คขวางผ้าหรือ ต่อผ้า
const mode = calcFabricMode(w,row.curtainType,fabricWidth);

items.get(id).fabricMode = mode;

if(mode === "ต่อผ้า" || mode === "ขวางผ้า"){

const pricePerMeter = getFabricYardPrice(ftype);

val = calcJoinFabricCost(
w,
h,
fabricWidth,
pricePerMeter,
q,
ctype
);

}

}

$(`#oprice-${id}`).textContent = fmt(val) + ' บาท';

items.get(id).opaque = val;

autoSummarize(); 

}


right.append(selGrp, widthGrp, qtyGrp, price, overBox);
  li.append(right);

 setTimeout(() => {
  bindAuto($(`#op-${id}`), recalc);
  bindAuto($(`#ow-${id}`), recalc);
  bindAuto($(`#oq-${id}`), recalc);
  bindAuto($(`#h-${id}`),  recalc);
  bindAuto($(`#fabricWidthOpaque-${id}`), recalc);
  bindAuto($(`#ow-${id}`), () => recalcHookRing(id));
bindAuto($(`#oq-${id}`), () => recalcHookRing(id));
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

  const overBox = el('div',{className:'form-group check',style:'display:flex;align-items:center;gap:6px;'});
overBox.innerHTML = `
<label>
<input type="checkbox" id="overheight-sheer-${id}">
สูงเกินหน้าผ้า
</label>
`;

const fabricSel = el('span',{
id:`fabricWidthSheerBox-${id}`,
style:'display:none;margin-left:6px;'
});

fabricSel.innerHTML=`
<select id="fabricWidthSheer-${id}" style="width:70px">
<option value="1.4">1.4</option>
<option value="2.8">2.8</option>
<option value="3.2">3.2</option>
</select>
`;

overBox.append(fabricSel);

setTimeout(()=>{

const chk = document.querySelector(`#overheight-sheer-${id}`);
const box = document.querySelector(`#fabricWidthSheerBox-${id}`);

if(chk){
chk.addEventListener('change',()=>{

box.style.display = chk.checked ? 'inline-block' : 'none';

if(chk.checked){

const type = $(`#sh-${id}`).value;

const def = getDefaultFabricWidth(type);

$(`#fabricWidthSheer-${id}`).value = def;

}

recalc();

});
}

});

  function recalc(){
    const type = $(`#sh-${id}`).value;
    const row = sheerCurtainData.find(x => x.sheerFabricType === type || x.sheerCurtainType === type);
    const w = toNum($(`#sw-${id}`).value);
    const q = Math.max(1, toNum($(`#sq-${id}`).value, 2));
    if (!row || !w) { $(`#sprice-${id}`).textContent = ''; items.get(id).sheer = 0; return; }
    let val = row.price * w * q;

const h = toNum($(`#h-${id}`)?.value);
const over = $(`#overheight-sheer-${id}`)?.checked;

if(!over){
  delete items.get(id).sheerMode;
}

if(over && h){

const fabricWidth = parseFloat($(`#fabricWidthSheer-${id}`).value);

// เช็คขวางผ้า / ต่อผ้า — ใช้ชนิดม่านจริงๆ ไม่ใช่ ม่านตาไก่
const curtainType = $(`#combo-${id}`).value.split('|')[1] || "ม่านตาไก่";
const mode = calcFabricMode(w,curtainType,fabricWidth);

items.get(id).sheerMode = mode;

if(mode === "ต่อผ้า" || mode === "ขวางผ้า"){

const pricePerYard = getFabricYardPrice(type);

val = calcJoinFabricCost(
w,
h,
fabricWidth,
pricePerYard,
q,
curtainType
);

}

}

$(`#sprice-${id}`).textContent = fmt(val) + ' บาท';
items.get(id).sheer = val;

autoSummarize();
  }

  right.append(selGrp, widthGrp, qtyGrp, price, overBox);
  li.append(right);

  setTimeout(() => {
  bindAuto($(`#sh-${id}`), recalc);
  bindAuto($(`#sw-${id}`), recalc);
  bindAuto($(`#sq-${id}`), recalc);
  bindAuto($(`#h-${id}`),  recalc);
    bindAuto($(`#fabricWidthSheer-${id}`), recalc);
});

  return li;
}

/*******************************
 * ปุ่มช่วย: แยกกลาง/เดี่ยว (กว้าง) และ ปรับความสูง
 *******************************/
function widthFromRail(id, targetBase, mode) {
  const railEl = document.querySelector(`#rw-${id}`);
  const tgt = document.querySelector(`#${targetBase}-${id}`);
  const qtyEl = document.querySelector(`#${targetBase === 'ow' ? 'oq' : 'sq'}-${id}`);
  const combo = document.querySelector(`#combo-${id}`)?.value || '';

  if (!railEl || !tgt || !qtyEl) return;

  const rw = parseFloat(railEl.value);
  if (isNaN(rw)) return;

  const keep3 = /\.\d{3,}/.test(railEl.value || '');

  // 👉 ดึงชนิดม่าน
  const type = combo.split('|')[1] || '';

  // 👉 เช็คว่าเป็น “กลุ่มพิเศษ”
  const isPleatOrWave =
    type.includes('ม่านจีบ') ||
    type.includes('ม่านลอนเทป');

  let val = rw;
  let qty = 1;

  if (isPleatOrWave) {
    // ✅ ม่านจีบ / ลอนเทป
    if (mode === 'half') {
      val = rw / 2;
      qty = 2;
    }
    if (mode === 'full') {
      val = rw;
      qty = 1;
    }
  } else {
    // ✅ ม่านทั่วไป
    if (mode === 'half') {
      val = rw;
      qty = 2;
    }
    if (mode === 'full') {
      val = rw * 2;
      qty = 1;
    }
  }

  tgt.value = keep3 ? val.toFixed(3) : val.toFixed(2);
  qtyEl.value = qty;

  tgt.dispatchEvent(new Event('input'));
  tgt.dispatchEvent(new Event('change'));
  qtyEl.dispatchEvent(new Event('input'));
  qtyEl.dispatchEvent(new Event('change'));
}
function attachWidthButtons(id, targetBase) {
  const inp = document.querySelector(`#${targetBase}-${id}`);
  if (!inp) return;
  if (inp.dataset.widthBtns === '1') return;

  // ตรวจชนิดม่าน เพื่อตัดสินใจว่าจะแสดงปุ่มห่วงโชว์ราง
  const combo = document.querySelector(`#combo-${id}`)?.value || '';
  const curtainBase = baseType(combo.split('|')[1] || '');
  const showRingBtn = curtainBase === 'ม่านจีบ' || curtainBase === 'ม่านลอนตะขอ';

  // ✅ container แนวตั้ง
  const wrap = document.createElement('div');
  wrap.className = 'width-btn-group';

  const btnHalf = document.createElement('button');
  btnHalf.type = 'button';
  btnHalf.className = 'action-btn half-btn width-mode-btn';
  btnHalf.textContent = 'แยกกลาง';
  btnHalf.onclick = () => widthFromRail(id, targetBase, 'half');

  const btnFull = document.createElement('button');
  btnFull.type = 'button';
  btnFull.className = 'action-btn full-btn width-mode-btn';
  btnFull.textContent = 'เดี่ยว';
  btnFull.onclick = () => widthFromRail(id, targetBase, 'full');

  wrap.append(btnHalf, btnFull);

  // ✅ ปุ่มห่วงโชว์ราง — เฉพาะม่านจีบ และ ม่านลอนตะขอ
  if (showRingBtn) {
    const btnRing = document.createElement('button');
    btnRing.type = 'button';
    btnRing.className = 'hook-btn width-mode-btn';
    btnRing.textContent = 'ห่วงโชว์ราง';

    btnRing.onclick = () => {
      const st = items.get(id);
      if (targetBase === 'ow') {
        st.hookRingOpaque = !st.hookRingOpaque;
        btnRing.classList.toggle('active', st.hookRingOpaque);
      }
      if (targetBase === 'sw') {
        st.hookRingSheer = !st.hookRingSheer;
        btnRing.classList.toggle('active', st.hookRingSheer);
      }
      recalcHookRing(id);
    };

    wrap.append(btnRing);
  }

  inp.insertAdjacentElement('afterend', wrap);
  inp.dataset.widthBtns = '1';
}

function adjustHeightBy(id, delta) {
  const hEl = document.querySelector(`#h-${id}`);
  if (!hEl) return;

  const now = parseFloat(hEl.value);
  if (isNaN(now)) return;

  const next = now - delta;

  // ✅ บังคับ 3 ตำแหน่งเสมอ
  hEl.value = formatHeightSmart(next);

  hEl.dispatchEvent(new Event('input'));
  hEl.dispatchEvent(new Event('change'));
  summarizeAllItems();
}

function recalcHookRing(id){

  const st = items.get(id);

  // 👉 ม่านทึบ
  const ow = toNum(document.querySelector(`#ow-${id}`)?.value);
  const oq = Math.max(1, toNum(document.querySelector(`#oq-${id}`)?.value, 1));

  // 👉 ม่านโปร่ง
  const sw = toNum(document.querySelector(`#sw-${id}`)?.value);
  const sq = Math.max(1, toNum(document.querySelector(`#sq-${id}`)?.value, 1));

  let totalWidth = 0;

  if(st.hookRingOpaque && ow){
    totalWidth += ow * oq;
  }

  if(st.hookRingSheer && sw){
    totalWidth += sw * sq;
  }

  const price = totalWidth * 30;

  st.hookRing = price;

  autoSummarize();
}

function attachHeightButtonsPleat(id) {
  const hEl = document.querySelector(`#h-${id}`);
  if (!hEl) return;
  if (hEl.dataset.hookBtns === '1') return;

  // container (จัด layout 2 คอลัมน์)
  const wrap = document.createElement('div');
  wrap.style.display = 'grid';
  wrap.style.gridTemplateColumns = '1fr 1fr';
  wrap.style.gap = '6px';
  wrap.style.marginTop = '6px';

  function makeBtn(text, reduce) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hook-btn';
    btn.textContent = text;

    btn.onclick = () => {
      adjustHeightBy(id, reduce);
    };

    return btn;
  }

  // === แถวที่ 1 ===
  wrap.append(
    makeBtn('ตะขอยาว', 0.055),
    makeBtn('ตะขอยาว(ใช้ลิ้นราง)', 0.045)
  );

  // === แถวที่ 2 ===
  wrap.append(
    makeBtn('ตะขอสั้น', 0.015),
    makeBtn('ตะขอสั้น(ใช้ลิ้นราง)', 0.01)
  );

  // === แถวที่ 3 ===
  wrap.append(
    makeBtn('ตะขอเพดาน', 0.02),
    makeBtn('ตะขอเพดาน(ใช้ลิ้นราง)', 0.015)
  );

  // ใส่หลัง input ความสูง
  hEl.insertAdjacentElement('afterend', wrap);

  hEl.dataset.hookBtns = '1';
}
function attachHeightButtonWave(id) {
  const hEl = document.querySelector(`#h-${id}`);
  if (!hEl) return;
  if (hEl.dataset.waveBtn === '1') return;

  // ✅ ใช้ grid เหมือนม่านจีบ
  const wrap = document.createElement('div');
  wrap.style.display = 'grid';
  wrap.style.gridTemplateColumns = '1fr 1fr';
  wrap.style.gap = '6px';
  wrap.style.marginTop = '6px';

  function makeBtn(text, reduce){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hook-btn';
    btn.textContent = text;
    btn.onclick = () => adjustHeightBy(id, reduce);
    return btn;
  }

  wrap.append(
    makeBtn('ติดเพดาน', 0.055),
    makeBtn('ติดเพดาน(ใช้ลิ้นราง)', 0.045)
  );

  hEl.insertAdjacentElement('afterend', wrap);

  hEl.dataset.waveBtn = '1';
}
// ล้างปุ่มเครื่องมือก่อนสลับแบบม่าน
function clearToolButtons(id) {
  const card = document.getElementById(`item-${id}`);
  if (!card) return;
  // ลบ container group ก่อน (ครอบ half/full/hook ไว้ข้างใน)
  card.querySelectorAll('.width-btn-group').forEach(el => el.remove());
  // ลบปุ่มที่ยังหลงเหลืออยู่นอก group (กรณี legacy)
  card.querySelectorAll('.half-btn, .full-btn, .hook-btn').forEach(el => el.remove());
  const h = document.getElementById(`h-${id}`);
  if (h) { delete h.dataset.hookBtns; delete h.dataset.waveBtn; }
  ['ow','sw'].forEach(base => {
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
  $(`#sec-roller-${id}`).style.display   = 'none';
  $(`#sec-honey-${id}`).style.display    = 'none';



  if (v.startsWith('CURTAIN|')) {
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
    sSel.innerHTML = sheers.map(s => {
      let label = s.sheerFabricType;
      if (label.includes('หนาพิเศษ')) {
        label = label.replace('หนาพิเศษ', 'อื่นๆ') + ' (Linen Pie,โปร่งไม่มีในสต็อก)';
      } else if (label.includes('สูงพิเศษ')) {
        label = label + ' (สูงพิเศษ,Richy,Mid-modern)';
      }
      return `<option value="${s.sheerFabricType}">${label}</option>`;
    }).join('');
    sSel.disabled = sheers.length === 0;

    $(`#sec-curtain-${id}`).style.display = '';
    if (footerEl) footerEl.style.display = '';

    // ปุ่มช่วยเฉพาะ “ม่านจีบ/ม่านลอนเทป/ม่านลอนตะขอ”
    const base = baseType(ctype);
    if (
  base === 'ม่านจีบ' ||
  base === 'ม่านลอนเทป' ||
  base === 'ม่านลอนตะขอ' ||
  base === 'ม่านตาไก่' ||
  base === 'ม่านซ่อนหู' ||
  base === 'ม่านคอกระเช้า' ||
  base === 'ม่านสอด' ||
  base === 'ม่านลอนโซ่'
) {
      attachWidthButtons(id, 'ow');
      attachWidthButtons(id, 'sw');
      if (base === 'ม่านจีบ' || base === 'ม่านลอนตะขอ' || base === 'ม่านลอนโซ่') attachHeightButtonsPleat(id);
      else if (base === 'ม่านลอนเทป') attachHeightButtonWave(id);
    }
  }
  else if (v === 'WOOD_BLIND') {
    $(`#sec-wood-${id}`).style.display = '';
    if (footerEl) footerEl.style.display = 'none';
  }
  else if (v === 'KDN_BLIND' || v === 'KACEE_BLIND') {
    const isKACEE = (v === 'KACEE_BLIND');
    $(`#alu-model-${id}`).value = isKACEE ? 'KACEE' : 'KDN';
    // ซ่อน dropdown ยี่ห้อ (ไม่จำเป็นเพราะ combo หลักบอกยี่ห้อแล้ว)
    const brandGrp = $(`#alu-brand-grp-${id}`);
    if (brandGrp) brandGrp.style.display = 'none';
    // แสดง dropdown รุ่นทันทีสำหรับ KACEE
    const subGrp = $(`#kacee-sub-grp-${id}`);
    if (subGrp) subGrp.style.display = isKACEE ? '' : 'none';
    $(`#sec-alu-${id}`).style.display = '';
    if (footerEl) footerEl.style.display = 'none';
    // trigger คำนวณราคาทันที
    setTimeout(() => {
      const aluModel = $(`#alu-model-${id}`);
      if (aluModel) aluModel.dispatchEvent(new Event('change'));
    }, 0);
  }
  else if (v.startsWith('ROMAN|')) {
    const fabric = v.split('|')[1];
    $(`#roman-fabric-${id}`).value = fabric;
    $(`#sec-roman-${id}`).style.display = '';
    if (footerEl) footerEl.style.display = '';
  }

else if (v.startsWith('ROLLER|')) {
  $(`#sec-roller-${id}`).style.display = '';
  if (footerEl) footerEl.style.display = 'none';
}
else if (v.startsWith('MOSQ|')) {
  $(`#sec-mosq-${id}`).style.display='';
  if (footerEl) footerEl.style.display='none';
}
else if (v === 'HONEYCOMB') {
  $(`#sec-honey-${id}`).style.display='';
  if (footerEl) footerEl.style.display='none';
}
  autoSummarize(true);
}

/*******************************
 * สรุปผลทุกการ์ด + คัดลอก
 *******************************/
function summarizeAllItems(){
  const cardSummaries = []; // { id, lines:[], subtotal, hasRail, hasOpaque, hasSheer }
  const blindsAgg = {
    WOOD:  { label: 'มู่ลี่ไม้',            entries: [], total: 0 },
    KDN:   { label: 'มู่ลี่อลูมิเนียม STE', entries: [], total: 0 },
    KACEE: { label: 'มู่ลี่อลูมิเนียม KC',  entries: [], total: 0 },
      ROLLER: { label: '', entries: [], total: 0 },
  };
  const railAgg  = {}; // label -> {label, entries:[{id,line,amt}], total}
  const opaqueAgg = {};
  const sheerAgg = {};
  const romanAgg = {}; // key=fabric -> { label: `ม่านพับ (${fabric})`, entries:[], total:0 }

// reset detail ทุกครั้งก่อนคำนวณ
for (const [, st] of items) {

delete st._railDetail;
delete st._opaqueDetail;
delete st._sheerDetail;

}

  // ---------- PASS 1 ----------
  for (const [id, st] of items) {
    const lines = [];
    let subtotal = 0;
    let hasRail = false, hasOpaque = false, hasSheer = false;

    const hVal  = parseFloat($(`#h-${id}`)?.value);
    const hText = isNaN(hVal) ? 'สูงตามสั่ง' : fmtSize(hVal, $(`#h-${id}`));

    // 1) ราง — เก็บรายละเอียด (ยังไม่พิมพ์)
    if (st.rail > 0) {
      const rw = fmtSize(toNum($(`#rw-${id}`)?.value), $(`#rw-${id}`));
      const rq = Math.max(1, toNum($(`#rq-${id}`)?.value, 1));
      const rname = $(`#rail-${id}`)?.options[$(`#rail-${id}`).selectedIndex]?.text || 'ราง';
      st._railDetail = {
        label: rname,
        line:  `${rw} = ${rq} ชุด ${fmt(st.rail)} บาท`,
        amt: Math.round(st.rail),
      };
      hasRail = true;
    }

    // 2) ม่านทึบ — เก็บรายละเอียด
    if (st.opaque > 0) {
      const ow = fmtSize(toNum($(`#ow-${id}`)?.value), $(`#ow-${id}`));
      const oq = Math.max(1, toNum($(`#oq-${id}`)?.value, 2));
      let oname = $(`#op-${id}`)?.options[$(`#op-${id}`).selectedIndex]?.text || 'ม่านทึบ';

const mode = items.get(id)?.fabricMode;

if(mode){
  oname += ` (${mode})`;
}
      st._opaqueDetail = {
        label: oname,
        line:  `${ow}*${hText} = ${oq} ผืน ${fmt(st.opaque)} บาท`,
        amt: Math.round(st.opaque),
      };
      hasOpaque = true;
    }

    // 3) ม่านโปร่ง — เก็บรายละเอียด
if (st.sheer > 0) {

const sw = fmtSize(toNum($(`#sw-${id}`)?.value), $(`#sw-${id}`));
const sq = Math.max(1, toNum($(`#sq-${id}`)?.value, 2));

let sname = ($(`#sh-${id}`)?.options[$(`#sh-${id}`).selectedIndex]?.text || 'ม่านโปร่ง')
  .replace(/\s*\([^)]*\)$/, '')
  .replace('หนาพิเศษ', 'อื่นๆ');

const mode = items.get(id)?.sheerMode;

if(mode){
  sname += ` (${mode})`;
}

st._sheerDetail = {
  label: sname,
  line: `${sw}*${hText} = ${sq} ผืน ${fmt(st.sheer)} บาท`,
  amt: Math.round(st.sheer),
};

hasSheer = true;
}

    // 4) มู่ลี่ไม้ → กรู๊ป
    if (st.wood > 0) {
      const w = fmtSize(toNum($(`#wb-w-${id}`)?.value), $(`#wb-w-${id}`));
      const h = fmtSize(toNum($(`#wb-h-${id}`)?.value), $(`#wb-h-${id}`));
      const q = Math.max(1, toNum($(`#wb-q-${id}`)?.value, 1));
      blindsAgg.WOOD.entries.push({ id, line: `${w}*${h} = ${q} ชุด ${fmt(st.wood)} บาท`, amt: Math.round(st.wood) });
      blindsAgg.WOOD.total += st.wood;
    }
    // 5) มู่ลี่อลูมิเนียม → กรู๊ป
    if (st.kdn > 0) {
      const w = fmtSize(toNum($(`#alu-w-${id}`)?.value), $(`#alu-w-${id}`));
      const h = fmtSize(toNum($(`#alu-h-${id}`)?.value), $(`#alu-h-${id}`));
      const q = Math.max(1, toNum($(`#alu-q-${id}`)?.value, 1));
      blindsAgg.KDN.entries.push({ id, line: `${w}*${h} = ${q} ชุด ${fmt(st.kdn)} บาท`, amt: Math.round(st.kdn) });
      blindsAgg.KDN.total += st.kdn;
    }
    if (st.kacee > 0) {
      const w = fmtSize(toNum($(`#alu-w-${id}`)?.value), $(`#alu-w-${id}`));
      const h = fmtSize(toNum($(`#alu-h-${id}`)?.value), $(`#alu-h-${id}`));
      const q = Math.max(1, toNum($(`#alu-q-${id}`)?.value, 1));
      blindsAgg.KACEE.entries.push({ id, line: `${w}*${h} = ${q} ชุด ${fmt(st.kacee)} บาท`, amt: Math.round(st.kacee) });
      blindsAgg.KACEE.total += st.kacee;
    }



    // 6) ม่านพับ → กรู๊ปตาม fabric
    if (st.roman > 0) {
      const w = fmtSize(toNum($(`#roman-w-${id}`)?.value), $(`#roman-w-${id}`));
      const q = Math.max(1, toNum($(`#roman-q-${id}`)?.value, 1));
      const fabric = $(`#roman-fabric-${id}`)?.value || 'Dimout';
      if (!romanAgg[fabric]) romanAgg[fabric] = { label: `ม่านพับ (${fabric})`, entries: [], total: 0 };
      romanAgg[fabric].entries.push({ id, line: `${w}*${hText} = ${q} ชุด ${fmt(st.roman)} บาท`, amt: Math.round(st.roman) });
      romanAgg[fabric].total += st.roman;
    }

  // Roller Curtain → แยกตามเปอร์เซ็นต์
if (st.roller > 0) {

  const w = fmtSize(toNum($(`#roller-w-${id}`)?.value), $(`#roller-w-${id}`));
  const h = fmtSize(toNum($(`#roller-h-${id}`)?.value), $(`#roller-h-${id}`));
  const q = Math.max(1, toNum($(`#roller-q-${id}`)?.value, 1));

  const comboVal = $(`#combo-${id}`)?.value || '';
  const percent = comboVal.split('|')[1] || '';

  const key = `ROLLER_${percent}`;

  if (!blindsAgg[key]) {
    blindsAgg[key] = {
      label: `ม่านม้วน ${percent}`,
      entries: [],
      total: 0
    };
  }
  blindsAgg[key].entries.push({
    id,
    line: `${w}*${h} = ${q} ชุด ${fmt(st.roller)} บาท`,
    amt: Math.round(st.roller)
  });

  blindsAgg[key].total += st.roller;

}

// Mosquito Screen
if (st.mosq > 0){

  const w = fmtSize(toNum($(`#mosq-w-${id}`).value), $(`#mosq-w-${id}`));
  const h = fmtSize(toNum($(`#mosq-h-${id}`).value), $(`#mosq-h-${id}`));
  const q = Math.max(1,toNum($(`#mosq-q-${id}`).value,1));

  const combo = $(`#combo-${id}`).value;
  const brand = combo.split('|')[1];

  let label="มุ้งจีบ";

  if(brand==="LUXURY") label="มุ้งจีบ Luxury กันยุง";
  if(brand==="SAFE") label="มุ้งจีบนิรภัย";
  if(brand==="PNET") label="มุ้งจีบ P-net หนาพิเศษ";

  const key = `MOSQ_${brand}`;

  if(!blindsAgg[key]){
    blindsAgg[key]={label,entries:[],total:0};
  }

 const type = $(`#mosq-type-${id}`)?.value || '';

const typeText =
  type === 'center' ? 'แยกกลาง' :
  type === 'single' ? 'สไลด์เดี่ยว' : '';

blindsAgg[key].entries.push({
  id,
  line:`${w}*${h} = ${q} ชุด ${fmt(st.mosq)} บาท (${typeText})`,
  amt: Math.round(st.mosq)
});

  blindsAgg[key].total+=st.mosq;
}

// Honeycomb Screen (มุ้งรังผึ้ง)
if (st.honey > 0){

  const w = fmtSize(toNum($(`#honey-w-${id}`).value), $(`#honey-w-${id}`));
  const h = fmtSize(toNum($(`#honey-h-${id}`).value), $(`#honey-h-${id}`));

  const type = $(`#honey-type-${id}`)?.value || '';
  const typeText =
    type === 'center' ? 'แยกกลาง' :
    type === 'single' ? 'สไลด์เดี่ยว' : '';

  if(!blindsAgg.HONEY){
    blindsAgg.HONEY={label:'มุ้งรังผึ้ง',entries:[],total:0};
  }

  blindsAgg.HONEY.entries.push({
    id,
    line:`${w}*${h} = ${fmt(st.honey)} บาท (${typeText})`,
    amt: Math.round(st.honey)
  });

  blindsAgg.HONEY.total+=st.honey;
}



    // โยนเข้ากลุ่ม “การ์ดเดี่ยวหมวด” (เพื่อรวมข้ามการ์ด)
    if (st._opaqueDetail && !hasRail && !hasSheer && items.size > 1) {
      const key = st._opaqueDetail.label;
      if (!opaqueAgg[key]) opaqueAgg[key] = { label: key, entries: [], total: 0 };
      opaqueAgg[key].entries.push({ id, line: st._opaqueDetail.line, amt: st._opaqueDetail.amt });
      opaqueAgg[key].total += st._opaqueDetail.amt;
    }
    if (st._railDetail && !hasOpaque && !hasSheer) {
      const key = st._railDetail.label;
      if (!railAgg[key]) railAgg[key] = { label: key, entries: [], total: 0 };
      railAgg[key].entries.push({ id, line: st._railDetail.line, amt: st._railDetail.amt });
      railAgg[key].total += st._railDetail.amt;
    }
    if (st._sheerDetail && !hasRail && !hasOpaque && items.size > 1) {
      const key = st._sheerDetail.label;
      if (!sheerAgg[key]) sheerAgg[key] = { label: key, entries: [], total: 0 };
      sheerAgg[key].entries.push({ id, line: st._sheerDetail.line, amt: st._sheerDetail.amt });
      sheerAgg[key].total += st._sheerDetail.amt;
    }

    const hasAny =
st._railDetail ||
st._opaqueDetail ||
st._sheerDetail ||
st.wood ||
st.kdn ||
st.kacee ||
st.roman ||
st.roller ||
st.mosq ||
st.honey;

if (!hasAny) continue;

cardSummaries.push({
  id,
  hasRail,
  hasOpaque,
  hasSheer
});

}

  // multi-flags
  const multiWood  = blindsAgg.WOOD.entries.length  >= 2;
  const multiKDN   = blindsAgg.KDN.entries.length   >= 2;
  const multiKACEE = blindsAgg.KACEE.entries.length >= 2;
  const rollerKeys = Object.keys(blindsAgg).filter(k => k.startsWith('ROLLER_'));

const rollerMultiMap = {};

for (const k of rollerKeys) {
  rollerMultiMap[k] = blindsAgg[k].entries.length >= 2;
}

  const romanKeys = Object.keys(romanAgg);
  const romanMultiMap = {};
  for (const k of romanKeys) romanMultiMap[k] = romanAgg[k].entries.length >= 2;

  // ---------- PASS 2 ----------
  let output = '';
  let otherTotal = 0;
  let printedAnyGroup = false;
  let cardsPrinted = 0;
  let groupsPrinted = 0;

  for (const cs of cardSummaries) {
    const { id } = cs;
    let cardOut = '';
    let cardTotal = 0;
    let blockCount = 0;

    // ราง: แสดงบนการ์ดถ้า “ไม่ถูกรวม”
    if (items.get(id)?._railDetail) {
      const det = items.get(id)._railDetail;
      const group = railAgg[det.label];
      const isGrouped = group && group.entries.length >= 2 && !cs.hasOpaque && !cs.hasSheer;
      if (!isGrouped) {
        cardOut += `${det.label} ${det.line}\n`;
        cardTotal += det.amt;
        blockCount++;
      }

      const st = items.get(id);

if(st.hookRing > 0){
  cardOut += `+ห่วงโชว์ราง ${fmt(st.hookRing)} บาท\n`;
  cardTotal += st.hookRing;
}
    }

    // ม่านทึบ: แสดงบนการ์ดถ้า “ไม่ถูกรวม”
    if (items.get(id)?._opaqueDetail) {
      const det = items.get(id)._opaqueDetail;
      const group = opaqueAgg[det.label];
      const isGrouped = group && group.entries.length >= 2 && !cs.hasRail && !cs.hasSheer;
      if (!isGrouped) {
        cardOut += `${det.label}\n${det.line}\n`;
        cardTotal += det.amt;
        blockCount++;
      }
    }

    // ม่านโปร่ง: แสดงบนการ์ดถ้า “ไม่ถูกรวม”
    if (items.get(id)?._sheerDetail) {
      const det = items.get(id)._sheerDetail;
      const group = sheerAgg[det.label];
      const isGrouped = group && group.entries.length >= 2 && !cs.hasRail && !cs.hasOpaque;
      if (!isGrouped) {
        cardOut += `${det.label}\n${det.line}\n`;
        cardTotal += det.amt;
        blockCount++;
      }
    }

    // มู่ลี่: แสดงบนการ์ดถ้าไม่ใช่กรณี multi
    const woodHere = blindsAgg.WOOD.entries.filter(e => e.id === id);

if (!multiWood && woodHere.length === 1 && !cs.hasOpaque && !cs.hasSheer && !cs.hasRail) {
  cardOut += `มู่ลี่ไม้\n${woodHere[0].line}\n`;
  cardTotal += woodHere[0].amt;
  blockCount++;
}
    const kdnHere   = blindsAgg.KDN.entries.filter(e => e.id === id);
    if (!multiKDN && kdnHere.length === 1) {
      cardOut += `มู่ลี่อลูมิเนียม STE\n${kdnHere[0].line}\n`;
      cardTotal += kdnHere[0].amt;
      blockCount++;
    }
    const kaceeHere = blindsAgg.KACEE.entries.filter(e => e.id === id);
    if (!multiKACEE && kaceeHere.length === 1) {
      cardOut += `มู่ลี่อลูมิเนียม KC\n${kaceeHere[0].line}\n`;
      cardTotal += kaceeHere[0].amt;
      blockCount++;
    }

    // ม่านพับ: แสดงบนการ์ดถ้าชนิดผ้านั้นไม่ใช่ multi
    for (const k of romanKeys) {

  const here = romanAgg[k].entries.filter(e => e.id === id);

  if (!romanMultiMap[k] && here.length === 1 && !cs.hasOpaque && !cs.hasSheer && !cs.hasRail) {

    cardOut += `${romanAgg[k].label}\n${here[0].line}\n`;
    cardTotal += here[0].amt;
    blockCount++;

  }
}

// ม่านม้วน
for (const k of rollerKeys) {

  const here = blindsAgg[k].entries.filter(e => e.id === id);

  if (!rollerMultiMap[k] && here.length === 1) {

    cardOut += `${blindsAgg[k].label}\n${here[0].line}\n`;
    cardTotal += here[0].amt;
    blockCount++;

  }
}

// มุ้งจีบ
for (const k in blindsAgg) {

  if (!k.startsWith('MOSQ_')) continue;

  const here = blindsAgg[k].entries.filter(e => e.id === id);
  const multi = blindsAgg[k].entries.length >= 2;

  if (!multi && here.length === 1) {

    cardOut += `${blindsAgg[k].label}\n${here[0].line}\n`;
    cardTotal += here[0].amt;
    blockCount++;

  }

}

// มุ้งรังผึ้ง
if (blindsAgg.HONEY) {

  const here = blindsAgg.HONEY.entries.filter(e => e.id === id);
  const multi = blindsAgg.HONEY.entries.length >= 2;

  if (!multi && here.length === 1) {

    cardOut += `${blindsAgg.HONEY.label}\n${here[0].line}\n`;
    cardTotal += here[0].amt;
    blockCount++;

  }

}


    // เงื่อนไขขึ้น “รวม … บาท” เฉพาะถ้ามี >= 2 หมวดในการ์ด
    if (cardOut.trim()) {
      if (blockCount > 1) cardOut = cardOut.trimEnd() + `\nรวม ${fmt(cardTotal)} บาท`;
      output += (output ? '\n\n' : '') + cardOut.trim();
      otherTotal += cardTotal;
      cardsPrinted++;
    }
  }

  function appendGroupBlock(group) {

  if (!group) return false;

  // ต้องมีมากกว่า 1 รายการ ถึงจะรวม
  if (group.entries.length < 2) return false;

  const body = group.entries.map(e => e.line).join('\n');

  output += (output ? '\n\n' : '') +
    group.label + '\n' +
    body +
    `\nรวม ${fmt(group.total)} บาท`;

  return true;
}

  // รวม ราง / ม่านทึบ / ม่านโปร่ง (แบบข้ามการ์ด)
  for (const k of Object.keys(railAgg))  { if (appendGroupBlock(railAgg[k]))  groupsPrinted++; }
  for (const k of Object.keys(opaqueAgg)){ if (appendGroupBlock(opaqueAgg[k])) groupsPrinted++; }
  for (const k of Object.keys(sheerAgg)) { if (appendGroupBlock(sheerAgg[k])) groupsPrinted++; }

 // รวม มู่ลี่
if (appendGroupBlock(blindsAgg.WOOD))  groupsPrinted++;
if (appendGroupBlock(blindsAgg.KDN))   groupsPrinted++;
if (appendGroupBlock(blindsAgg.KACEE)) groupsPrinted++;

// รวม ม่านม้วน (แยกเปอร์เซ็นต์)
for (const k in blindsAgg) {
  if (k.startsWith('ROLLER_')) {
    if (appendGroupBlock(blindsAgg[k])) groupsPrinted++;
  }
}

// รวม มุ้งจีบ
for (const k in blindsAgg) {
  if (k.startsWith('MOSQ_')) {
    if (appendGroupBlock(blindsAgg[k])) groupsPrinted++;
  }
}

// รวม มุ้งรังผึ้ง
if (blindsAgg.HONEY && appendGroupBlock(blindsAgg.HONEY)) groupsPrinted++;

  // รวม ม่านพับ (ต่อ fabric ที่มีหลายการ์ด)
  for (const k of romanKeys) { if (appendGroupBlock(romanAgg[k])) groupsPrinted++; }

  // รวมทั้งหมด: แสดงเฉพาะเมื่อมีอย่างน้อย 2 บล็อก
  const blocks = cardsPrinted + groupsPrinted;
  if (cardsPrinted + groupsPrinted > 1) {
    const grand = otherTotal
  + Object.keys(railAgg ).reduce((s,k)=> s + (railAgg[k].entries.length  >= 2 ? railAgg[k].total  : 0), 0)
  + Object.keys(opaqueAgg).reduce((s,k)=> s + (opaqueAgg[k].entries.length>= 2 ? opaqueAgg[k].total : 0), 0)
  + Object.keys(sheerAgg).reduce((s,k)=> s + (sheerAgg[k].entries.length >= 2 ? sheerAgg[k].total : 0), 0)
  + (blindsAgg.WOOD.entries.length  >= 2 ? blindsAgg.WOOD.total  : 0)
  + (blindsAgg.KDN.entries.length   >= 2 ? blindsAgg.KDN.total   : 0)
  + (blindsAgg.KACEE.entries.length >= 2 ? blindsAgg.KACEE.total : 0)
  + Object.keys(romanAgg).reduce((s,k)=> s + (romanAgg[k].entries.length >= 2 ? romanAgg[k].total : 0), 0)
  + Object.keys(blindsAgg)
    .filter(k => k.startsWith('ROLLER_'))
    .reduce((s,k)=> s + (blindsAgg[k].entries.length >= 2 ? blindsAgg[k].total : 0), 0)

+ Object.keys(blindsAgg)
    .filter(k => k.startsWith('MOSQ_'))
    .reduce((s,k)=> s + (blindsAgg[k].entries.length >= 2 ? blindsAgg[k].total : 0), 0)
  + (blindsAgg.HONEY && blindsAgg.HONEY.entries.length >= 2 ? blindsAgg.HONEY.total : 0)
    output += `\n\nรวมทั้งหมด ${fmt(grand)} บาท`;
  }

  $('#summaryResult').value = output || 'ยังไม่มีรายการ';
}

/*******************************
 * Duplicate การ์ด
 *******************************/
function duplicateItem(srcId){
  const comboVal    = $(`#combo-${srcId}`)?.value || '';
  const railVal     = $(`#rail-${srcId}`)?.value || null;
  const opaqueVal   = $(`#op-${srcId}`)?.value   || null;
  const sheerVal    = $(`#sh-${srcId}`)?.value   || null;
  const aluModel    = $(`#alu-model-${srcId}`)?.value || null;
  const romanFabric = $(`#roman-fabric-${srcId}`)?.value || null;

  const newId = addItem();
  $(`#combo-${newId}`).value = comboVal;
  hydrateCard(newId);

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

/*******************************
 * COPY SUMMARY
 *******************************/
async function copySummary() {
  const ta = document.getElementById('summaryResult');
  if (!ta) { alert('ไม่พบกล่องสรุปรายการ'); return; }

  const text = (ta.value || '').trim();
  if (!text) { alert('ยังไม่มีรายการให้คัดลอก'); return; }

  try {
    await navigator.clipboard.writeText(text);
  } catch (_) {
    const tmp = document.createElement('textarea');
    tmp.value = text;
    tmp.style.position = 'fixed';
    tmp.style.top = '-1000px';
    document.body.appendChild(tmp);
    tmp.focus();
    tmp.select();
    try { document.execCommand('copy'); } catch {}
    document.body.removeChild(tmp);
  }

  const btn = document.getElementById('copyBtn');
  if (btn) {
    const prev = btn.textContent;
    btn.textContent = 'คัดลอกแล้ว ✓';
    setTimeout(() => (btn.textContent = prev), 1200);
  }
}

/*******************************
 * เริ่มทำงาน
 *******************************/
window.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadPrice();
    const btn = document.getElementById('addItemBtn');
    if (btn) btn.addEventListener('click', addItem);
    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) copyBtn.addEventListener('click', copySummary);
    autoSummarize(true);
  } catch (e) {
    console.error(e);
    alert('โหลดข้อมูลไม่สำเร็จ');
  }
});
