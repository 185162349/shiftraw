/* ShiftRaw 转换器 —— 纯浏览器端文件转换，文件永不上传 */
(() => {
  "use strict";

  const root = document.getElementById("converter");
  if (!root) return;

  const cfg = {
    source: root.dataset.source || "any",
    target: root.dataset.target || "jpg",
  };

  /* ---------- 格式定义 ---------- */
  const RAW_EXTS = new Set([
    "cr2", "cr3", "crw", "nef", "nrw", "arw", "srf", "sr2", "dng",
    "raf", "orf", "ori", "rw2", "raw", "pef", "ptx", "srw", "x3f",
    "3fr", "fff", "iiq", "mrw", "kdc", "dcr", "erf", "mef", "mos", "rwl",
  ]);
  const HEIC_EXTS = new Set(["heic", "heif", "hif"]);
  const RASTER_EXTS = new Set(["jpg", "jpeg", "jpe", "png", "webp", "avif", "gif", "bmp", "tif", "tiff"]);

  const TARGETS = {
    jpg:  { mime: "image/jpeg", ext: "jpg",  label: "JPG",  quality: true,  def: 0.92 },
    png:  { mime: "image/png",  ext: "png",  label: "PNG",  quality: false },
    webp: { mime: "image/webp", ext: "webp", label: "WebP", quality: true,  def: 0.9 },
  };

  const ACCEPT_LIST = [...RAW_EXTS, ...HEIC_EXTS, ...RASTER_EXTS].map((e) => "." + e).join(",");

  /* ---------- DOM ---------- */
  const dropZone = root.querySelector("#dropZone");
  const fileInput = root.querySelector("#fileInput");
  const browseBtn = root.querySelector("#browseBtn");
  const optionsRow = root.querySelector("#optionsRow");
  const fmtSelect = root.querySelector("#fmtSelect");
  const qualityWrap = root.querySelector("#qualityWrap");
  const qualityInput = root.querySelector("#qualityInput");
  const qval = root.querySelector("#qval");
  const downloadAllBtn = root.querySelector("#downloadAllBtn");
  const clearBtn = root.querySelector("#clearBtn");
  const fileList = root.querySelector("#fileList");
  const progressNote = root.querySelector("#progressNote");

  fileInput.setAttribute("accept", ACCEPT_LIST);

  /* ---------- 状态 ---------- */
  const items = []; // {file, status, blob, outName, el, thumbUrl}
  let processing = false;

  /* ---------- 解码器懒加载 ---------- */
  let librawPromise = null;
  function getLibRaw() {
    if (!librawPromise) {
      librawPromise = import("/assets/vendor/libraw/index.js").then((m) => m.default);
    }
    return librawPromise;
  }

  let heicPromise = null;
  function getHeic2Any() {
    if (window.heic2any) return Promise.resolve(window.heic2any);
    if (!heicPromise) {
      heicPromise = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "/assets/vendor/heic2any/heic2any.min.js";
        s.onload = () => (window.heic2any ? resolve(window.heic2any) : reject(new Error("HEIC decoder failed to load")));
        s.onerror = () => { heicPromise = null; reject(new Error("HEIC decoder failed to load")); };
        document.head.appendChild(s);
      });
    }
    return heicPromise;
  }

  /* ---------- 工具函数 ---------- */
  function extOf(name) {
    const i = name.lastIndexOf(".");
    return i === -1 ? "" : name.slice(i + 1).toLowerCase();
  }
  function baseOf(name) {
    const i = name.lastIndexOf(".");
    return i === -1 ? name : name.slice(0, i);
  }
  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }
  function canvasToBlob(canvas, mime, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b && b.type === mime ? resolve(b) : b ? resolve({ blob: b, fallback: true }) : reject(new Error("Encoding failed"))),
        mime,
        quality
      );
    });
  }
  function putToCanvas(width, height, drawFn) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    drawFn(ctx);
    return canvas;
  }

  /* RGB(或灰度)交错数据 → RGBA canvas */
  function rawToCanvas(img) {
    const { width, height, data, colors } = img;
    const rgba = new Uint8ClampedArray(width * height * 4);
    if (colors === 3) {
      for (let i = 0, j = 0, n = width * height; i < n; i++, j += 4) {
        const k = i * 3;
        rgba[j] = data[k];
        rgba[j + 1] = data[k + 1];
        rgba[j + 2] = data[k + 2];
        rgba[j + 3] = 255;
      }
    } else if (colors === 1) {
      for (let i = 0, j = 0, n = width * height; i < n; i++, j += 4) {
        rgba[j] = rgba[j + 1] = rgba[j + 2] = data[i];
        rgba[j + 3] = 255;
      }
    } else if (colors === 4) {
      rgba.set(data.subarray(0, rgba.length));
    } else {
      throw new Error("Unsupported channel count: " + colors);
    }
    const id = new ImageData(rgba, width, height);
    return putToCanvas(width, height, (ctx) => ctx.putImageData(id, 0, 0));
  }

  /* ---------- 单文件转换 ---------- */
  async function convertFile(file, targetKey) {
    const t = TARGETS[targetKey];
    const ext = extOf(file.name);
    const quality = t.quality ? parseFloat(qualityInput.value) : undefined;

    if (HEIC_EXTS.has(ext)) {
      const h2a = await getHeic2Any();
      const opts = { blob: file, toType: t.mime };
      if (t.quality && quality != null) opts.quality = quality;
      let out = await h2a(opts);
      if (Array.isArray(out)) out = out[0]; // 多图 HEIC 取第一张
      return out;
    }

    if (RAW_EXTS.has(ext)) {
      const LibRaw = await getLibRaw();
      const raw = new LibRaw();
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        await raw.open(bytes, {
          useCameraWb: true,   // 优先相机白平衡，无则自动
          useAutoWb: true,
          outputColor: 1,      // sRGB
          userQual: 3,         // 插值质量
        });
        const img = await raw.imageData();
        if (!img || !img.data) throw new Error("This RAW file could not be decoded (unsupported compression).");
        const canvas = rawToCanvas(img);
        const res = await canvasToBlob(canvas, t.mime, quality);
        return res.blob || res;
      } finally {
        raw.dispose();
      }
    }

    if (RASTER_EXTS.has(ext)) {
      let bmp;
      try {
        bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      } catch (e) {
        bmp = await createImageBitmap(file);
      }
      const canvas = putToCanvas(bmp.width, bmp.height, (ctx) => ctx.drawImage(bmp, 0, 0));
      bmp.close();
      const res = await canvasToBlob(canvas, t.mime, quality);
      return res.blob || res;
    }

    throw new Error(`."${ext}" files are not supported yet.`);
  }

  /* ---------- UI 渲染 ---------- */
  function makeCard(item) {
    const el = document.createElement("div");
    el.className = "file-card";
    el.innerHTML = `
      <div class="file-thumb">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.9-3.9a2 2 0 0 0-2.8 0L6 19"/></svg>
      </div>
      <div class="file-meta">
        <div class="file-name"></div>
        <div class="file-info"></div>
      </div>
      <div class="file-status"></div>
      <button class="file-dl" hidden>Download</button>`;
    el.querySelector(".file-name").textContent = item.file.name;
    el.querySelector(".file-info").textContent = fmtSize(item.file.size);
    fileList.appendChild(el);
    return el;
  }

  function setCard(item, patch) {
    const el = item.el;
    if (patch.thumb) {
      el.querySelector(".file-thumb").innerHTML = `<img src="${patch.thumb}" alt="">`;
    }
    if (patch.info !== undefined) el.querySelector(".file-info").innerHTML = patch.info;
    const st = el.querySelector(".file-status");
    if (patch.status !== undefined) {
      st.innerHTML = patch.status;
    }
    const dl = el.querySelector(".file-dl");
    if (patch.dl) {
      dl.hidden = false;
      dl.onclick = () => downloadBlob(item.blob, item.outName);
    }
  }

  const SPINNER = `<span class="spinner"></span>`;
  const CHECK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>`;
  const CROSS = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>`;

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /* ---------- 队列处理 ---------- */
  async function processQueue() {
    if (processing) return;
    processing = true;

    for (;;) {
      const item = items.find((i) => i.status === "queued");
      if (!item) break;
      item.status = "working";
      const targetKey = fmtSelect.value;
      const t = TARGETS[targetKey];

      const doneCount = items.filter((i) => i.status === "done" || i.status === "error").length + 1;
      progressNote.hidden = false;
      progressNote.textContent = `Converting ${doneCount} of ${items.length}…`;

      setCard(item, {
        status: SPINNER + `<span>Converting…</span>`,
        info: `${fmtSize(item.file.size)} → ${t.label}`,
      });

      try {
        const blob = await convertFile(item.file, targetKey);
        item.blob = blob;
        item.outName = baseOf(item.file.name) + "." + t.ext;
        item.status = "done";
        const shrink = blob.size < item.file.size;
        item.thumbUrl = URL.createObjectURL(blob);
        setCard(item, {
          thumb: item.thumbUrl,
          info: `${fmtSize(item.file.size)} → <span class="ok">${fmtSize(blob.size)} ${t.label}</span>${shrink ? " (smaller)" : ""}`,
          status: CHECK + `<span>Done</span>`,
          dl: true,
        });
      } catch (err) {
        item.status = "error";
        setCard(item, {
          info: `<span class="err">${err.message || "Conversion failed"}</span>`,
          status: CROSS + `<span>Failed</span>`,
        });
      }
    }

    processing = false;
    progressNote.hidden = true;
    downloadAllBtn.disabled = !items.some((i) => i.status === "done");
  }

  /* ---------- 事件 ---------- */
  function addFiles(list) {
    let added = false;
    for (const file of list) {
      if (items.length >= 100) break; // 单批上限，防止内存爆掉
      const item = { file, status: "queued" };
      item.el = makeCard(item);
      items.push(item);
      added = true;
    }
    if (added) {
      optionsRow.hidden = false;
      processQueue();
    }
  }

  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
  });
  browseBtn.addEventListener("click", (e) => { e.stopPropagation(); fileInput.click(); });
  fileInput.addEventListener("change", () => {
    addFiles(fileInput.files);
    fileInput.value = "";
  });

  ["dragenter", "dragover"].forEach((ev) =>
    dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.add("dragover"); })
  );
  ["dragleave", "drop"].forEach((ev) =>
    dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.remove("dragover"); })
  );
  dropZone.addEventListener("drop", (e) => {
    if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  });
  // 整页拖放也接住，避免浏览器直接打开文件
  ["dragover", "drop"].forEach((ev) =>
    document.addEventListener(ev, (e) => e.preventDefault())
  );

  function refreshQualityUI() {
    const t = TARGETS[fmtSelect.value];
    qualityWrap.hidden = !t.quality;
    qval.textContent = Math.round(parseFloat(qualityInput.value) * 100) + "%";
  }
  fmtSelect.value = cfg.target;
  fmtSelect.addEventListener("change", refreshQualityUI);
  qualityInput.addEventListener("input", () => { qval.textContent = Math.round(qualityInput.value * 100) + "%"; });
  refreshQualityUI();

  downloadAllBtn.addEventListener("click", async () => {
    const done = items.filter((i) => i.status === "done");
    for (const item of done) {
      downloadBlob(item.blob, item.outName);
      await new Promise((r) => setTimeout(r, 300)); // 间隔触发，避免浏览器拦截多下载
    }
  });

  clearBtn.addEventListener("click", () => {
    items.forEach((i) => { if (i.thumbUrl) URL.revokeObjectURL(i.thumbUrl); });
    items.length = 0;
    fileList.innerHTML = "";
    optionsRow.hidden = true;
    progressNote.hidden = true;
    downloadAllBtn.disabled = true;
  });
})();
