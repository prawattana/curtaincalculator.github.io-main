/* แถบ "มีอัปเดตใหม่" (26ต.ค.69) — แบบเดียวกับ Donna ERP แต่หน้าตาตามเว็บคำนวณ (กระจกฝ้า + โหมดมืด)
   ปัญหา: แอดมินเปิดหน้าค้างไว้หลายวัน ราคา/สูตรที่แก้แล้วไม่ขึ้นจนกว่าจะรีเฟรช
   วิธีทำงาน: ตอนเปิดหน้าจำ "ลายนิ้วมือ" ของไฟล์หลักไว้ แล้วโหลดเทียบใหม่ทุก 5 นาที + ทุกครั้งที่สลับกลับมาที่แท็บ
   ไฟล์ไหนเปลี่ยน (มี push ใหม่) → ขึ้นแถบให้กดอัปเดต · ไม่ต้องเปลี่ยนเลขเวอร์ชันเองตอน push
   ดูหน้าตาแถบโดยไม่ต้องรอ push: เปิดหน้าด้วย ?demoUpdate=1 */
(function () {
  const FILES = ['Index.html', 'script.js', 'styles.css', 'priceData.json', 'blindsData.json', 'kaceeModels.json',
                 'history.js', 'warnings.js', 'custom-select.js', 'update-check.js'];
  const CHECK_MS = 5 * 60 * 1000;

  // ลายนิ้วมือ = ETag/Last-Modified ของทุกไฟล์ (ขอแค่หัวไฟล์ HEAD ไม่โหลดเนื้อ ~360KB ทุก 5 นาที เปลืองเน็ตมือถือ)
  // เซิร์ฟเวอร์ไม่ส่งหัวพวกนี้ = ค่อยโหลดเนื้อไฟล์มา hash แทน · ไฟล์ไหนโหลดไม่ได้ = ข้ามรอบนี้ ไม่เตือนมั่ว
  // local=true → อ่านจาก cache ของเบราว์เซอร์ (= ไฟล์ที่หน้านี้น่าจะใช้อยู่) · false → ถามเซิร์ฟเวอร์ตรงๆ
  async function stamp(f, local) {
    const r = await fetch(f, local ? { cache: 'force-cache' } : { method: 'HEAD', cache: 'no-store' });
    if (!r.ok) throw 0;
    const tag = r.headers.get('etag') || r.headers.get('last-modified');
    if (tag) return tag.replace(/^W\//, '');
    const g = local ? r : await fetch(f, { cache: 'no-store' }); if (!g.ok) throw 0;
    return g.text();
  }
  async function fingerprint(local) {
    try {
      const texts = await Promise.all(FILES.map(f => stamp(f, local)));
      let h = 0;
      for (const ch of texts.join('\u0000')) h = (h * 31 + ch.charCodeAt(0)) | 0;
      return String(h);
    } catch { return null; }   // เน็ตหลุด/ออฟไลน์
  }

  function css() {
    const s = document.createElement('style');
    s.textContent = `
      #ccUpdate { position: fixed; z-index: 9999; left: 50%; top: calc(14px + env(safe-area-inset-top));
        transform: translate(-50%, -140%); transition: transform .35s cubic-bezier(.2,.9,.3,1.2);
        display: flex; align-items: center; gap: 12px; padding: 10px 10px 10px 18px; border-radius: 999px;
        width: max-content; max-width: calc(100vw - 28px);
        background: var(--glass-bg, rgba(255,255,255,.72)); border: 1px solid var(--glass-border, rgba(255,255,255,.95));
        box-shadow: var(--glass-shadow, 0 8px 32px rgba(0,0,0,.12)), 0 10px 30px rgba(0,0,0,.12);
        -webkit-backdrop-filter: var(--blur, blur(32px) saturate(200%)); backdrop-filter: var(--blur, blur(32px) saturate(200%));
        color: var(--ink, #1C1C1E); font-size: 14px; }
      #ccUpdate.on { transform: translate(-50%, 0); }
      #ccUpdate .msg b { font-weight: 600; } #ccUpdate .msg span { color: var(--ink-3, #8E8E93); }
      #ccUpdate button { border: 0; border-radius: 999px; padding: 8px 18px; font: inherit; font-weight: 600;
        background: var(--ink, #1C1C1E); color: #fff; cursor: pointer; white-space: nowrap; }
      html.dark #ccUpdate button { background: #fff; color: #1C1C1E; }
      #ccUpdate button:disabled { opacity: .55; cursor: default; }
      @media (max-width: 520px) { #ccUpdate .msg span { display: none; } }
      @media print { #ccUpdate { display: none !important; } }`;
    document.head.appendChild(s);
  }

  let bar = null;
  function show() {
    if (bar) return;
    css();
    bar = document.createElement('div');
    bar.id = 'ccUpdate';
    bar.setAttribute('role', 'status');
    bar.innerHTML = '<span class="msg"><b>มีอัปเดตใหม่</b> <span>— กดอัปเดตเพื่อเปลี่ยนเป็นเวอร์ชันล่าสุด</span></span><button type="button">อัปเดต</button>';
    document.body.appendChild(bar);
    requestAnimationFrame(() => requestAnimationFrame(() => bar.classList.add('on')));
    bar.querySelector('button').addEventListener('click', async (e) => {
      const b = e.currentTarget; b.disabled = true; b.textContent = 'กำลังอัปเดต…';
      // ดึงไฟล์ใหม่ทับของเก่าใน cache ของเบราว์เซอร์ก่อน แล้วค่อยโหลดหน้าใหม่ (ประวัติ/ค่าที่บันทึกไว้ใน localStorage ไม่หาย)
      try { await Promise.all(FILES.map(f => fetch(f, { cache: 'reload' }))); } catch {}
      location.reload();
    });
  }

  if (/[?&]demoUpdate=1/.test(location.search)) { addEventListener('load', () => setTimeout(show, 600)); return; }

  // 26ต.ค.69 user: แอดมินบางคนยังใช้เวอร์ชันเก่า → ตอนเปิดหน้า เทียบไฟล์ที่เครื่องมีใน cache กับบนเซิร์ฟเวอร์ทันที
  // (เปิดมาแล้วได้ของเก่าจาก cache ก็ขึ้นแถบเลย ไม่ต้องรอมี push รอบถัดไป)
  let current = null;
  async function check() {
    if (bar) return;
    if (current === null) { current = await fingerprint(true); if (!current) return; }
    const v = await fingerprint(false);
    if (v && v !== current) show();
  }
  check();
  setInterval(check, CHECK_MS);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
})();
