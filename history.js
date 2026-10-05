/* ================================================================
   history.js — ประวัติการประเมิน (บันทึก / เปิดกลับมาแก้ / ลบ)
   ลูกค้าขอแก้หลังส่งราคาไปแล้ว → เปิดใบเดิมขึ้นมาแก้ต่อได้ ไม่ต้องกรอกใหม่ทั้งหมด

   เก็บในเครื่อง (localStorage 'cc_history') — แต่ละเครื่อง/เบราว์เซอร์มีประวัติของตัวเอง
   ‼️ ไม่แตะสูตรคำนวณใน script.js เลย: บันทึก = จดค่าทุกช่องในแต่ละการ์ด (select/input/checkbox)
      เปิดกลับ = สร้างการ์ดใหม่ด้วย addItem() แล้วเติมค่ากลับทีละรอบ (select ก่อน เพราะตัวเลือกช่องถัดไปขึ้นกับช่องก่อนหน้า)
   ================================================================ */
(function () {
  'use strict';

  const KEY = 'cc_history';
  const MAX = 300;                 // เก็บล่าสุดไม่เกินเท่านี้ใบ กันพื้นที่เต็ม
  let currentId = null;            // ใบที่เปิดอยู่ (บันทึกซ้ำ = อัปเดตใบเดิม)

  const $ = (s, r) => (r || document).querySelector(s);
  // ปิดป๊อปอัปเมื่อคลิกพื้นหลัง — ต้องกดลงและปล่อยบนพื้นหลังทั้งคู่
  // (กดค้างในช่องชื่อแล้วลากออกไปปล่อยนอกกล่อง เบราว์เซอร์นับเป็นคลิกพื้นหลัง → ป๊อปอัปเคยเด้งปิด)
  function onBackdrop(back, fn) {
    let downOnBack = false;
    back.addEventListener('pointerdown', e => { downOnBack = e.target === back });
    back.addEventListener('click', e => { if (e.target === back && downOnBack) fn(); downOnBack = false });
  }
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch (e) { return [] } };
  const store = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))); return true } catch (e) { uiAlert('บันทึกไม่สำเร็จ — พื้นที่ในเครื่องเต็ม ลองลบประวัติเก่าออกบ้าง'); return false } };
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmtDate = (t) => new Date(t).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  /* ── จดค่าการ์ดทั้งหมด ── */
  function snapshot() {
    const cards = [];
    document.querySelectorAll('#itemsContainer .item-card').forEach(card => {
      const m = card.id.match(/^item-(\d+)$/); if (!m) return;
      const id = m[1];
      const strip = (fid) => fid.replace(new RegExp('-' + id + '$'), '');
      const fields = [];
      card.querySelectorAll('select, input, textarea').forEach(el => {
        if (!el.id || !el.id.endsWith('-' + id)) return;      // ช่องที่ไม่มี id ของการ์ด = ของตกแต่ง ไม่ต้องจด
        if (el.id === 'combo-' + id) return;
        if (el.type === 'checkbox' || el.type === 'radio') fields.push({ k: strip(el.id), c: el.checked });
        else fields.push({ k: strip(el.id), v: el.value, s: el.tagName === 'SELECT' ? 1 : 0 });
      });
      // ปุ่ม "ห่วงโชว์ราง" เป็นปุ่มเปิด/ปิด ไม่ใช่ช่องกรอก → จดสถานะจาก items ของ script.js
      const st = (typeof items !== 'undefined' && items.get(Number(id))) || {};
      cards.push({ combo: ($('#combo-' + id) || {}).value || '', fields, ring: { o: !!st.hookRingOpaque, s: !!st.hookRingSheer } });
    });
    return cards;
  }

  function summaryText() { return (($('#summaryResult') || {}).value || '').trim() }
  // ยอดรวมของใบ: "รวมทั้งหมด X บาท" (หลายรายการ) · มีรายการเดียวใช้ "รวม X บาท" ตัวสุดท้าย
  function totalOf(text) {
    const m = text.match(/รวมทั้งหมด\s*([\d,.]+)\s*บาท/); if (m) return m[1];
    const all = [...text.matchAll(/รวม\s*([\d,.]+)\s*บาท/g)]; return all.length ? all[all.length - 1][1] : '';
  }

  /* ── ล้างการ์ดทั้งหมด (แบบเดียวกับปุ่ม × ในการ์ด) ── */
  function clearAll() {
    document.querySelectorAll('#itemsContainer .item-card').forEach(card => {
      const m = card.id.match(/^item-(\d+)$/);
      if (m && typeof items !== 'undefined') items.delete(Number(m[1]));
      card.remove();
    });
  }

  /* ── เติมค่ากลับ ── */
  function fire(el, ...types) { types.forEach(t => el.dispatchEvent(new Event(t, { bubbles: true }))) }
  async function restore(cards) {
    clearAll();
    const made = [];   // [id การ์ดใหม่, ข้อมูลที่บันทึก]
    for (const c of cards) {
      const id = addItem();
      const combo = $('#combo-' + id);
      combo.value = c.combo;
      hydrateCard(id);
      fire(combo, 'change');
      await wait(30);
      const get = (k) => document.getElementById(k + '-' + id);
      // select ก่อน 3 รอบ — ตัวเลือกของบางช่องเพิ่งโผล่หลังเลือกช่องก่อนหน้า
      for (let pass = 0; pass < 3; pass++) {
        for (const f of c.fields) {
          if (!f.s) continue;
          const el = get(f.k); if (!el || el.value === f.v) continue;
          if ([...el.options].some(o => o.value === f.v)) { el.value = f.v; fire(el, 'change') }
        }
        await wait(30);
      }
      for (const f of c.fields) {
        if (f.s) continue;
        const el = get(f.k); if (!el) continue;
        if ('c' in f) { if (el.checked !== f.c) { el.checked = f.c; fire(el, 'change', 'input') } }
        else if (el.value !== f.v) { el.value = f.v; fire(el, 'input', 'change') }
      }
      made.push([id, c]);
      await wait(30);
    }
    // ห่วงโชว์ราง: ปุ่มถูกสร้างตามมาหลังเลือกผ้า → รอให้ครบทุกการ์ดก่อน แล้วค่อยกดให้ตรงกับตอนบันทึก
    await wait(150);
    for (const [id, c] of made) {
      if (!c.ring) continue;
      for (const [k, base] of [['o', 'ow'], ['s', 'sw']]) {
        const st = items.get(id) || {};
        const on = k === 'o' ? !!st.hookRingOpaque : !!st.hookRingSheer;
        if (!!c.ring[k] === on) continue;
        const inp = document.getElementById(base + '-' + id);
        const btn = inp && inp.parentElement.querySelector('.width-btn-group .hook-btn');
        if (btn) btn.click();
      }
    }
    if (typeof autoSummarize === 'function') autoSummarize(true);
  }

  /* ── บันทึก ── */
  function save(name, asNew) {
    const cards = snapshot();
    if (!cards.length) return null;
    const text = summaryText();
    const list = load();
    const now = Date.now();
    let rec = !asNew && currentId ? list.find(r => r.id === currentId) : null;
    if (rec) {
      Object.assign(rec, { name, cards, summary: text, total: totalOf(text), updatedAt: now });
      list.splice(list.indexOf(rec), 1); list.unshift(rec);           // ใบที่แก้ล่าสุดขึ้นบนสุด
    } else {
      rec = { id: 'q' + now.toString(36), name, cards, summary: text, total: totalOf(text), createdAt: now, updatedAt: now };
      list.unshift(rec);
    }
    if (!store(list)) return null;
    currentId = rec.id;
    return rec;
  }

  function flash(btn, msg) { const p = btn.textContent; btn.textContent = msg; setTimeout(() => (btn.textContent = p), 1300) }

  /* ── กล่องถาม/แจ้งในเว็บ ‼️ ห้ามใช้ confirm()/alert() ของเบราว์เซอร์
        เคยมีแอดมินติ๊ก "ไม่ให้หน้านี้แสดงกล่องอีก" แล้วกดลบไม่ได้ (confirm คืน false ทันทีตลอด) ── */
  function uiDialog(message, { ok = 'ตกลง', cancel = null, danger = false } = {}) {
    return new Promise(resolve => {
      const back = document.createElement('div');
      back.className = 'cch-back cch-top';
      back.innerHTML = `
        <div class="cch-panel cch-ask" role="dialog">
          <div class="cch-msg"></div>
          <div class="cch-btns">
            ${cancel ? '<button type="button" class="cch-ghost cch-cancel"></button>' : ''}
            <button type="button" class="cch-ok${danger ? ' cch-danger' : ''}"></button>
          </div>
        </div>`;
      $('.cch-msg', back).textContent = message;
      $('.cch-ok', back).textContent = ok;
      if (cancel) $('.cch-cancel', back).textContent = cancel;
      document.body.appendChild(back);
      const done = (v) => { back.remove(); document.removeEventListener('keydown', key, true); resolve(v) };
      const key = (e) => { if (e.key === 'Escape') { e.preventDefault(); done(false) } else if (e.key === 'Enter') { e.preventDefault(); done(true) } };
      document.addEventListener('keydown', key, true);
      onBackdrop(back, () => done(false));
      $('.cch-ok', back).onclick = () => done(true);
      if (cancel) $('.cch-cancel', back).onclick = () => done(false);
      setTimeout(() => $('.cch-ok', back).focus(), 30);
    });
  }
  const uiAlert = (m) => uiDialog(m);
  const uiConfirm = (m, opt) => uiDialog(m, { cancel: 'ยกเลิก', ...opt });
  // alert() ใน script.js (คัดลอก/โหลดข้อมูลไม่สำเร็จ) ให้ขึ้นเป็นกล่องในเว็บด้วย
  window.alert = (m) => { uiAlert(String(m ?? '')) };

  /* ── หน้าต่างประวัติ ── */
  function openList() {
    const back = document.createElement('div');
    back.className = 'cch-back';
    back.innerHTML = `
      <div class="cch-panel" role="dialog" aria-label="ประวัติการประเมิน">
        <div class="cch-head">
          <span>ประวัติการประเมิน</span>
          <button type="button" class="cch-x" aria-label="ปิด">✕</button>
        </div>
        <input class="cch-search" placeholder="ค้นหาชื่อลูกค้า / รายการ / ยอด" />
        <div class="cch-list"></div>
      </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    onBackdrop(back, close);
    $('.cch-x', back).onclick = close;
    const listEl = $('.cch-list', back);
    const draw = () => {
      const q = $('.cch-search', back).value.trim().toLowerCase();
      const all = load();
      const rows = all.filter(r => !q || (r.name + ' ' + r.summary + ' ' + r.total).toLowerCase().includes(q));
      if (!rows.length) { listEl.innerHTML = `<div class="cch-empty">${all.length ? 'ไม่เจอที่ค้นหา' : 'ยังไม่มีประวัติ — ประเมินเสร็จแล้วกด "บันทึก" จะขึ้นที่นี่'}</div>`; return }
      listEl.innerHTML = rows.map(r => {
        const first = (r.summary || '').split('\n').find(l => l.trim()) || '';
        return `<div class="cch-row${r.id === currentId ? ' on' : ''}" data-id="${r.id}">
          <div class="cch-main">
            <div class="cch-name">${esc(r.name || 'ไม่ระบุชื่อ')}${r.id === currentId ? ' <small>(เปิดอยู่)</small>' : ''}</div>
            <div class="cch-sub">${esc(fmtDate(r.updatedAt))} · ${r.cards.length} รายการ${r.total ? ' · ' + esc(r.total) + ' บาท' : ''}</div>
            <div class="cch-first">${esc(first.slice(0, 80))}</div>
          </div>
          <div class="cch-acts">
            <button type="button" class="cch-open">เปิดแก้</button>
            <button type="button" class="cch-del" title="ลบ">ลบ</button>
          </div>
        </div>`;
      }).join('');
    };
    $('.cch-search', back).addEventListener('input', draw);
    listEl.addEventListener('click', async e => {
      const row = e.target.closest('.cch-row'); if (!row) return;
      const rec = load().find(r => r.id === row.dataset.id); if (!rec) return;
      if (e.target.closest('.cch-del')) {
        if (!(await uiConfirm(`ลบประวัติ "${rec.name || 'ไม่ระบุชื่อ'}" ?`, { ok: 'ลบ', danger: true }))) return;
        store(load().filter(r => r.id !== rec.id));
        if (currentId === rec.id) currentId = null;
        draw(); return;
      }
      if (e.target.closest('.cch-open')) {
        if (snapshot().length && currentId !== rec.id && !(await uiConfirm('เปิดใบนี้แทนรายการที่กรอกอยู่ตอนนี้?', { ok: 'เปิด' }))) return;
        close();
        currentId = rec.id;
        await restore(rec.cards);
        await wait(250);
        // เช็กว่าเติมกลับครบ — ราคารวมต้องตรงกับตอนบันทึก (ราคาในไฟล์ราคาเปลี่ยน = รวมใหม่ต่างได้ เป็นเรื่องปกติ)
        const nowTotal = totalOf(summaryText());
        if (rec.total && nowTotal && nowTotal !== rec.total) {
          uiAlert(`เปิดใบเดิมแล้ว แต่ยอดรวมตอนนี้ ${nowTotal} บาท ไม่เท่าตอนบันทึก (${rec.total} บาท)\nอาจเพราะราคาสินค้าเปลี่ยน หรือมีช่องที่เติมกลับไม่ครบ — ตรวจรายการอีกทีก่อนส่งลูกค้า`);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
    draw();
    $('.cch-search', back).focus();
  }

  /* ── popup ใส่ชื่อลูกค้าตอนกดบันทึก ── */
  function askName(initial, onOk) {
    const back = document.createElement('div');
    back.className = 'cch-back';
    back.innerHTML = `
      <div class="cch-panel cch-ask" role="dialog" aria-label="บันทึกการประเมิน">
        <div class="cch-head"><span>บันทึกการประเมิน</span><button type="button" class="cch-x" aria-label="ปิด">✕</button></div>
        <label class="cch-lbl">ชื่อลูกค้า</label>
        <input class="cch-search cch-name-in" maxlength="80" />
        <div class="cch-btns">
          <button type="button" class="cch-ghost cch-cancel">ยกเลิก</button>
          <button type="button" class="cch-ok">ตกลง</button>
        </div>
      </div>`;
    document.body.appendChild(back);
    const inp = $('.cch-name-in', back);
    inp.value = initial || '';
    const close = () => back.remove();
    const ok = () => {
      const name = inp.value.trim();
      if (!name) { inp.focus(); inp.classList.add('cch-bad'); return }
      close(); onOk(name);
    };
    onBackdrop(back, close);
    $('.cch-x', back).onclick = close;
    $('.cch-cancel', back).onclick = close;
    $('.cch-ok', back).onclick = ok;
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); if (e.key === 'Escape') close() });
    inp.addEventListener('input', () => inp.classList.remove('cch-bad'));
    setTimeout(() => { inp.focus(); inp.select() }, 30);
  }

  /* ── วางปุ่ม ── */
  function mount() {
    const footer = $('.summary-footer');
    const body = $('.summary-body');
    if (!footer || !body) return;

    const saveBtn = document.createElement('button');
    saveBtn.id = 'ccHistSave'; saveBtn.type = 'button'; saveBtn.textContent = 'บันทึก';
    saveBtn.onclick = () => {
      if (!snapshot().length) { uiAlert('ยังไม่มีรายการให้บันทึก'); return }
      const rec = currentId && load().find(r => r.id === currentId);
      // เปิดใบเดิมมาแก้ → ชื่อเดิมใส่ไว้ให้ · กดตกลงด้วยชื่อเดิม = อัปเดตใบเดิม · เปลี่ยนชื่อ = เก็บเป็นใบใหม่ (ใบเดิมยังอยู่)
      askName(rec ? rec.name : '', (name) => { if (save(name, !rec || name !== rec.name)) flash(saveBtn, 'บันทึกแล้ว ✓') });
    };
    const listBtn = document.createElement('button');
    listBtn.id = 'ccHistOpen'; listBtn.type = 'button'; listBtn.className = 'cch-ghost'; listBtn.textContent = 'ประวัติ';
    listBtn.onclick = openList;
    footer.append(saveBtn, listBtn);

    // ลบการ์ดจนหมด = เริ่มใบใหม่ (กดบันทึกครั้งถัดไปจะไม่ไปทับใบที่เคยเปิด)
    const cont = $('#itemsContainer');
    if (cont) new MutationObserver(() => { if (!cont.querySelector('.item-card')) currentId = null }).observe(cont, { childList: true });
  }

  /* ── สไตล์ (ใช้ตัวแปรสีของ styles.css) ── */
  const css = `
  .cch-name-in { width:100%; box-sizing:border-box; border:1px solid var(--input-border); border-radius:var(--r-md); padding:10px 14px;
    background:var(--input-bg); color:var(--ink); font:inherit; font-size:14px; outline:none; box-shadow:var(--input-shadow); }
  .cch-name-in:focus { border-color:var(--blue); box-shadow:0 0 0 3px var(--blue-ring); }
  #ccHistSave, #ccHistOpen { display:inline-flex; align-items:center; gap:7px; padding:10px 22px; border-radius:var(--r-md); font-size:13px; }
  .cch-ghost { background:rgba(142,142,147,0.10) !important; color:var(--ink) !important; border:1px solid var(--g2) !important; box-shadow:none !important; }
  .cch-back { position:fixed; inset:0; z-index:9998; background:rgba(0,0,0,0.32); -webkit-backdrop-filter:blur(4px); backdrop-filter:blur(4px);
    display:flex; align-items:center; justify-content:center; padding:20px; }
  .cch-panel { width:100%; max-width:560px; max-height:82vh; display:flex; flex-direction:column; background:var(--glass-bg, #fff);
    -webkit-backdrop-filter:var(--blur); backdrop-filter:var(--blur); border:1px solid var(--glass-border); border-radius:var(--r-xl);
    box-shadow:0 24px 60px rgba(0,0,0,0.22); padding:18px; color:var(--ink); }
  .dark .cch-panel { background:rgba(44,44,46,0.92); }
  .cch-head { display:flex; justify-content:space-between; align-items:center; font-size:16px; font-weight:700; margin-bottom:12px; }
  .cch-x { width:32px; height:32px; padding:0 !important; border-radius:999px; background:rgba(142,142,147,0.14) !important; color:var(--ink) !important; box-shadow:none !important; }
  .cch-search { border:1px solid var(--input-border); border-radius:var(--r-md); padding:10px 14px; background:var(--input-bg); color:var(--ink);
    font:inherit; font-size:14px; outline:none; margin-bottom:10px; }
  .cch-list { overflow-y:auto; display:flex; flex-direction:column; gap:8px; }
  .cch-row { display:flex; gap:10px; align-items:center; padding:12px 14px; border:1px solid var(--sep); border-radius:var(--r-lg); background:var(--input-bg); }
  .cch-row.on { border-color:var(--blue); box-shadow:0 0 0 2px var(--blue-ring); }
  .cch-main { flex:1; min-width:0; }
  .cch-name { font-weight:700; font-size:14px; }
  .cch-name small { font-weight:500; color:var(--blue); }
  .cch-sub { font-size:12px; color:var(--g3); margin-top:2px; }
  .cch-first { font-size:12px; color:var(--ink-3); margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .cch-acts { display:flex; flex-direction:column; gap:6px; flex-shrink:0; }
  .cch-acts button { padding:7px 14px !important; font-size:12px; border-radius:var(--r-sm); }
  .cch-del { background:rgba(255,59,48,0.10) !important; color:#FF3B30 !important; box-shadow:none !important; }
  .cch-ask { max-width:400px; }
  .cch-top { z-index:10000; }
  .cch-msg { font-size:14.5px; line-height:1.7; white-space:pre-line; margin:2px 0 14px; }
  .cch-danger { background:#FF3B30 !important; color:#fff !important; }
  .cch-lbl { font-size:13px; color:var(--g3); margin-bottom:6px; }
  .cch-name-in.cch-bad { border-color:#FF3B30 !important; box-shadow:0 0 0 3px rgba(255,59,48,0.18) !important; }
  .cch-btns { display:flex; gap:8px; justify-content:flex-end; margin-top:6px; }
  .cch-btns button { padding:10px 22px; border-radius:var(--r-md); font-size:13px; }
  .cch-empty { text-align:center; color:var(--g3); font-size:13px; padding:30px 0; }
  @media (max-width:600px) { .summary-footer { flex-wrap:wrap; } #ccHistSave, #ccHistOpen { flex:1; justify-content:center; } }
  @media print { #ccHistSave, #ccHistOpen { display:none !important; } }
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
