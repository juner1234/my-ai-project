// === SIGNAL / 信号 — Remotion Composition ===
// 使用 Remotion API (useCurrentFrame) 驱动所有动画
// 五个阶段：信号出现 → 传播 → 干扰 → 失控 → 重构

import { useCurrentFrame } from "remotion";

// === 配色 ===
const BLACK = "#000000";
const WHITE = "#FFFFFF";
const AUX_BLUE = "#6EC5DB";
const AUX_YELLOW = "#FFAB00";

// === Shot 常量 (绝对帧号) ===
const S01_END = 29;   // Shot 01: F0–F29 (30帧)
const S02_END = 89;   // Shot 02: F30–F89 (60帧)
const S03_END = 149;  // Shot 03: F90–F149 (60帧)
const S04_END = 219;  // Shot 04: F150–F219 (70帧)
const S05_END = 254;  // Shot 05: F220–F254 (35帧)
const TOTAL = 255;

// === Shot 01：信号出现 (F0–F29) ===
// 纯黑场 + 极细线条从角落向中心延伸
const Shot01 = () => {
  const f = useCurrentFrame();
  const t = f / S01_END; // 0到1

  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920">
      <circle cx={540} cy={960} r={2} fill={WHITE} opacity={0.3} />
      <line
        x1={0} y1={0}
        x2={540}
        y2={760}
        stroke={WHITE}
        strokeWidth={t * 4} // 直接用 t*4 代码，避免 interpolate 在 JSX 屄属性中的问题
        opacity={t}
      />
      <line
        x1={0} y1={1920}
        x2={540}
        y2={1160}
        stroke={WHITE}
        strokeWidth={t * 4}
        opacity={t}
      />
      <line
        x1={1080} y1={0}
        x2={540 + 100}
        y2={760}
        stroke={WHITE}
        strokeWidth={t * 4}
        opacity={t}
      />
      <line
        x1={1080} y1={1920}
        x2={540 - 100}
        y2={1160}
        stroke={WHITE}
        strokeWidth={t * 4}
        opacity={t}
      />
    </svg>
  );
};

// === Shot 02：信号传播 (F30–F89) ===
// 精密网格、同心圆、参数化波形扩张
const Shot02 = () => {
  const f = useCurrentFrame();
  const fLocal = f - 30;
  const t = fLocal / 59; // 0到1

  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920">
      {/* 5个同心圆 */}
      <g strokeWidth={1} opacity={t > 0.5 ? 0.8 : 0.3}>
        {Array.from({ length: 5 }, (_, i) => (
          <circle
            key={i}
            cx="540"
            cy="960"
            r={108 * (i + 1)}
            stroke={AUX_BLUE}
            fill="BLACK"
          />
        ))}
      </g>
      {/* 网格：每40px */}
      <g stroke={WHITE} strokeWidth={0.5} opacity={0.5}>
        {Array.from({ length: 27 }, (_, i) => (
          <line key={i} x1={i * 40} y1={0} x2={i * 40} y2={1920} />
        ))}
        {Array.from({ length: 48 }, (_, i) => (
          <line key={i} x1={0} y1={i * 40} x2={1080} y2={i * 40} />
        ))}
      </g>
    </svg>
  );
};

// === Shot 03：信号干扰 (F90–F149) ===
// 动态字形、几何碎片、空间分区
// 使用类名动态切换，避免JSX属性中动态字符串
const Shot03 = () => {
  const f = useCurrentFrame();
  const fLocal = f - 90;
  const t = fLocal / 59;

  // 当前象限（0-3），每15帧一个
  const quadrant = ((fLocal % 60) / 15) | 0;

  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920">
      {/* 区分割线 */}
      <g stroke="#333" strokeWidth={1}>
        <line x1={540} y1={0} x2={540} y2={1920} />
        <line x1={0} y1={960} x2={1080} y2={960} />
      </g>
      {/* 四象限条件渲染：每个象限只显示对应图形 */}
      {quadrant === 0 && (
        <g transform="translate(270,480)">
          <path d="M0,0 L10,0 L5,10 Z" fill={WHITE} opacity={0.9} />
        </g>
      )}
      {quadrant === 1 && (
        <g transform="translate(765,480)">
          <polygon points="0,0 10,0 5,10" fill={AUX_YELLOW} opacity={0.9} />
        </g>
      )}
      {quadrant === 2 && (
        <g transform="translate(270,1440)">
          <line x1={-50} y1={0} x2={50} y2={0} stroke={WHITE} strokeWidth={2} />
        </g>
      )}
      {quadrant === 3 && (
        <g transform="translate(765,1440)">
          <circle cx={0} cy={0} r={5} fill={AUX_BLUE} opacity={0.5} />
        </g>
      )}
    </svg>
  );
};

// === Shot 04：信号失控 (F150–F219) ===
// 多层结构交织、快速切镜、视觉密度高潮
const Shot04 = () => {
  const f = useCurrentFrame();
  const fLocal = f - 150;
  const t = fLocal / 69;

  // 同心圆旋转：数值而非字符串transform
  const outerRot = t * 720; // 0-720度
  const innerRot = t * -540; // -540到0度
  const fragments = (1 - t) * 1; // 1→0
  const twist = t * 40 - 20; // -20到20
  const density = 0.3 + t * 0.7; // 0.3→1

  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920">
      {/* 外届同心圆 - SVG原生transform：平移到画面中心后旋转（绕局部0,0，确定性正确） */}
      <g transform={"translate(540,960) rotate(" + outerRot + ")"}>
        <circle cx={0} cy={0} r={200} stroke={WHITE} strokeWidth={2} fill={BLACK} opacity={density} />
        <circle cx={0} cy={0} r={160} stroke={AUX_BLUE} strokeWidth={1.5} fill={BLACK} opacity={density} />
      </g>

      {/* 内届同心圆 */}
      <g transform={"translate(540,960) rotate(" + innerRot + ")"}>
        <circle cx={0} cy={0} r={80} stroke={AUX_YELLOW} strokeWidth={1.5} fill={BLACK} opacity={density} />
        <circle cx={0} cy={0} r={40} stroke={WHITE} strokeWidth={1} fill={BLACK} opacity={density} />
      </g>

      {/* 几何碎片聚合 - 位于画面中心 */}
      <g transform="translate(540,960)" opacity={fragments}>
        {Array.from({ length: 4 }, (_, i) => (
          <polygon
            key={i}
            points="0,0 10,0 5,10"
            fill={WHITE}
            opacity={fragments}
          />
        ))}
      </g>

      {/* 中心SIGNAL字形 - 居中并应用已有twist变量 */}
      <g transform={"translate(540,960) rotate(" + twist + ")"}>
        <text
          x={0}
          y={0}
          fill={WHITE}
          fontFamily="Inter, Helvetica Neue, sans-serif"
          fontSize={80}
          fontWeight="bold"
          textAnchor="middle"
        >
          SIGNAL
        </text>
      </g>
    </svg>
  );
};

// === Shot 05：信号重构 (F220–F254) ===
// 所有元素收束，最终形成SIGNAL字标
const Shot05 = () => {
  const f = useCurrentFrame();
  const fLocal = f - 220;
  const t = fLocal / 34; // 0到1

  // 收缩进度 1→0
  const shrink = (1 - t);
  const radius = shrink * 540;

  // 青蓝线条从扩散→聚合
  const blueProgress = 1 - t; // 1→0

  // 信号字形缩放
  const signalScale = 1.3 - t * 0.3; // 1.3→1
  const signalOpacity = 0.3 + t * 0.7; // 0.3→1

  // 全局透明度
  const globalOpac = 1 - t * 0.9; // 1→0.1

  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920">
      {/* 黑底 */}
      <rect width={1080} height={1920} fill={BLACK} opacity={1} />

      {/* 收缩的同心圆 */}
      <g opacity={globalOpac}>
        <circle cx={540} cy={960} r={radius * 0.9} stroke={WHITE} strokeWidth={1} fill={BLACK} />
        <circle cx={540} cy={960} r={radius * 0.6} stroke={AUX_BLUE} strokeWidth={0.8} fill={BLACK} />
        <circle cx={540} cy={960} r={radius * 0.3} stroke={WHITE} strokeWidth={0.5} fill={BLACK} />
      </g>

      {/* 青蓝线条聚合 */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * Math.PI * 2) / 12;
        // 使用 style.prop而非直接属性
        const x2 = 540 + Math.cos(angle) * blueProgress * radius * 0.8;
        const y2 = 960 + Math.sin(angle) * blueProgress * radius * 0.8;
        return (
          <line
            key={i}
            x1={540 + (radius * 0.3) * Math.cos(angle)}
            y1={960 + (radius * 0.3) * Math.sin(angle)}
            x2={x2}
            y2={y2}
            style={{ stroke: AUX_BLUE, strokeWidth: 1 + blueProgress * 0.5 }}
          />
        );
      })}
      {/* SIGNAL 字标 - 居中并应用已有缩放/透明度变量 */}
      <g transform={"translate(540,960) scale(" + signalScale + ")"} opacity={signalOpacity}>
        <text
          x={0}
          y={0}
          fill={AUX_BLUE}
          fontFamily="Inter, Helvetica Neue, sans-serif"
          fontSize={100}
          fontWeight="bold"
          textAnchor="middle"
        >
          SIGNAL
        </text>
      </g>
    </svg>
  );
};

// === 主Composition：Remotion composition入口 ===
// Remotion会从组件中提取 durationInFrames, fps, width, height
// 这些属性通过 package.json 或默认配置设置
// 子组件Shot01–Shot05将根据 useCurrentFrame() 的绝对帧号进行路由
export const SignalComposition = (): JSX.Element => {
  const f = useCurrentFrame();
  if (f <= S01_END) return <Shot01 />;
  if (f <= S02_END) return <Shot02 />;
  if (f <= S03_END) return <Shot03 />;
  if (f <= S04_END) return <Shot04 />;
  return <Shot05 />;
};