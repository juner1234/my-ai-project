import React, { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

/**
 * 开发辅助：在浏览器里把当前 3D 场景导出为 .glb。
 *
 * 说明（重要）：它只挂在 Remotion Studio 的预览里，用于“看模型”，
 * 不参与渲染输出（不产生任何可见元素，也不影响帧内容）。
 *
 * 用法：在 Remotion Studio 里预览 Bedroom 时：
 *   1) 先用鼠标点一下画布（让预览 iframe 获得焦点）
 *   2) 按键盘 E 键    → 浏览器下载 bedroom.glb
 *   或：打开浏览器控制台执行  __exportBedroomGlb()
 *
 * 然后把 bedroom.glb 拖进任意 glTF 查看器（如 https://gltf-viewer.donmccurdy.com/）即可全方位查看。
 */
export const ExportGlb: React.FC = () => {
  const scene = useThree((s) => s.scene);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (busy) return;
      setBusy(true);
      try {
        const exporter = new GLTFExporter();
        const result = (await exporter.parseAsync(scene, {
          binary: true,
          onlyVisible: true,
        })) as ArrayBuffer;

        const blob = new Blob([result], { type: "model/gltf-binary" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "bedroom.glb";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        // eslint-disable-next-line no-console
        console.log("[ExportGlb] 已导出 bedroom.glb");
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[ExportGlb] 导出失败：", err);
      } finally {
        setBusy(false);
      }
    };

    // 供控制台手动调用
    (window as unknown as { __exportBedroomGlb?: () => Promise<void> }).__exportBedroomGlb = run;

    // 供自动化/无头环境读取：返回 GLB 的 base64（不触发下载）
    (
      window as unknown as {
        __exportBedroomGlbBase64?: () => Promise<string>;
      }
    ).__exportBedroomGlbBase64 = async () => {
      const exporter = new GLTFExporter();
      const buf = (await exporter.parseAsync(scene, {
        binary: true,
        onlyVisible: true,
      })) as ArrayBuffer;
      const bytes = new Uint8Array(buf);
      let bin = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode.apply(
          null,
          Array.from(bytes.subarray(i, i + chunk)) as unknown as number[]
        );
      }
      return btoa(bin);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "e" && !e.metaKey && !e.ctrlKey) {
        void run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scene, busy]);

  return null;
};