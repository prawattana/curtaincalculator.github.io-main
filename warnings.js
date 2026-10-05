/* ================================================================
   warnings.js — คำเตือนในการ์ด (ไม่แตะสูตรคำนวณใน script.js)
   • รางเลือกแบบ 1 ชั้น แต่ใส่ม่านโปร่งด้วย → เตือนว่ารางแขวนได้ชั้นเดียว (ทึบ+โปร่งต้องใช้ราง 2 ชั้น)
   ================================================================ */
(function () {
  'use strict';

  function check(card) {
    const m = card.id && card.id.match(/^item-(\d+)$/); if (!m) return;
    const id = m[1];
    const rail = document.getElementById('rail-' + id);
    const sheer = document.getElementById('sh-' + id);
    const sheerW = document.getElementById('sw-' + id);   // เตือนเมื่อใส่ความกว้างม่านโปร่งแล้วเท่านั้น (แค่เลือกชนิดผ้ายังไม่เตือน)
    const sec = document.getElementById('sec-curtain-' + id);
    let warn = card.querySelector('.cc-warn-rail');
    const on = !!(rail && sheer && sec && sec.style.display !== 'none'
      && /1\s*ชั้น/.test(rail.value || '') && (sheer.value || '').trim()
      && sheerW && parseFloat(sheerW.value) > 0);
    if (!on) { if (warn) warn.remove(); return }
    if (!warn) {
      warn = document.createElement('li');
      warn.className = 'cc-warn-rail';
      warn.textContent = '⚠️ รางที่เลือกเป็นแบบ 1 ชั้น แต่มีม่านโปร่งด้วย';
      const sheerRow = sheer.closest('li') || sheer.closest('.bullet-row');
      if (sheerRow) sheerRow.insertAdjacentElement('afterend', warn); else sec.appendChild(warn);
    }
  }

  function checkAll() { document.querySelectorAll('#itemsContainer .item-card').forEach(check) }

  let t = null;
  const soon = () => { clearTimeout(t); t = setTimeout(checkAll, 60) };
  document.addEventListener('change', soon, true);
  document.addEventListener('input', soon, true);
  document.addEventListener('DOMContentLoaded', () => {
    const cont = document.getElementById('itemsContainer');
    if (cont) new MutationObserver(soon).observe(cont, { childList: true });
  });

  // ช่องตัวเลข = พิมพ์ได้อย่างเดียว (user ขอ 5ต.ค.69)
  // เดิมกำลังพิมพ์อยู่แล้วเผลอเลื่อนลูกกลิ้งเมาส์ ตัวเลขขยับตาม → ราคาเพี้ยนโดยไม่รู้ตัว
  // เลื่อนลูกกลิ้งตอนอยู่ในช่อง = เลื่อนหน้าตามปกติ (ตัวเลขไม่เปลี่ยน) · ปุ่มลูกศรขึ้น/ลงก็ไม่เพิ่ม/ลดเลข
  document.addEventListener('wheel', e => {
    const el = e.target;
    if (!(el && el.tagName === 'INPUT' && el.type === 'number' && document.activeElement === el)) return;
    // กันเบราว์เซอร์เพิ่ม/ลดเลขแน่นอน แล้วเลื่อนหน้าให้เอง ผู้ใช้ไม่รู้สึกว่าเลื่อนไม่ได้
    e.preventDefault();
    window.scrollBy({ top: e.deltaY, left: e.deltaX });
  }, { capture: true, passive: false });
  document.addEventListener('keydown', e => {
    const el = e.target;
    if (el && el.tagName === 'INPUT' && el.type === 'number' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) e.preventDefault();
  }, true);

  const css = `
  /* ซ่อนปุ่มลูกศรเพิ่ม/ลดในช่องตัวเลข (กรอกเองอย่างเดียว) */
  input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
  input[type=number] { -moz-appearance:textfield; appearance:textfield; }
  .cc-warn-rail { list-style:none; margin:2px 0 10px; padding:10px 14px; border-radius:var(--r-md, 12px);
    background:rgba(255,149,0,0.12); border:1px solid rgba(255,149,0,0.45); color:#B25E00; font-size:13px; line-height:1.6; }
  .dark .cc-warn-rail { color:#FFB340; background:rgba(255,149,0,0.14); }
  /* ปุ่ม แยกกลาง / เดี่ยว / ห่วงโชว์ราง ใต้ช่องความกว้าง — กว้างเท่ากันทุกปุ่ม (เดิมกว้างตามตัวหนังสือ) */
  .width-btn-group { display:flex; flex-direction:column; gap:5px; margin-top:6px; }
  .width-btn-group .width-mode-btn { width:100%; margin-left:0 !important; box-sizing:border-box; }
  @media print { .cc-warn-rail { display:none !important; } }
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
})();
