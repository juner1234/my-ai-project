/* Opus 5.5 prompt 语料 · 中英对照阅读/编辑工具 */
(() => {
  const $ = (id) => document.getElementById(id);
  const PAGE_SIZE = 40;

  let items = [];
  let overrides = {};
  let shown = PAGE_SIZE;
  const dirty = new Map(); // slug -> {en, zh}

  /* ---------------- 工具 ---------------- */
  const h = (tag, props = {}, children = []) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v !== null && v !== undefined) node.setAttribute(k, v);
    }
    for (const c of [].concat(children)) if (c) node.appendChild(c);
    return node;
  };

  const toast = (msg) => {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 1600);
  };

  const catClass = (c) => (c === "3d" ? "c3d" : c === "motion" ? "motion" : c === "explainer" ? "explainer" : c === "interactive" ? "interactive" : "");

  async function copy(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      toast(`已复制${label ? "：" + label : ""}`);
    } catch {
      const ta = h("textarea", { text });
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      toast(`已复制${label ? "：" + label : ""}`);
    }
  }

  const valueOf = (it, field) => {
    const o = overrides[it.slug] || {};
    if (field === "en") return o.en !== undefined ? o.en : it.prompt ?? "";
    return o.zh ?? "";
  };

  const bilingual = (it) => {
    const en = valueOf(it, "en").trim();
    const zh = valueOf(it, "zh").trim();
    return zh ? `${en}\n\n【中文对照】\n${zh}` : en;
  };

  const asMarkdown = (it) => {
    const en = valueOf(it, "en").trim();
    const zh = valueOf(it, "zh").trim();
    const head = `- 分类：${it.category} · 技术：${(it.techTags || []).join(", ") || "-"} · 作者：@${it.author}`;
    return [`## ${it.slug}`, head, it.postUrl ? `- 原推文：${it.postUrl}` : "", "", "**English**", "", "```text", en, "```", "", "**中文对照**", "", "```text", zh || "（未填写）", "```"].filter((x) => x !== "").join("\n");
  };

  // 套用到 ThreeMotion（Remotion + R3F）的模板
  const asTemplate = (it) => {
    const en = valueOf(it, "en").trim();
    const zh = valueOf(it, "zh").trim();
    return [
      "Act as a world-class motion designer.",
      "",
      "Create a Remotion composition at 30fps, 1920x1080.",
      "",
      "<reference>",
      en,
      "</reference>",
      zh ? `\n<reference_zh>\n${zh}\n</reference_zh>` : "",
      "",
      "<rules>",
      "  - Use React Three Fiber (@react-three/fiber) with @remotion/three's ThreeCanvas.",
      "  - All animation MUST be a pure function of useCurrentFrame() / useVideoConfig().",
      "  - Do NOT use useFrame, three's Clock, or requestAnimationFrame.",
      "  - Export one component; register it in src/Root.tsx as a new <Composition />.",
      "  - Put the 3D scene under src/scenes/, keep the composition entry thin.",
      "  - No text overlays unless asked. No external assets.",
      "</rules>",
    ].join("\n");
  };

  /* ---------------- 保存 ---------------- */
  let saveTimer = null;
  const flush = async () => {
    if (dirty.size === 0) return;
    const payload = Object.fromEntries(dirty);
    dirty.clear();
    try {
      const r = await fetch("/api/overrides", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      updateProgress();
    } catch (e) {
      toast("保存失败：" + e.message);
    }
  };
  const scheduleSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 600);
  };

  /* ---------------- 筛选 ---------------- */
  const filtered = () => {
    const q = $("q").value.trim().toLowerCase();
    const cat = $("category").value;
    const tech = $("tech").value;
    const onlyComplete = $("onlyComplete").checked;
    const onlyUnfilled = $("onlyUnfilled").checked;
    return items.filter((it) => {
      if (onlyComplete && it.partial) return false;
      if (cat && it.category !== cat) return false;
      if (tech && !(it.techTags || []).includes(tech)) return false;
      if (onlyUnfilled && valueOf(it, "zh").trim()) return false;
      if (q) {
        const hay = [it.slug, it.author, it.category, (it.techTags || []).join(" "), valueOf(it, "en")].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  };

  const updateProgress = () => {
    const total = items.length;
    const filled = items.filter((it) => valueOf(it, "zh").trim()).length;
    $("barFill").style.width = total ? `${(filled / total) * 100}%` : "0";
    $("barLabel").textContent = `已填译文 ${filled} / ${total}`;
  };

  /* ---------------- 渲染 ---------------- */
  function card(it, index) {
    const enTa = h("textarea", { class: "en", spellcheck: "false" });
    enTa.value = valueOf(it, "en");
    const zhTa = h("textarea", { class: "zh" });
    zhTa.value = valueOf(it, "zh");

    const markEdited = () => {
      const o = overrides[it.slug] || {};
      const changed = (o.en || "").trim() !== (it.prompt || "").trim() || !!(o.zh || "").trim();
      el.classList.toggle("edited", changed);
    };

    const onEdit = (field) => () => {
      const val = field === "en" ? enTa.value : zhTa.value;
      overrides[it.slug] = Object.assign({}, overrides[it.slug], { [field]: val });
      dirty.set(it.slug, { en: valueOf(it, "en"), zh: valueOf(it, "zh") });
      markEdited();
      scheduleSave();
    };
    enTa.addEventListener("input", onEdit("en"));
    zhTa.addEventListener("input", onEdit("zh"));

    const aiBtn = h("button", {
      text: "AI 翻译成中文",
      onclick: async () => {
        const base = $("aiBase").value.trim().replace(/\/$/, "");
        const model = $("aiModel").value.trim();
        const key = $("aiKey").value.trim();
        if (!base || !model) return toast("先点左侧「AI 翻译设置」填写接口和模型");
        aiBtn.disabled = true;
        aiBtn.textContent = "翻译中…";
        try {
          const res = await fetch(`${base}/chat/completions`, {
            method: "POST",
            headers: { "content-type": "application/json", ...(key ? { authorization: `Bearer ${key}` } : {}) },
            body: JSON.stringify({
              model,
              temperature: 0.2,
              messages: [
                { role: "system", content: "你是专业译者。把用户给的英文 prompt 翻译成简洁准确的中文，保留技术名词与缩略词，只输出译文，不要解释。" },
                { role: "user", content: enTa.value },
              ],
            }),
          });
          const data = await res.json();
          const out = data?.choices?.[0]?.message?.content;
          if (!out) throw new Error(data?.error?.message || "返回为空");
          zhTa.value = out.trim();
          onEdit("zh")();
          toast("已翻译");
        } catch (e) {
          toast("翻译失败：" + e.message);
        } finally {
          aiBtn.disabled = false;
          aiBtn.textContent = "AI 翻译成中文";
        }
      },
    });

    const el = h("div", { class: "card" }, [
      h("div", { class: "meta" }, [
        h("span", { class: "idx", text: String(index + 1).padStart(3, "0") }),
        h("span", { class: `badge ${catClass(it.category)}`, text: it.category }),
        ...(it.techTags || []).slice(0, 4).map((t) => h("span", { class: "badge", text: t })),
        it.partial ? h("span", { class: "badge warn", text: "prompt 不完整" }) : null,
        h("span", { class: "author", text: "@" + it.author }),
        h("span", { class: "spacer" }),
        it.postUrl ? h("a", { href: it.postUrl, target: "_blank", rel: "noreferrer", text: "原推文 ↗" }) : null,
        h("span", { class: "badge", text: "prompts/" + it.slug + ".md" }),
      ]),
      h("div", { class: "cols" }, [
        h("div", { class: "col" }, [h("label", { text: "English（可编辑）" }), enTa]),
        h("div", { class: "col" }, [h("label", { text: "中文对照（可编辑）" }), zhTa]),
      ]),
      h("div", { class: "row" }, [
        h("button", { text: "复制英文", onclick: () => copy(enTa.value, "英文") }),
        h("button", { text: "复制中文", onclick: () => copy(zhTa.value, "中文") }),
        h("button", { text: "复制中英对照", onclick: () => copy(bilingual(it), "中英对照") }),
        h("button", { text: "复制为 Markdown", onclick: () => copy(asMarkdown(it), "Markdown") }),
        h("button", { text: "复制成 ThreeMotion 模板", onclick: () => copy(asTemplate(it), "模板") }),
        aiBtn,
        h("button", {
          text: "重置本条",
          onclick: () => {
            delete overrides[it.slug];
            overrides[it.slug] = { en: "", zh: "" };
            dirty.set(it.slug, { en: "", zh: "" });
            enTa.value = it.prompt ?? "";
            zhTa.value = "";
            markEdited();
            scheduleSave();
            toast("已重置");
          },
        }),
      ]),
    ]);

    markEdited();
    return el;
  }

  function render() {
    const list = filtered();
    const box = $("list");
    box.textContent = "";
    const slice = list.slice(0, shown);
    slice.forEach((it, i) => box.appendChild(card(it, i)));

    $("empty").classList.toggle("hidden", list.length !== 0);
    if (list.length > shown) {
      box.appendChild(
        h("button", {
          text: `加载更多（已显示 ${shown} / ${list.length}）`,
          onclick: () => {
            shown += PAGE_SIZE;
            render();
          },
        }),
      );
    }
    updateProgress();
  }

  /* ---------------- 初始化 ---------------- */
  async function init() {
    const [p, o] = await Promise.all([
      fetch("/api/prompts").then((r) => r.json()),
      fetch("/api/overrides").then((r) => r.json()),
    ]);
    items = p.items || [];
    overrides = o || {};

    $("total").textContent = ` · ${items.length} 条`;
    const cats = [...new Set(items.map((i) => i.category))].sort();
    const techs = [...new Set(items.flatMap((i) => i.techTags || []))].sort();
    cats.forEach((c) => $("category").appendChild(h("option", { value: c, text: c })));
    techs.forEach((t) => $("tech").appendChild(h("option", { value: t, text: t })));

    // AI 设置回填
    $("aiBase").value = localStorage.getItem("opus55.aiBase") || "";
    $("aiModel").value = localStorage.getItem("opus55.aiModel") || "";
    $("aiKey").value = localStorage.getItem("opus55.aiKey") || "";
    $("aiSettings").addEventListener("click", () => $("aiPanel").classList.toggle("hidden"));
    for (const id of ["aiBase", "aiModel", "aiKey"]) {
      $(id).addEventListener("change", () => localStorage.setItem("opus55." + id.slice(2), $(id).value.trim()));
    }

    $("export").addEventListener("click", () => {
      flush().finally(() => {
        window.location.href = "/api/export";
      });
    });

    ["q", "category", "tech", "onlyComplete", "onlyUnfilled"].forEach((id) => {
      $(id).addEventListener("input", () => {
        shown = PAGE_SIZE;
        render();
      });
    });

    // 防丢失：关页面前把待保存内容提交
    window.addEventListener("beforeunload", (e) => {
      if (dirty.size === 0) return;
      flush();
      e.preventDefault();
    });

    render();
  }

  init().catch((e) => {
    document.body.innerHTML = `<pre style="color:#ff6b6b;padding:24px;font-family:monospace">加载失败：${e.message}</pre>`;
  });
})();
