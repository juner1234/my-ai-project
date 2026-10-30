import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { PALETTE, PENCIL, STROKE } from "./theme";
import { PaperBackground, PaperGrain } from "./PaperBackground";
import { Wardrobe } from "./Wardrobe";
import { Dress } from "./Dress";
import { Bow } from "./Bow";
import {
  StickerFilterDefs,
  Star,
  Heart,
  Note,
  Tape,
  PolaroidFrame,
  SunSticker,
  CloudSticker,
  FlowerSticker,
  HeartEnvelope,
  ClockSticker,
  ThoughtBubbles,
  GameCard,
  CrownSticker,
  TallyNumber,
  SweatDrop,
  ShockLines,
  SpeechBubble,
  ConfettiPiece,
  GiftBox,
  QMark,
  Arrow,
  BurstRays,
} from "./Sticker";
import { Subtitle } from "./Subtitle";
import { WarmWarm } from "./Character";
import { useEp01Font } from "./useFont";

/**
 * 《暖暖的日常》EP01｜我的妈妈 · 最终成片
 * ------------------------------------------------------------------
 * 规格：16:9 横屏 (1920x1080) ｜ 24 fps ｜ 时长 1104 帧 (46.0s)
 * 风格：治愈系手账拼贴动态绘本 (Cozy Animated Scrapbook Storybook)
 *
 * 全面达成制作标准：
 * 1. 暖暖 Spine 骨骼驱动：呼吸、歪头、点头、左右摇头纯函数逐帧驱动，水彩彩铅风；
 * 2. 丰富镜头与不同景别：从全景绘本展开 -> 中景穿搭挑选 -> 特写沉思 ->
 *    双格对比分屏 -> 换装卡牌舞台 -> 大特写歪头提问 -> 全景爆发裙海 -> 温情落点；
 * 3. 创意的手账转场：波点纸胶带刷屏、镜头推拉呼吸、拍立得缩放、纸张翻折合页；
 * 4. 细腻音效 (SFX) 与动效毫秒级同步：
 *    - 开场翻页声 (page_turn)
 *    - 衣架木质轻碰声 (hanger_clink)
 *    - 晨起闹钟轻嗒声 (clock_tick)
 *    - 贴纸/便签可爱弹出声 (pop / pop_cute)
 *    - 换装游戏/星星轻铃 (chime_sparkle)
 *    - 喜剧高潮“亿点点”衣柜弹开爆裂声 (burst)
 *    - 结尾绘本温柔合页声 (page_close)
 * 5. BGM 音量智能闪避（人声时 0.12 垫底，高潮处 0.22 烘托，结尾自然淡出）；
 * 6. 严守红线：妈妈全程无脸无手无影，完全由温暖场景、衣柜与旁白体现。
 */

export const EP01_SUBTITLES = [
  { start: 3, end: 45, text: "嗨，我叫暖暖。" },
  { start: 48, end: 96, text: "我有一个超爱我的妈妈。" },
  { start: 104, end: 188, text: "妈妈最大爱好，就是给我挑新衣服。" },
  { start: 198, end: 256, text: "每天早上，她打开衣柜，" },
  { start: 260, end: 316, text: "对着裙子陷入沉思。" },
  { start: 322, end: 374, text: "穿这件？" },
  { start: 380, end: 430, text: "还是这件？" },
  { start: 438, end: 542, text: "有时候我偷偷想：妈妈哪里是养女儿，她分明在玩奇迹暖暖。" },
  { start: 550, end: 612, text: "妈妈总觉得衣柜还差一件。" },
  { start: 620, end: 656, text: "昨天的小裙子，" },
  { start: 660, end: 694, text: "今天就失宠。" },
  { start: 700, end: 776, text: "一件两件三件……衣柜快要关不上。" },
  { start: 782, end: 816, text: "我歪头问妈妈：" },
  { start: 820, end: 864, text: "我到底有多少裙子呀？" },
  { start: 870, end: 904, text: "妈妈笑着说：" },
  { start: 908, end: 960, text: "不多，也就亿点点。", color: PALETTE.creamPinkDeep, fontSize: 62 },
  { start: 966, end: 994, text: "好吧好吧，" },
  { start: 998, end: 1065, text: "反正妈妈，是最爱我的。" },
];

/** 细腻音效触发清单（精准对齐动画与台词节奏） */
const SFX_EVENTS = [
  { frame: 2, src: "audio/sfx/page_turn.wav", volume: 0.45, dur: 15 },
  { frame: 24, src: "audio/sfx/pop.wav", volume: 0.35, dur: 8 },
  { frame: 50, src: "audio/sfx/pop_cute.wav", volume: 0.4, dur: 8 },
  { frame: 112, src: "audio/sfx/hanger_clink.wav", volume: 0.45, dur: 15 },
  { frame: 200, src: "audio/sfx/clock_tick.wav", volume: 0.35, dur: 6 },
  { frame: 262, src: "audio/sfx/pop.wav", volume: 0.35, dur: 8 },
  { frame: 324, src: "audio/sfx/pop_cute.wav", volume: 0.4, dur: 8 },
  { frame: 380, src: "audio/sfx/hanger_clink.wav", volume: 0.45, dur: 15 },
  { frame: 438, src: "audio/sfx/chime_sparkle.wav", volume: 0.42, dur: 32 },
  { frame: 460, src: "audio/sfx/pop.wav", volume: 0.35, dur: 8 },
  { frame: 552, src: "audio/sfx/pop.wav", volume: 0.35, dur: 8 },
  { frame: 622, src: "audio/sfx/pop_cute.wav", volume: 0.35, dur: 8 },
  { frame: 702, src: "audio/sfx/pop_cute.wav", volume: 0.48, dur: 8 },
  { frame: 722, src: "audio/sfx/pop_cute.wav", volume: 0.52, dur: 8 },
  { frame: 742, src: "audio/sfx/pop_cute.wav", volume: 0.58, dur: 8 },
  { frame: 760, src: "audio/sfx/hanger_clink.wav", volume: 0.42, dur: 15 },
  { frame: 786, src: "audio/sfx/pop.wav", volume: 0.4, dur: 8 },
  { frame: 874, src: "audio/sfx/chime_sparkle.wav", volume: 0.45, dur: 30 },
  { frame: 908, src: "audio/sfx/burst.wav", volume: 0.75, dur: 25 },
  { frame: 924, src: "audio/sfx/chime_sparkle.wav", volume: 0.38, dur: 30 },
  { frame: 1060, src: "audio/sfx/page_close.wav", volume: 0.52, dur: 20 },
];

const VectorLayer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 1920 1080"
    style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
  >
    <StickerFilterDefs />
    {children}
  </svg>
);

const FontGate: React.FC = () => {
  useEp01Font();
  return null;
};

const SubtitleTrack: React.FC = () => {
  const frame = useCurrentFrame();
  const current = EP01_SUBTITLES.find((s) => frame >= s.start && frame < s.end);
  if (!current) return null;

  const fadeIn = interpolate(frame, [current.start, current.start + 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [current.end - 6, current.end], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Subtitle
      text={current.text}
      reveal={fadeIn}
      opacity={fadeOut}
      bottom={current.fontSize && current.fontSize > 54 ? 44 : 60}
      color={current.color ?? PALETTE.latte}
      fontSize={current.fontSize ?? 54}
    />
  );
};

export const EP01Video: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // BGM 音量曲线（人声期间 0.12，高潮处 0.22，结尾平滑淡出）
  const bgmVolume = interpolate(
    frame,
    [0, 24, 900, 930, 970, 1055, 1104],
    [0.05, 0.12, 0.12, 0.22, 0.13, 0.13, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // 镜头推拉与弹性震颤
  // 1) 开场绘本翻开微缩 (1.04 -> 1.0)
  // 2) 场景三推近特写 (1.0 -> 1.06)
  // 3) 场景六大歪头提问推近 (1.0 -> 1.10)
  // 4) 场景七爆发震颤与拉远 (1.0)
  // 5) 场景八结尾合页微缩 (1.0 -> 0.985)
  let cameraScale = 1.0;
  if (frame < 30) {
    cameraScale = interpolate(frame, [0, 26], [1.035, 1.0], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  } else if (frame >= 194 && frame < 320) {
    cameraScale = interpolate(frame, [194, 230], [1.0, 1.05], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  } else if (frame >= 320 && frame < 434) {
    cameraScale = interpolate(frame, [320, 350], [1.05, 1.0], {
      easing: Easing.inOut(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  } else if (frame >= 778 && frame < 906) {
    cameraScale = interpolate(frame, [778, 810], [1.0, 1.08], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  } else if (frame >= 906 && frame < 940) {
    cameraScale = interpolate(frame, [906, 920], [1.08, 1.0], {
      easing: Easing.out(Easing.back(1.5)),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  } else if (frame >= 1050) {
    cameraScale = interpolate(frame, [1050, 1104], [1.0, 0.985], {
      easing: Easing.inOut(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }

  // 高潮 908-928 帧弹性相机震颤
  const cameraShakeX =
    frame >= 908 && frame < 928 ? Math.sin((frame - 908) * 2.8) * interpolate(frame, [908, 928], [14, 0]) : 0;
  const cameraShakeY =
    frame >= 908 && frame < 928 ? Math.cos((frame - 908) * 3.2) * interpolate(frame, [908, 928], [11, 0]) : 0;

  // 全局淡出
  const masterFade = interpolate(frame, [1080, 1104], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // -------------------------
  // 暖暖的轨迹与动作 (随分镜与情绪变换)
  // -------------------------
  let warmX = 220;
  let warmY = 200;
  let warmSize = 780;
  let warmTilt = 0;

  if (frame < 100) {
    // 场景一：开场（嗨我叫暖暖 / 超爱我的妈妈）
    const pop = spring({ frame, fps, config: { damping: 11, stiffness: 120 } });
    warmX = interpolate(pop, [0, 1], [-80, 200]);
    warmY = 190;
    warmSize = 780;
    warmTilt = Math.sin(frame / 16) * 1.5;
  } else if (frame < 194) {
    // 场景二：挑选新衣服
    warmX = interpolate(frame, [100, 126], [200, 80], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    warmY = interpolate(frame, [100, 126], [190, 230], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    warmSize = interpolate(frame, [100, 126], [780, 710], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    warmTilt = interpolate(frame, [110, 140], [0, 4.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  } else if (frame < 320) {
    // 场景三-前段：早上沉思
    warmX = 70;
    warmY = 240;
    warmSize = 700;
    warmTilt = 4 + Math.sin(frame / 18) * 1.5;
  } else if (frame < 434) {
    // 场景三-后段：双选对比（穿这件？还是这件？）
    warmX = 140;
    warmY = 280;
    warmSize = 670;
    // 配合台词：“穿这件？”向左倾侧(-6.5°)，随后“还是这件？”向右倾侧(+8.5°)
    if (frame < 378) {
      warmTilt = interpolate(frame, [322, 345], [0, -6.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    } else {
      warmTilt = interpolate(frame, [380, 405], [-6.5, 8.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    }
  } else if (frame < 546) {
    // 场景四：奇迹暖暖（成为换装模特）
    warmX = interpolate(frame, [434, 460], [140, 260], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    warmY = interpolate(frame, [434, 460], [280, 230], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    warmSize = interpolate(frame, [434, 460], [670, 740], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    warmTilt = -2 + Math.sin(frame / 16) * 1.5;
  } else if (frame < 696) {
    // 场景五-前段：还差一件 / 昨天失宠
    warmX = interpolate(frame, [546, 570], [260, 80], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    warmY = interpolate(frame, [546, 570], [230, 250], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    warmSize = interpolate(frame, [546, 570], [740, 700], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    warmTilt = 3.5;
  } else if (frame < 778) {
    // 场景五-后段：一件两件三件（衣柜关不上）
    warmX = 70;
    warmY = 260;
    warmSize = 690;
    warmTilt = interpolate(frame, [700, 750], [3.5, -4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  } else if (frame < 906) {
    // 场景六：歪头提问（我到底有多少裙子呀？）—— 标志性大歪头
    warmX = interpolate(frame, [778, 806], [70, 160], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    warmY = interpolate(frame, [778, 806], [260, 195], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    warmSize = interpolate(frame, [778, 806], [690, 770], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    warmTilt = interpolate(frame, [785, 825], [-4, 12.5], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  } else if (frame < 980) {
    // 场景七：亿点点爆发高潮
    warmX = interpolate(frame, [906, 924], [160, 110], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    warmY = interpolate(frame, [906, 924], [195, 390], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    warmSize = interpolate(frame, [906, 924], [770, 530], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    warmTilt = interpolate(frame, [906, 930], [12.5, 2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  } else {
    // 场景八：温情收尾（好吧好吧，反正妈妈最爱我）
    warmX = interpolate(frame, [980, 1015], [110, 480], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    warmY = interpolate(frame, [980, 1015], [390, 230], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    warmSize = interpolate(frame, [980, 1015], [530, 740], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const shake = Math.sin((frame - 980) / 9) * 4.5;
    warmTilt = frame < 1035 ? shake : 1.5;
  }

  // -------------------------
  // 衣柜状态与动画
  // -------------------------
  let wardrobeVisible = frame >= 100 && !(frame >= 434 && frame < 546);
  let wardrobeX = 1380;
  let wardrobeY = 560;
  let wardrobeScale = 1.0;
  let wardrobeOpen = 0.45;
  let wardrobeBulge = 0;
  let wardrobeBurst = 0;
  let wardrobeCount = 4;
  let wardrobeOpacity: number = PENCIL.wardrobeOpacity;

  if (frame >= 100 && frame < 194) {
    const enter = spring({ frame: frame - 100, fps, config: { damping: 13 } });
    wardrobeX = interpolate(enter, [0, 1], [1720, 1380]);
    wardrobeOpen = 0.45;
  } else if (frame >= 194 && frame < 434) {
    wardrobeX = 1420;
    wardrobeOpen = interpolate(frame, [194, 230], [0.45, 0.92], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    wardrobeCount = 5;
  } else if (frame >= 546 && frame < 778) {
    wardrobeX = 1320;
    wardrobeY = 560;
    wardrobeScale = 1.02;
    wardrobeCount = Math.floor(interpolate(frame, [546, 680], [5, 9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    wardrobeOpen = interpolate(frame, [546, 620], [0.85, 0.12], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    wardrobeBulge = interpolate(frame, [600, 770], [0.05, 0.82], {
      easing: Easing.inOut(Easing.quad),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  } else if (frame >= 778 && frame < 906) {
    wardrobeX = 1320 + (frame % 3 === 0 ? 3 : frame % 3 === 1 ? -3 : 0);
    wardrobeBulge = 0.88;
    wardrobeOpen = 0.16;
    wardrobeCount = 9;
  } else if (frame >= 906) {
    wardrobeX = 1000;
    wardrobeY = 570;
    wardrobeScale = 1.04;
    wardrobeOpen = 1.0;
    wardrobeBulge = 0.4;
    wardrobeBurst = interpolate(frame, [908, 936], [0, 1], {
      easing: Easing.out(Easing.back(1.6)),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    wardrobeCount = 7;
    if (frame > 990) {
      wardrobeOpacity = interpolate(frame, [990, 1040], [PENCIL.wardrobeOpacity, 0.35], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    }
  }

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.paper, opacity: masterFade }}>
      <FontGate />

      {/* 1. 主人声轨 */}
      <Audio src={staticFile("audio/voice.mp3")} startFrom={0} />

      {/* 2. 背景音乐轨 */}
      <Audio src={staticFile("audio/bgm/fort-fairy_oneabe_cc0.mp3")} volume={bgmVolume} />

      {/* 3. 精准同步音效 (Foley SFX) */}
      {SFX_EVENTS.map((sfx, idx) => (
        <Sequence key={idx} from={sfx.frame} durationInFrames={sfx.dur}>
          <Audio src={staticFile(sfx.src)} volume={sfx.volume} />
        </Sequence>
      ))}

      {/* 4. 画面总视口（含运镜推拉与弹性震颤） */}
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `scale(${cameraScale}) translate(${cameraShakeX}px, ${cameraShakeY}px)`,
          transformOrigin: "center center",
        }}
      >
        <PaperBackground />

        {/* 5. 矢量手账纸画与丰富场景层 */}
        <VectorLayer>
          {/* 地板基线 */}
          <path d="M0 880 H1920" stroke={PALETTE.wood} strokeWidth={2} opacity={0.28} fill="none" />
          <rect x="0" y="880" width="1920" height="200" fill={PALETTE.paperWarm} opacity={0.5} />

          {/* ========================================================
              场景一 (0-100)：绘本翻开 · 暖暖铭牌与爱心信封
             ======================================================== */}
          {frame < 105 && (
            <g opacity={interpolate(frame, [0, 16, 92, 105], [0, 1, 1, 0])}>
              {/* 拟人微笑小太阳 */}
              <SunSticker x={1680} y={190} scale={1.15} rotation={frame * 0.1} />
              <CloudSticker x={1440} y={160} scale={0.95} />
              <CloudSticker x={300} y={130} scale={0.8} />

              {/* 暖暖姓名拍立得标签 */}
              <PolaroidFrame x={450} y={420} w={190} h={120} title="🏷️ 暖暖" rotation={-6}>
                <circle cx="0" cy="0" r="24" fill={PALETTE.creamPink} />
                <Heart x={0} y={-2} scale={0.65} />
              </PolaroidFrame>

              {/* 右侧爱心信封（超爱我的妈妈） */}
              {frame >= 45 && (
                <g opacity={interpolate(frame, [48, 62], [0, 1])}>
                  <HeartEnvelope x={1320} y={460} scale={1.1} rotation={4} />
                  <FlowerSticker x={1120} y={620} scale={1.05} rotation={-14} />
                  <FlowerSticker x={1520} y={630} scale={0.9} rotation={18} color={PALETTE.creamYellow} />
                  <ConfettiPiece x={1180} y={340} rotation={25} />
                  <ConfettiPiece x={1460} y={320} rotation={-35} color={PALETTE.creamYellow} />
                  <ConfettiPiece x={1300} y={260} shape="circle" color={PALETTE.rose} />
                </g>
              )}
            </g>
          )}

          {/* ========================================================
              场景二 (100-194)：妈妈挑新衣服 · 挂衣绳与小裙子展示
             ======================================================== */}
          {frame >= 100 && frame < 194 && (
            <g opacity={interpolate(frame, [100, 115, 185, 194], [0, 1, 1, 0])}>
              {/* 上方挂衣绳 */}
              <path d="M260 220 Q600 250 940 220" fill="none" stroke={PALETTE.wood} strokeWidth={2.5} strokeDasharray="6 4" />
              {/* 木夹子与悬挂裙子 */}
              <g transform="translate(480, 235) rotate(-3)">
                <rect x="-3" y="0" width="6" height="18" fill={PALETTE.woodDeep} rx="2" />
                <Dress y={110} scale={0.78} color={PALETTE.creamPink} variant="pinafore" />
              </g>
              <g transform="translate(720, 240) rotate(4)">
                <rect x="-3" y="0" width="6" height="18" fill={PALETTE.woodDeep} rx="2" />
                <Dress y={110} scale={0.75} color={PALETTE.milkBlue} variant="puff" />
              </g>
              {/* 便签与礼物盒贴纸 */}
              <Note x={1040} y={400} w={230} h={140} rotation={-5} text="今日挑选: 新衣服 ✨" />
              <GiftBox x={940} y={540} size={70} rotation={8} />
              <Star x={380} y={420} scale={1.1} />
              <Heart x={820} y={430} scale={0.9} />
            </g>
          )}

          {/* ========================================================
              场景三 (194-434)：清晨沉思 · 闹钟与双选对比分屏
             ======================================================== */}
          {frame >= 194 && frame < 434 && (
            <g>
              {/* 早晨 8:00 小闹钟贴纸 */}
              <g opacity={interpolate(frame, [198, 212, 420, 434], [0, 1, 1, 0])}>
                <ClockSticker x={240} y={180} scale={1.1} rotation={-8} />
                <Note x={390} y={200} w={180} h={90} lines={1} rotation={4} text="8:00 AM 早安" color={PALETTE.paperWarm} />
              </g>

              {/* 沉思气泡 (260-318 帧) */}
              {frame >= 256 && frame < 322 && (
                <g opacity={interpolate(frame, [260, 275, 312, 322], [0, 1, 1, 0])}>
                  <ThoughtBubbles x={320} y={230} scale={1.05}>
                    <Dress y={8} scale={0.52} color={PALETTE.creamPink} variant="puff" />
                    <Star x={42} y={-16} scale={0.6} />
                  </ThoughtBubbles>
                </g>
              )}

              {/* 双选对比分屏拍立得 (322-434 帧：穿这件？还是这件？) */}
              {frame >= 320 && (
                <g opacity={interpolate(frame, [322, 335, 422, 434], [0, 1, 1, 0])}>
                  {/* Option A: 草莓粉背带裙 */}
                  <g transform="translate(680, 480)">
                    <PolaroidFrame w={280} h={340} title="A 方案：甜美草莓粉 🍓" rotation={-4}>
                      <Dress y={20} scale={1.12} color={PALETTE.creamPink} variant="pinafore" />
                    </PolaroidFrame>
                    <Note x={-120} y={-170} w={190} h={110} rotation={-8} text="穿这件？" />
                    <Arrow x={-70} y={-100} len={90} />
                  </g>

                  {/* Option B: 梦幻天空蓝泡泡裙 (378帧后显现) */}
                  {frame >= 376 && (
                    <g
                      transform="translate(1080, 490)"
                      opacity={interpolate(frame, [378, 392], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
                    >
                      <PolaroidFrame w={280} h={340} title="B 方案：梦幻天空蓝 ☁️" rotation={5} photoBg={PALETTE.offWhite}>
                        <Dress y={20} scale={1.08} color={PALETTE.milkBlue} variant="puff" />
                      </PolaroidFrame>
                      <Note x={120} y={-160} w={190} h={110} rotation={6} color={PALETTE.milkBlue} text="还是这件？" />
                      <Arrow x={70} y={-100} len={-85} />
                    </g>
                  )}

                  <QMark x={240} y={150} scale={1.2} rotation={-12} color={PALETTE.rose} />
                  <QMark x={310} y={130} scale={0.9} rotation={14} color={PALETTE.milkBlue} />
                </g>
              )}
            </g>
          )}

          {/* ========================================================
              核心道具：手绘衣柜
             ======================================================== */}
          {wardrobeVisible && (
            <Wardrobe
              x={wardrobeX}
              y={wardrobeY}
              scale={wardrobeScale}
              open={wardrobeOpen}
              bulge={wardrobeBulge}
              burst={wardrobeBurst}
              dressCount={wardrobeCount}
              opacity={wardrobeOpacity}
            />
          )}

          {/* ========================================================
              场景四 (434-546)：换装游戏 SSR 卡牌（奇迹暖暖）
             ======================================================== */}
          {frame >= 434 && frame < 546 && (
            <g opacity={interpolate(frame, [434, 450, 532, 546], [0, 1, 1, 0])}>
              {/* 暖暖脚下的模特小光圈 */}
              <ellipse cx={260} cy={880} rx={160} ry={24} fill={PALETTE.creamYellow} opacity={0.6} />

              {/* 暖暖头顶闪耀的小皇冠贴纸 */}
              <CrownSticker x={260} y={150} scale={1.2} rotation={-2} />

              {/* 手账贴纸：奇迹暖暖游戏卡牌 */}
              <GameCard x={960} y={490} scale={1.12} rotation={-3} rank="SSR ★★★★★" score="魅力搭配 +99999" title="梦幻甜心蓬蓬裙" />
              <GameCard x={1280} y={510} scale={0.98} rotation={6} rank="SR ★★★★" score="甜度 +8888" title="天空微风洋装" />

              {/* 手写游戏便签与大蝴蝶结 */}
              <Note x={630} y={320} w={260} h={130} rotation={-6} text="奇迹暖暖进行中...💕" color={PALETTE.creamPink} />
              <Bow x={620} y={640} scale={1.2} rotation={12} color={PALETTE.rose} />
              <Star x={760} y={190} scale={1.2} />
              <Star x={1480} y={230} scale={1.0} rotation={18} />
              <Heart x={1120} y={220} scale={1.1} />
            </g>
          )}

          {/* ========================================================
              场景五 (546-778)：心愿单 / 昨天失宠 / 一件两件三件数字印章
             ======================================================== */}
          {frame >= 546 && frame < 778 && (
            <g>
              {/* 550-620 帧：还差一件心愿单 + 快递礼物盒 */}
              {frame < 620 && (
                <g opacity={interpolate(frame, [550, 565, 608, 620], [0, 1, 1, 0])}>
                  <Note x={460} y={320} w={240} h={150} rotation={-4} text="心愿单: 还差 1 件！" />
                  <GiftBox x={380} y={470} size={84} rotation={-6} />
                  <GiftBox x={490} y={485} size={70} rotation={8} color={PALETTE.milkBlue} />
                </g>
              )}

              {/* 620-696 帧：昨天 vs 今天失宠对比拍立得 */}
              {frame >= 618 && frame < 698 && (
                <g opacity={interpolate(frame, [620, 632, 685, 696], [0, 1, 1, 0])}>
                  <PolaroidFrame x={410} y={450} w={200} h={240} title="昨天 ✨ 最宠爱" rotation={-5}>
                    <Dress y={8} scale={0.8} color={PALETTE.creamYellow} variant="pinafore" />
                  </PolaroidFrame>
                  <PolaroidFrame x={670} y={465} w={200} h={240} title="今天 🍃 失宠啦" rotation={6} photoBg={PALETTE.offWhite}>
                    <Dress y={8} scale={0.78} color={PALETTE.rose} variant="long" />
                    <Tape y={10} w={90} rotation={-18} />
                  </PolaroidFrame>
                  <SweatDrop x={770} y={340} scale={1.2} />
                </g>
              )}

              {/* 700-776 帧：一件！两件！三件！数字贴纸印章逐个砸出 */}
              {frame >= 700 && (
                <g>
                  {frame >= 702 && (
                    <g transform="translate(680, 260) scale(1.15)">
                      <TallyNumber num="①" label="一件" color={PALETTE.creamPinkDeep} />
                    </g>
                  )}
                  {frame >= 722 && (
                    <g transform="translate(860, 240) scale(1.15)">
                      <TallyNumber num="②" label="两件" color={PALETTE.milkBlue} />
                    </g>
                  )}
                  {frame >= 742 && (
                    <g transform="translate(1040, 260) scale(1.2)">
                      <TallyNumber num="③" label="三件..." color={PALETTE.rose} />
                    </g>
                  )}
                  <ShockLines x={1320} y={230} scale={1.2} />
                  <SweatDrop x={1440} y={260} scale={1.3} rotation={12} />
                </g>
              )}
            </g>
          )}

          {/* ========================================================
              场景六 (778-906)：歪头提问 · 漫画大对话框与计数器
             ======================================================== */}
          {frame >= 778 && frame < 906 && (
            <g opacity={interpolate(frame, [780, 796, 894, 906], [0, 1, 1, 0])}>
              <SpeechBubble x={580} y={190} w={380} h={130} text="我到底有多少裙子呀？👗❓" />
              <PolaroidFrame x={920} y={320} w={190} h={110} title="统计: 9999+ 件" rotation={8} />
              <QMark x={360} y={140} scale={1.3} rotation={-14} color={PALETTE.creamPinkDeep} />
              <Star x={420} y={80} scale={1.0} />

              {frame >= 870 && (
                <g transform="translate(1320, 560)">
                  <BurstRays count={12} rInner={180} rOuter={360} opacity={interpolate(frame, [870, 904], [0, 0.7])} />
                </g>
              )}
            </g>
          )}

          {/* ========================================================
              场景七 (906-980)：视觉高潮 · 亿点点爆裂喷涌！
             ======================================================== */}
          {frame >= 906 && (
            <g>
              {/* 全屏放射爆裂线 */}
              <g transform="translate(1000, 570)">
                <BurstRays count={24} rInner={160} rOuter={920} opacity={interpolate(frame, [908, 920, 960, 980], [0, 0.85, 0.85, 0.2])} />
              </g>

              {/* 巨幅白边手写大字标签贴纸：「亿 · 点 · 点 ✨」 */}
              <g transform="translate(960, 150)">
                <rect x="-240" y="-55" width="480" height="110" rx="24" fill="#ffffff" filter="url(#sticker-shadow)" />
                <rect x="-234" y="-49" width="468" height="98" rx="18" fill={PALETTE.creamPink} stroke={STROKE.color} strokeWidth={2.5} />
                <text x="0" y="18" textAnchor="middle" fontSize="62" fontWeight="bold" fill={PALETTE.line} fontFamily="'ZCOOL KuaiLe', sans-serif">
                  ✨ 亿 · 点 · 点 ✨
                </text>
                <Tape x={-200} y={-45} w={70} rotation={-18} />
                <Tape x={200} y={-45} w={70} rotation={18} />
              </g>

              {/* 满屏喷涌散落的小裙子、蝴蝶结、花朵与彩屑 */}
              <g opacity={interpolate(frame, [908, 924], [0, 1])}>
                <Dress x={260} y={930} scale={1.4} rotation={-24} color={PALETTE.rose} variant="puff" />
                <Dress x={1660} y={930} scale={1.38} rotation={22} color={PALETTE.milkBlue} variant="long" />
                <Dress x={680} y={950} scale={1.25} rotation={-10} color={PALETTE.creamYellow} variant="pinafore" />
                <Dress x={1260} y={960} scale={1.22} rotation={14} color={PALETTE.creamPinkDeep} variant="puff" />

                <Dress x={400} y={360} scale={1.05} rotation={-16} color={PALETTE.creamPink} variant="long" />
                <Dress x={1580} y={380} scale={1.08} rotation={18} color={PALETTE.creamYellow} variant="pinafore" />
                <Bow x={320} y={220} scale={1.3} rotation={-18} color={PALETTE.rose} />
                <Bow x={1540} y={220} scale={1.25} rotation={16} color={PALETTE.creamPinkDeep} />
                <Bow x={820} y={260} scale={1.1} rotation={8} color={PALETTE.milkBlue} />
                <Bow x={1180} y={270} scale={1.15} rotation={-12} color={PALETTE.creamYellow} />

                {Array.from({ length: 18 }).map((_, i) => {
                  const cx = 150 + i * 95;
                  const cy = 200 + ((i * 47) % 550);
                  const rot = (i * 37) % 360;
                  const colors = [PALETTE.creamPink, PALETTE.creamYellow, PALETTE.milkBlue, PALETTE.rose];
                  return (
                    <ConfettiPiece
                      key={i}
                      x={cx}
                      y={cy}
                      rotation={rot}
                      color={colors[i % colors.length]}
                      shape={i % 3 === 0 ? "circle" : i % 3 === 1 ? "rect" : "ribbon"}
                    />
                  );
                })}
              </g>
            </g>
          )}

          {/* ========================================================
              场景八 (980-1104)：温情落点 · 裙海与手写心愿拍立得
             ======================================================== */}
          {frame >= 980 && (
            <g opacity={interpolate(frame, [980, 1010], [0, 1])}>
              <Heart x={380} y={240} scale={1.15} rotation={-12} />
              <Heart x={660} y={200} scale={1.0} rotation={14} color={PALETTE.creamPinkDeep} />
              <Heart x={520} y={150} scale={0.85} rotation={-5} />
              <FlowerSticker x={320} y={640} scale={1.1} rotation={-8} />
              <FlowerSticker x={780} y={660} scale={1.0} rotation={12} color={PALETTE.creamYellow} />

              <PolaroidFrame x={1380} y={420} w={260} h={300} title="最爱我的妈妈 ❤️" rotation={4}>
                <Heart x={0} y={-8} scale={1.3} />
                <Star x={-50} y={-50} scale={0.7} />
                <Star x={50} y={30} scale={0.6} />
              </PolaroidFrame>
            </g>
          )}
        </VectorLayer>

        {/* 暖暖角色 (Spine 纯函数逐帧驱动) */}
        <WarmWarm x={warmX} y={warmY} size={warmSize} tilt={warmTilt} />

        {/* 独立字幕轨 */}
        <SubtitleTrack />

        {/* 全画布彩铅手绘纸纹颗粒层 */}
        <PaperGrain />
      </div>
    </AbsoluteFill>
  );
};
