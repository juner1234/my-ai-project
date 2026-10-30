import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";

/**
 * 字体加载（独立工具）
 * 加载 ZCOOL KuaiLe（OFL，免费商用）用于字幕/手写标签。
 * 用 delayRender/continueRender 保证渲染确定性与 Studio 预览一致。
 * 若将来更换字体，只改本文件即可。
 */
const FONT_FAMILY = "ZCOOL KuaiLe";

let injected = false;

export const useEp01Font = (): void => {
  const [handle] = useState(() => delayRender("Loading EP01 subtitle font"));
  useEffect(() => {
    if (!injected) {
      const style = document.createElement("style");
      style.textContent = `@font-face{font-family:'${FONT_FAMILY}';src:url('${staticFile(
        "fonts/ZCOOLKuaiLe-Regular.ttf",
      )}') format('truetype');font-display:block;}`;
      document.head.appendChild(style);
      injected = true;
    }
    const done = () => continueRender(handle);
    Promise.race([
      document.fonts.load(`54px '${FONT_FAMILY}'`, "暖暖"),
      new Promise((r) => setTimeout(r, 8000)),
    ])
      .then(done)
      .catch(done);
  }, [handle]);
};
