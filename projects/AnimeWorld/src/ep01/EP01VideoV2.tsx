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
import { PALETTE, PENCIL, STROKE, FONT } from "./theme";
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
 * 《暖暖的日常》EP01｜我的妈妈 · V2 优化版
 * ------------------------------------------------------------------
 * 优化重点（核心原则：最小改动，保护现有成果）：
 * 1. 新增约 2.5 秒（60帧）悬念片头：复用衣柜爆开高潮做幽默倒叙钩子，
 *    手写便签「——等等，事情到底是怎么变成这样的？」，不剧透“奇迹暖暖”，随后自然翻页接入正片；
 * 2. 配音绝对保留原始暖暖音色（从 f60 无缝平滑起播）；
 * 3. 补充精准音效：
 *    - 悬念片头爆裂 (burst.wav)
 *    - 奇迹暖暖金句卡牌高光闪耀 (game_ding.wav)
 *    - 衣柜塞满关不上挤压微颤 (wood_creak.wav)
 *    - 视觉高潮爆裂喷涌 (burst.wav)
 * 4. 适当强化「妈妈哪里是养女儿，她分明在玩奇迹暖暖」的彩铅手账风高光动效；
 * 5. 保持温情故事主体不变，绝不添加营销关注字幕。
 */

export const TEASER_OFFSET = 60; // 2.5s @ 24fps

export const EP01_SUBTITLES_V2 = [
  { start: 3 + TEASER_OFFSET, end: 45 + TEASER_OFFSET, text: "嗨，我叫暖暖。" },
  { start: 48 + TEASER_OFFSET, end: 96 + TEASER_OFFSET, text: "我有一个超爱我的妈妈。" },
  { start: 104 + TEASER_OFFSET, end: 188 + TEASER_OFFSET, text: "妈妈最大爱好，就是给我挑新衣服。" },
  { start: 198 + TEASER_OFFSET, end: 256 + TEASER_OFFSET, text: "每天早上，她打开衣柜，" },
  { start: 260 + TEASER_OFFSET, end: 316 + TEASER_OFFSET, text: "对着裙子陷入沉思。" },
  { start: 322 + TEASER_OFFSET, end: 374 + TEASER_OFFSET, text: "穿这件？" },
  { start: 380 + TEASER_OFFSET, end: 430 + TEASER_OFFSET, text: "还是这件？" },
  {
    start: 438 + TEASER_OFFSET,
    end: 542 + TEASER_OFFSET,
    text: "有时候我偷偷想：妈妈哪里是养女儿，她分明在玩奇迹暖暖。",
    highlight: true,
  },
  { start: 550 + TEASER_OFFSET, end: 612 + TEASER_OFFSET, text: "妈妈总觉得衣柜还差一件。" },
  { start: 620 + TEASER_OFFSET, end: 656 + TEASER_OFFSET, text: "昨天的小裙子，" },
  { start: 660 + TEASER_OFFSET, end: 694 + TEASER_OFFSET, text: "今天就失宠。" },
  { start: 700 + TEASER_OFFSET, end: 776 + TEASER_OFFSET, text: "一件两件三件……衣柜快要关不上。" },
  { start: 782 + TEASER_OFFSET, end: 816 + TEASER_OFFSET, text: "我歪头问妈妈：" },
  { start: 820 + TEASER_OFFSET, end: 864 + TEASER_OFFSET, text: "我到底有多少裙子呀？" },
  { start: 870 + TEASER_OFFSET, end: 904 + TEASER_OFFSET, text: "妈妈笑着说：" },
  { start: 908 + TEASER_OFFSET, end: 960 + TEASER_OFFSET, text: "不多，也就亿点点。", color: PALETTE.creamPinkDeep, fontSize: 62 },
  { start: 966 + TEASER_OFFSET, end: 994 + TEASER_OFFSET, text: "好吧好吧，" },
  { start: 998 + TEASER_OFFSET, end: 1065 + TEASER_OFFSET, text: "反正妈妈，是最爱我的。" },
];

/** 细腻音效触发清单（含新增精准音效） */
const SFX_EVENTS_V2 = [
  // --- 悬念片头 (0 - 60帧) ---
  { frame: 6, src: "audio/sfx/wood_creak.wav", volume: 0.38, dur: 18 },
  { frame: 20, src: "audio/sfx/burst.wav", volume: 0.58, dur: 22 },
  { frame: 54, src: "audio/sfx/page_turn.wav", volume: 0.45, dur: 15 },

  // --- 正片 (帧数 + TEASER_OFFSET) ---
  { frame: 2 + TEASER_OFFSET, src: "audio/sfx/page_turn.wav", volume: 0.42, dur: 15 },
  { frame: 24 + TEASER_OFFSET, src: "audio/sfx/pop.wav", volume: 0.35, dur: 8 },
  { frame: 50 + TEASER_OFFSET, src: "audio/sfx/pop_cute.wav", volume: 0.4, dur: 8 },
  { frame: 112 + TEASER_OFFSET, src: "audio/sfx/hanger_clink.wav", volume: 0.45, dur: 15 },
  { frame: 200 + TEASER_OFFSET, src: "audio/sfx/clock_tick.wav", volume: 0.35, dur: 6 },
  { frame: 262 + TEASER_OFFSET, src: "audio/sfx/pop.wav", volume: 0.35, dur: 8 },
  { frame: 324 + TEASER_OFFSET, src: "audio/sfx/pop_cute.wav", volume: 0.4, dur: 8 },
  { frame: 380 + TEASER_OFFSET, src: "audio/sfx/hanger_clink.wav", volume: 0.45, dur: 15 },

  // 奇迹暖暖金句 (补充精准音效：轻铃 + 游戏通关金句铃)
  { frame: 438 + TEASER_OFFSET, src: "audio/sfx/chime_sparkle.wav", volume: 0.35, dur: 30 },
  { frame: 460 + TEASER_OFFSET, src: "audio/sfx/game_ding.wav", volume: 0.42, dur: 22 },

  { frame: 552 + TEASER_OFFSET, src: "audio/sfx/pop.wav", volume: 0.35, dur: 8 },
  { frame: 622 + TEASER_OFFSET, src: "audio/sfx/pop_cute.wav", volume: 0.35, dur: 8 },
  { frame: 702 + TEASER_OFFSET, src: "audio/sfx/pop_cute.wav", volume: 0.48, dur: 8 },
  { frame: 722 + TEASER_OFFSET, src: "audio/sfx/pop_cute.wav", volume: 0.52, dur: 8 },
  { frame: 742 + TEASER_OFFSET, src: "audio/sfx/pop_cute.wav", volume: 0.58, dur: 8 },

  // 衣柜关不上 (补充精准音效：木质挤压微颤声 + 衣架撞击)
  { frame: 752 + TEASER_OFFSET, src: "audio/sfx/wood_creak.wav", volume: 0.45, dur: 20 },
  { frame: 766 + TEASER_OFFSET, src: "audio/sfx/hanger_clink.wav", volume: 0.38, dur: 15 },

  { frame: 786 + TEASER_OFFSET, src: "audio/sfx/pop.wav", volume: 0.4, dur: 8 },
  { frame: 874 + TEASER_OFFSET, src: "audio/sfx/chime_sparkle.wav", volume: 0.45, dur: 30 },

  // 视觉高潮爆发
  { frame: 908 + TEASER_OFFSET, src: "audio/sfx/burst.wav", volume: 0.75, dur: 25 },
  { frame: 924 + TEASER_OFFSET, src: "audio/sfx/chime_sparkle.wav", volume: 0.38, dur: 30 },

  { frame: 1060 + TEASER_OFFSET, src: "audio/sfx/page_close.wav", volume: 0.52, dur: 20 },
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

const SubtitleTrackV2: React.FC = () => {
  const frame = useCurrentFrame();
  const current = EP01_SUBTITLES_V2.find((s) => frame >= s.start && frame < s.end);
  if (!current) return null;

  const fadeIn = interpolate(frame, [current.start, current.start + 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [current.end - 6, current.end], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 重点强化：「妈妈哪里是养女儿，她分明在玩奇迹暖暖」的柔和彩铅高光字幕
  if (current.highlight) {
    const bounce = spring({
      frame: frame - current.start,
      fps: 24,
      config: { damping: 12, stiffness: 130 },
    });
    return (
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 50,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "relative",
            padding: "8px 32px",
            borderRadius: 18,
            backgroundColor: "rgba(246, 211, 218, 0.55)", // 柔和奶油粉手账荧光高光
            border: `2.5px dashed ${PALETTE.creamPinkDeep}`,
            transform: `scale(${0.94 + bounce * 0.06})`,
            opacity: fadeIn * fadeOut,
            boxShadow: "0 4px 14px rgba(107, 81, 72, 0.12)",
          }}
        >
          <span
            style={{
              fontFamily: FONT.subtitle,
              fontSize: 54,
              color: PALETTE.latte,
              letterSpacing: 2,
              lineHeight: 1.35,
              textShadow: `0 1px 0 ${PALETTE.paper}, 1px 0 0 ${PALETTE.paper}`,
            }}
          >
            有时候我偷偷想：妈妈哪里是养女儿，她分明在玩
            <span
              style={{
                color: PALETTE.creamPinkDeep,
                fontWeight: "bold",
                fontSize: 58,
                marginLeft: 4,
              }}
            >
              奇迹暖暖 ✨
            </span>
          </span>
        </div>
      </div>
    );
  }

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

export const EP01VideoV2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // BGM 音量曲线（悬念片头保持垫底，正片自然延展）
  const bgmVolume = interpolate(
    frame,
    [
      0,
      TEASER_OFFSET,
      TEASER_OFFSET + 24,
      TEASER_OFFSET + 900,
      TEASER_OFFSET + 930,
      TEASER_OFFSET + 970,
      TEASER_OFFSET + 1055,
      1164,
    ],
    [0.08, 0.08, 0.12, 0.12, 0.22, 0.13, 0.13, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // 镜头推拉与弹性震颤
  let cameraScale = 1.0;
  let cameraShakeX = 0;
  let cameraShakeY = 0;

  if (frame < TEASER_OFFSET) {
    // 悬念片头：衣柜爆开瞬间带快速震颤
    if (frame >= 20 && frame < 38) {
      cameraShakeX = Math.sin((frame - 20) * 3) * interpolate(frame, [20, 38], [12, 0]);
      cameraShakeY = Math.cos((frame - 20) * 3.5) * interpolate(frame, [20, 38], [10, 0]);
    }
  } else {
    // 正片内部镜头逻辑（基于原有节奏整体平移）
    const mainFrame = frame - TEASER_OFFSET;
    if (mainFrame < 30) {
      cameraScale = interpolate(mainFrame, [0, 26], [1.035, 1.0], {
        easing: Easing.out(Easing.cubic),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    } else if (mainFrame >= 194 && mainFrame < 320) {
      cameraScale = interpolate(mainFrame, [194, 230], [1.0, 1.05], {
        easing: Easing.out(Easing.cubic),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    } else if (mainFrame >= 320 && mainFrame < 434) {
      cameraScale = interpolate(mainFrame, [320, 350], [1.05, 1.0], {
        easing: Easing.inOut(Easing.cubic),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    } else if (mainFrame >= 778 && mainFrame < 906) {
      cameraScale = interpolate(mainFrame, [778, 810], [1.0, 1.08], {
        easing: Easing.out(Easing.cubic),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    } else if (mainFrame >= 906 && mainFrame < 940) {
      cameraScale = interpolate(mainFrame, [906, 920], [1.08, 1.0], {
        easing: Easing.out(Easing.back(1.5)),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    } else if (mainFrame >= 1050) {
      cameraScale = interpolate(mainFrame, [1050, 1104], [1.0, 0.985], {
        easing: Easing.inOut(Easing.cubic),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    }

    if (mainFrame >= 908 && mainFrame < 928) {
      cameraShakeX = Math.sin((mainFrame - 908) * 2.8) * interpolate(mainFrame, [908, 928], [14, 0]);
      cameraShakeY = Math.cos((mainFrame - 908) * 3.2) * interpolate(mainFrame, [908, 928], [11, 0]);
    }
  }

  // 全局淡出
  const masterFade = interpolate(frame, [1140, 1164], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // -------------------------
  // 正片中暖暖的轨迹与动作
  // -------------------------
  const mainF = frame - TEASER_OFFSET;
  let warmX = 220;
  let warmY = 200;
  let warmSize = 780;
  let warmTilt = 0;

  if (frame >= TEASER_OFFSET) {
    if (mainF < 100) {
      const pop = spring({ frame: mainF, fps, config: { damping: 11, stiffness: 120 } });
      warmX = interpolate(pop, [0, 1], [-80, 200]);
      warmY = 190;
      warmSize = 780;
      warmTilt = Math.sin(mainF / 16) * 1.5;
    } else if (mainF < 194) {
      warmX = interpolate(mainF, [100, 126], [200, 80], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      warmY = interpolate(mainF, [100, 126], [190, 230], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      warmSize = interpolate(mainF, [100, 126], [780, 710], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      warmTilt = interpolate(mainF, [110, 140], [0, 4.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    } else if (mainF < 320) {
      warmX = 70;
      warmY = 240;
      warmSize = 700;
      warmTilt = 4 + Math.sin(mainF / 18) * 1.5;
    } else if (mainF < 434) {
      warmX = 140;
      warmY = 280;
      warmSize = 670;
      if (mainF < 378) {
        warmTilt = interpolate(mainF, [322, 345], [0, -6.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      } else {
        warmTilt = interpolate(mainF, [380, 405], [-6.5, 8.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      }
    } else if (mainF < 546) {
      warmX = interpolate(mainF, [434, 460], [140, 260], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      warmY = interpolate(mainF, [434, 460], [280, 230], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      warmSize = interpolate(mainF, [434, 460], [670, 740], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      warmTilt = -2 + Math.sin(mainF / 16) * 1.5;
    } else if (mainF < 696) {
      warmX = interpolate(mainF, [546, 570], [260, 80], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      warmY = interpolate(mainF, [546, 570], [230, 250], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      warmSize = interpolate(mainF, [546, 570], [740, 700], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      warmTilt = 3.5;
    } else if (mainF < 778) {
      warmX = 70;
      warmY = 260;
      warmSize = 690;
      warmTilt = interpolate(mainF, [700, 750], [3.5, -4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    } else if (mainF < 906) {
      warmX = interpolate(mainF, [778, 806], [70, 160], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      warmY = interpolate(mainF, [778, 806], [260, 195], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      warmSize = interpolate(mainF, [778, 806], [690, 770], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      warmTilt = interpolate(mainF, [785, 825], [-4, 12.5], {
        easing: Easing.out(Easing.cubic),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    } else if (mainF < 980) {
      warmX = interpolate(mainF, [906, 924], [160, 110], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      warmY = interpolate(mainF, [906, 924], [195, 390], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      warmSize = interpolate(mainF, [906, 924], [770, 530], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      warmTilt = interpolate(mainF, [906, 930], [12.5, 2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    } else {
      warmX = interpolate(mainF, [980, 1015], [110, 480], {
        easing: Easing.out(Easing.cubic),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      warmY = interpolate(mainF, [980, 1015], [390, 230], {
        easing: Easing.out(Easing.cubic),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      warmSize = interpolate(mainF, [980, 1015], [530, 740], {
        easing: Easing.out(Easing.cubic),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      const shake = Math.sin((mainF - 980) / 9) * 4.5;
      warmTilt = mainF < 1035 ? shake : 1.5;
    }
  }

  // -------------------------
  // 正片中衣柜状态与动画
  // -------------------------
  let wardrobeVisible = frame >= TEASER_OFFSET + 100 && !(mainF >= 434 && mainF < 546);
  let wardrobeX = 1380;
  let wardrobeY = 560;
  let wardrobeScale = 1.0;
  let wardrobeOpen = 0.45;
  let wardrobeBulge = 0;
  let wardrobeBurst = 0;
  let wardrobeCount = 4;
  let wardrobeOpacity: number = PENCIL.wardrobeOpacity;

  if (frame >= TEASER_OFFSET) {
    if (mainF >= 100 && mainF < 194) {
      const enter = spring({ frame: mainF - 100, fps, config: { damping: 13 } });
      wardrobeX = interpolate(enter, [0, 1], [1720, 1380]);
      wardrobeOpen = 0.45;
    } else if (mainF >= 194 && mainF < 434) {
      wardrobeX = 1420;
      wardrobeOpen = interpolate(mainF, [194, 230], [0.45, 0.92], {
        easing: Easing.out(Easing.cubic),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      wardrobeCount = 5;
    } else if (mainF >= 546 && mainF < 778) {
      wardrobeX = 1320;
      wardrobeY = 560;
      wardrobeScale = 1.02;
      wardrobeCount = Math.floor(interpolate(mainF, [546, 680], [5, 9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
      wardrobeOpen = interpolate(mainF, [546, 620], [0.85, 0.12], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      wardrobeBulge = interpolate(mainF, [600, 770], [0.05, 0.82], {
        easing: Easing.inOut(Easing.quad),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    } else if (mainF >= 778 && mainF < 906) {
      wardrobeX = 1320 + (mainF % 3 === 0 ? 3 : mainF % 3 === 1 ? -3 : 0);
      wardrobeBulge = 0.88;
      wardrobeOpen = 0.16;
      wardrobeCount = 9;
    } else if (mainF >= 906) {
      wardrobeX = 1000;
      wardrobeY = 570;
      wardrobeScale = 1.04;
      wardrobeOpen = 1.0;
      wardrobeBulge = 0.4;
      wardrobeBurst = interpolate(mainF, [908, 936], [0, 1], {
        easing: Easing.out(Easing.back(1.6)),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      wardrobeCount = 7;
      if (mainF > 990) {
        wardrobeOpacity = interpolate(mainF, [990, 1040], [PENCIL.wardrobeOpacity, 0.35], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
      }
    }
  }

  // 悬念片头专用参数 (0-60帧)
  const isTeaser = frame < TEASER_OFFSET;
  const teaserBurst = interpolate(frame, [20, 42], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const teaserBulge = frame < 20 ? interpolate(frame, [0, 19], [0.35, 0.9]) : 0.4;

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.paper, opacity: masterFade }}>
      <FontGate />

      {/* 1. 主人声轨（在悬念片头之后无缝接入） */}
      <Sequence from={TEASER_OFFSET}>
        <Audio src={staticFile("audio/voice.mp3")} startFrom={0} />
      </Sequence>

      {/* 2. 背景音乐轨 */}
      <Audio src={staticFile("audio/bgm/fort-fairy_oneabe_cc0.mp3")} volume={bgmVolume} />

      {/* 3. 精准同步音效 (Foley SFX) */}
      {SFX_EVENTS_V2.map((sfx, idx) => (
        <Sequence key={idx} from={sfx.frame} durationInFrames={sfx.dur}>
          <Audio src={staticFile(sfx.src)} volume={sfx.volume} />
        </Sequence>
      ))}

      {/* 4. 画面总视口 */}
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `scale(${cameraScale}) translate(${cameraShakeX}px, ${cameraShakeY}px)`,
          transformOrigin: "center center",
        }}
      >
        <PaperBackground />

        {/* ========================================================
            【新增】2.5秒悬念片头 (0 - 60 帧)：倒叙钩子 + 悬念便签
           ======================================================== */}
        {isTeaser && (
          <VectorLayer>
            {/* 纸质斜纹暗角边框 */}
            <rect x="0" y="880" width="1920" height="200" fill={PALETTE.paperWarm} opacity={0.6} />

            {/* 居中爆裂预演衣柜 */}
            <Wardrobe
              x={960}
              y={560}
              scale={1.05}
              open={frame < 20 ? 0.2 : 1.0}
              bulge={teaserBulge}
              burst={teaserBurst}
              dressCount={8}
            />

            {/* 惊吓线与受挤颤动 */}
            {frame < 20 && (
              <>
                <ShockLines x={960} y={240} scale={1.3} />
                <SweatDrop x={1080} y={260} scale={1.4} rotation={12} />
                <Tape x={960} y={150} w={240} h={40} color={PALETTE.rose} />
                <text x="960" y="158" textAnchor="middle" fontSize="26" fill="#ffffff" fontFamily={FONT.subtitle}>
                  ⚠️ 警告：前方衣柜即将失控……
                </text>
              </>
            )}

            {/* 爆开瞬间：喷涌出的裙海与彩屑 */}
            {frame >= 20 && (
              <>
                <Dress x={380} y={880} scale={1.35} rotation={-24} color={PALETTE.rose} variant="puff" />
                <Dress x={1540} y={880} scale={1.32} rotation={22} color={PALETTE.milkBlue} variant="long" />
                <Bow x={520} y={260} scale={1.25} rotation={-16} color={PALETTE.creamPinkDeep} />
                <Bow x={1400} y={260} scale={1.2} rotation={15} color={PALETTE.rose} />

                {/* 悬念手写拍立得便签：倒叙问句 */}
                <g transform="translate(960, 210)">
                  <rect x="-290" y="-50" width="580" height="100" rx="20" fill="#ffffff" filter="url(#sticker-shadow)" />
                  <rect x="-284" y="-44" width="568" height="88" rx="15" fill={PALETTE.creamYellow} stroke={STROKE.color} strokeWidth={2} />
                  <text x="0" y="14" textAnchor="middle" fontSize="38" fontWeight="bold" fill={PALETTE.line} fontFamily={FONT.subtitle}>
                    ……等等，事情到底是怎么变成这样的？
                  </text>
                  <Tape x={-240} y={-42} w={70} rotation={-14} />
                  <Tape x={240} y={-42} w={70} rotation={14} />
                </g>
              </>
            )}

            {/* 片头末尾转场：纸张翻折暗角淡出 */}
            {frame >= 50 && (
              <rect x="0" y="0" width="1920" height="1080" fill={PALETTE.paper} opacity={interpolate(frame, [50, 60], [0, 1])} />
            )}
          </VectorLayer>
        )}

        {/* ========================================================
            正片部分 (frame >= 60)：保留原版全部精华，无缝接入
           ======================================================== */}
        {!isTeaser && (
          <>
            <VectorLayer>
              {/* 地板基线 */}
              <path d="M0 880 H1920" stroke={PALETTE.wood} strokeWidth={2} opacity={0.28} fill="none" />
              <rect x="0" y="880" width="1920" height="200" fill={PALETTE.paperWarm} opacity={0.5} />

              {/* 场景一：绘本翻开 · 暖暖铭牌与爱心信封 */}
              {mainF < 105 && (
                <g opacity={interpolate(mainF, [0, 16, 92, 105], [0, 1, 1, 0])}>
                  <SunSticker x={1680} y={190} scale={1.15} rotation={mainF * 0.1} />
                  <CloudSticker x={1440} y={160} scale={0.95} />
                  <CloudSticker x={300} y={130} scale={0.8} />

                  <PolaroidFrame x={450} y={420} w={190} h={120} title="🏷️ 暖暖" rotation={-6}>
                    <circle cx="0" cy="0" r="24" fill={PALETTE.creamPink} />
                    <Heart x={0} y={-2} scale={0.65} />
                  </PolaroidFrame>

                  {mainF >= 45 && (
                    <g opacity={interpolate(mainF, [48, 62], [0, 1])}>
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

              {/* 场景二：挑选新衣服 · 挂衣绳与小裙子展示 */}
              {mainF >= 100 && mainF < 194 && (
                <g opacity={interpolate(mainF, [100, 115, 185, 194], [0, 1, 1, 0])}>
                  <path d="M260 220 Q600 250 940 220" fill="none" stroke={PALETTE.wood} strokeWidth={2.5} strokeDasharray="6 4" />
                  <g transform="translate(480, 235) rotate(-3)">
                    <rect x="-3" y="0" width="6" height="18" fill={PALETTE.woodDeep} rx="2" />
                    <Dress y={110} scale={0.78} color={PALETTE.creamPink} variant="pinafore" />
                  </g>
                  <g transform="translate(720, 240) rotate(4)">
                    <rect x="-3" y="0" width="6" height="18" fill={PALETTE.woodDeep} rx="2" />
                    <Dress y={110} scale={0.75} color={PALETTE.milkBlue} variant="puff" />
                  </g>
                  <Note x={1040} y={400} w={230} h={140} rotation={-5} text="今日挑选: 新衣服 ✨" />
                  <GiftBox x={940} y={540} size={70} rotation={8} />
                  <Star x={380} y={420} scale={1.1} />
                  <Heart x={820} y={430} scale={0.9} />
                </g>
              )}

              {/* 场景三：清晨沉思 · 闹钟与双选对比分屏 */}
              {mainF >= 194 && mainF < 434 && (
                <g>
                  <g opacity={interpolate(mainF, [198, 212, 420, 434], [0, 1, 1, 0])}>
                    <ClockSticker x={240} y={180} scale={1.1} rotation={-8} />
                    <Note x={390} y={200} w={180} h={90} lines={1} rotation={4} text="8:00 AM 早安" color={PALETTE.paperWarm} />
                  </g>

                  {mainF >= 256 && mainF < 322 && (
                    <g opacity={interpolate(mainF, [260, 275, 312, 322], [0, 1, 1, 0])}>
                      <ThoughtBubbles x={320} y={230} scale={1.05}>
                        <Dress y={8} scale={0.52} color={PALETTE.creamPink} variant="puff" />
                        <Star x={42} y={-16} scale={0.6} />
                      </ThoughtBubbles>
                    </g>
                  )}

                  {mainF >= 320 && (
                    <g opacity={interpolate(mainF, [322, 335, 422, 434], [0, 1, 1, 0])}>
                      <g transform="translate(680, 480)">
                        <PolaroidFrame w={280} h={340} title="A 方案：甜美草莓粉 🍓" rotation={-4}>
                          <Dress y={20} scale={1.12} color={PALETTE.creamPink} variant="pinafore" />
                        </PolaroidFrame>
                        <Note x={-120} y={-170} w={190} h={110} rotation={-8} text="穿这件？" />
                        <Arrow x={-70} y={-100} len={90} />
                      </g>

                      {mainF >= 376 && (
                        <g
                          transform="translate(1080, 490)"
                          opacity={interpolate(mainF, [378, 392], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
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

              {/* 核心道具：手绘衣柜 */}
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

              {/* 场景四：换装游戏 SSR 卡牌（奇迹暖暖） */}
              {mainF >= 434 && mainF < 546 && (
                <g opacity={interpolate(mainF, [434, 450, 532, 546], [0, 1, 1, 0])}>
                  <ellipse cx={260} cy={880} rx={160} ry={24} fill={PALETTE.creamYellow} opacity={0.6} />
                  <CrownSticker x={260} y={150} scale={1.2} rotation={-2} />

                  <GameCard x={960} y={490} scale={1.12} rotation={-3} rank="SSR ★★★★★" score="魅力搭配 +99999" title="梦幻甜心蓬蓬裙" />
                  <GameCard x={1280} y={510} scale={0.98} rotation={6} rank="SR ★★★★" score="甜度 +8888" title="天空微风洋装" />

                  <Note x={630} y={320} w={260} h={130} rotation={-6} text="奇迹暖暖进行中...💕" color={PALETTE.creamPink} />
                  <Bow x={620} y={640} scale={1.2} rotation={12} color={PALETTE.rose} />
                  <Star x={760} y={190} scale={1.2} />
                  <Star x={1480} y={230} scale={1.0} rotation={18} />
                  <Heart x={1120} y={220} scale={1.1} />
                </g>
              )}

              {/* 场景五：心愿单 / 昨天失宠 / 一件两件三件数字印章 */}
              {mainF >= 546 && mainF < 778 && (
                <g>
                  {mainF < 620 && (
                    <g opacity={interpolate(mainF, [550, 565, 608, 620], [0, 1, 1, 0])}>
                      <Note x={460} y={320} w={240} h={150} rotation={-4} text="心愿单: 还差 1 件！" />
                      <GiftBox x={380} y={470} size={84} rotation={-6} />
                      <GiftBox x={490} y={485} size={70} rotation={8} color={PALETTE.milkBlue} />
                    </g>
                  )}

                  {mainF >= 618 && mainF < 698 && (
                    <g opacity={interpolate(mainF, [620, 632, 685, 696], [0, 1, 1, 0])}>
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

                  {mainF >= 700 && (
                    <g>
                      {mainF >= 702 && (
                        <g transform="translate(680, 260) scale(1.15)">
                          <TallyNumber num="①" label="一件" color={PALETTE.creamPinkDeep} />
                        </g>
                      )}
                      {mainF >= 722 && (
                        <g transform="translate(860, 240) scale(1.15)">
                          <TallyNumber num="②" label="两件" color={PALETTE.milkBlue} />
                        </g>
                      )}
                      {mainF >= 742 && (
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

              {/* 场景六：歪头提问 · 漫画大对话框与计数器 */}
              {mainF >= 778 && mainF < 906 && (
                <g opacity={interpolate(mainF, [780, 796, 894, 906], [0, 1, 1, 0])}>
                  <SpeechBubble x={580} y={190} w={380} h={130} text="我到底有多少裙子呀？👗❓" />
                  <PolaroidFrame x={920} y={320} w={190} h={110} title="统计: 9999+ 件" rotation={8} />
                  <QMark x={360} y={140} scale={1.3} rotation={-14} color={PALETTE.creamPinkDeep} />
                  <Star x={420} y={80} scale={1.0} />

                  {mainF >= 870 && (
                    <g transform="translate(1320, 560)">
                      <BurstRays count={12} rInner={180} rOuter={360} opacity={interpolate(mainF, [870, 904], [0, 0.7])} />
                    </g>
                  )}
                </g>
              )}

              {/* 场景七：视觉高潮 · 亿点点爆裂喷涌！ */}
              {mainF >= 906 && (
                <g>
                  <g transform="translate(1000, 570)">
                    <BurstRays count={24} rInner={160} rOuter={920} opacity={interpolate(mainF, [908, 920, 960, 980], [0, 0.85, 0.85, 0.2])} />
                  </g>

                  <g transform="translate(960, 150)">
                    <rect x="-240" y="-55" width="480" height="110" rx="24" fill="#ffffff" filter="url(#sticker-shadow)" />
                    <rect x="-234" y="-49" width="468" height="98" rx="18" fill={PALETTE.creamPink} stroke={STROKE.color} strokeWidth={2.5} />
                    <text x="0" y="18" textAnchor="middle" fontSize="62" fontWeight="bold" fill={PALETTE.line} fontFamily="'ZCOOL KuaiLe', sans-serif">
                      ✨ 亿 · 点 · 点 ✨
                    </text>
                    <Tape x={-200} y={-45} w={70} rotation={-18} />
                    <Tape x={200} y={-45} w={70} rotation={18} />
                  </g>

                  <g opacity={interpolate(mainF, [908, 924], [0, 1])}>
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

              {/* 场景八：温情落点 · 裙海与手写心愿拍立得 */}
              {mainF >= 980 && (
                <g opacity={interpolate(mainF, [980, 1010], [0, 1])}>
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
            <SubtitleTrackV2 />
          </>
        )}

        {/* 全画布彩铅手绘纸纹颗粒层 */}
        <PaperGrain />
      </div>
    </AbsoluteFill>
  );
};
