import type { Person, Project } from '../../types/project';
import { palettes } from './avatarPalettes';
import {
  formatTime,
  type Schedule,
  type TextItem,
  type VoiceItem,
} from '../timeline/schedule';

export const WIDTH = 720;
export const HEIGHT = 1280;
export type Artwork = Partial<Record<Person, CanvasImageSource>>;

// Both preview and export call this frame renderer with an explicit scene and time.
export function renderFrame(
  canvas: HTMLCanvasElement,
  project: Project,
  schedule: Schedule,
  waveformPeaks: number[],
  artwork: Artwork,
  time: number,
) {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas rendering is unavailable.');
  const ctx: CanvasRenderingContext2D = context;
  const state = { ...project, waveformPeaks };
  ctx.save();
  try {
    drawFrame(time);
  } finally {
    ctx.restore();
  }

  function drawAvatar(cx: number, cy: number, radius: number, who: Person) {
    const image = artwork[who];
    const [from, to] = palettes[project.avatars[who].palette] ?? palettes[0];
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
    if (image) {
      ctx.drawImage(image, cx - radius, cy - radius, radius * 2, radius * 2);
    } else {
      const paint = ctx.createLinearGradient(
        cx - radius,
        cy - radius,
        cx + radius,
        cy + radius,
      );
      paint.addColorStop(0, from);
      paint.addColorStop(1, to);
      ctx.fillStyle = paint;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${radius}px system-ui`;
      const name = who === 'me' ? project.myName : project.contactName;
      ctx.fillText(Array.from(name.trim())[0]?.toUpperCase() ?? '?', cx, cy);
    }
    ctx.restore();
  }
  function drawFrame(t: number) {
    const W = canvas.width; // 720
    const H = canvas.height; // 1280
    const isWA = state.platform === 'whatsapp';
    const isDark = state.theme === 'dark';
    const isFloating = state.frameStyle === 'floating';

    ctx.clearRect(0, 0, W, H);

    // 1. Background / Backdrop
    if (isFloating) {
      drawBackdrop(W, H);
    }

    // Phone Container Geometry
    const phoneX = isFloating ? 46 : 0;
    const phoneY = isFloating ? 110 : 0;
    const phoneW = isFloating ? W - 92 : W;
    const phoneH = isFloating ? H - 170 : H;
    const phoneRadius = isFloating ? 46 : 0;

    // Optional Top Hook Caption above floating phone
    if (isFloating && state.overlayCaption.trim()) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 28px Inter, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 14;
      wrapAndDrawCenteredText(
        state.overlayCaption.trim(),
        W / 2,
        38,
        W - 80,
        34,
      );
      ctx.restore();
    }

    // Phone Outer Shadow & Clip
    ctx.save();
    if (isFloating) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = 45;
      ctx.shadowOffsetY = 22;
      roundRectPath(ctx, phoneX, phoneY, phoneW, phoneH, phoneRadius);
      ctx.fillStyle = isDark ? '#0b141a' : '#ffffff';
      ctx.fill();
      ctx.shadowColor = 'transparent';
    }

    roundRectPath(ctx, phoneX, phoneY, phoneW, phoneH, phoneRadius);
    ctx.clip();

    // 2. Chat Wallpaper Background
    if (isWA) {
      ctx.fillStyle = isDark ? '#0b141a' : '#efeae2';
      ctx.fillRect(phoneX, phoneY, phoneW, phoneH);
      drawWhatsAppDoodlePattern(phoneX, phoneY, phoneW, phoneH, isDark);
    } else {
      ctx.fillStyle = isDark ? '#000000' : '#ffffff';
      ctx.fillRect(phoneX, phoneY, phoneW, phoneH);
    }

    // 3. Top Header Bar
    const headerH = isFloating ? 118 : 138;
    drawChatHeader(phoneX, phoneY, phoneW, headerH, isWA, isDark, isFloating);

    // 4. Bottom Input Composer Bar
    const footerH = 92;
    const footerY = phoneY + phoneH - footerH;
    drawChatComposer(phoneX, footerY, phoneW, footerH, isWA, isDark);

    // 5. Chat Messages & Voice Note Feed
    const feedTop = phoneY + headerH + 14;
    const feedBottom = footerY - 14;
    drawChatFeed(
      phoneX,
      feedTop,
      phoneW,
      feedBottom - feedTop,
      schedule,
      isWA,
      isDark,
      t,
    );

    // Simulated Finger Tap Ripple right before voice note plays
    if (
      t >= schedule.voicePlayStart - 0.35 &&
      t <= schedule.voicePlayStart + 0.35
    ) {
      const rippleProgress = (t - (schedule.voicePlayStart - 0.35)) / 0.7;
      const isVoiceMe = state.voiceSender === 'me';
      const tapX = isVoiceMe ? phoneX + phoneW - 355 : phoneX + 95;
      const tapY = Math.min(feedBottom - 60, feedTop + 230);
      ctx.save();
      ctx.beginPath();
      ctx.arc(tapX, tapY, 16 + rippleProgress * 38, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.42 * (1 - rippleProgress)})`;
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();

    // Phone Bezel Border in floating mode
    if (isFloating) {
      ctx.save();
      roundRectPath(ctx, phoneX, phoneY, phoneW, phoneH, phoneRadius);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawBackdrop(W: number, H: number) {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    if (state.backdrop === 'sunset') {
      grad.addColorStop(0, '#2a121b');
      grad.addColorStop(0.5, '#59232c');
      grad.addColorStop(1, '#1e1624');
    } else if (state.backdrop === 'emerald') {
      grad.addColorStop(0, '#071c18');
      grad.addColorStop(0.5, '#113830');
      grad.addColorStop(1, '#091114');
    } else if (state.backdrop === 'minimal') {
      grad.addColorStop(0, '#141417');
      grad.addColorStop(1, '#09090b');
    } else {
      // midnight
      grad.addColorStop(0, '#171123');
      grad.addColorStop(0.5, '#2b1329');
      grad.addColorStop(1, '#0d101c');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  function drawWhatsAppDoodlePattern(
    x: number,
    y: number,
    w: number,
    h: number,
    isDark: boolean,
  ) {
    ctx.save();
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.035)';
    for (let gx = x + 28; gx < x + w; gx += 68) {
      for (let gy = y + 130; gy < y + h - 80; gy += 68) {
        ctx.beginPath();
        ctx.arc(gx, gy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(gx + 22, gy + 16, 12, 4);
      }
    }
    ctx.restore();
  }

  function drawChatHeader(
    x: number,
    y: number,
    w: number,
    h: number,
    isWA: boolean,
    isDark: boolean,
    isFloating: boolean,
  ) {
    ctx.save();
    if (isWA) {
      ctx.fillStyle = isDark ? '#202c33' : '#008069';
    } else {
      ctx.fillStyle = isDark ? '#121212' : '#ffffff';
    }
    ctx.fillRect(x, y, w, h);

    // Status bar time & battery
    const statusY = y + (isFloating ? 22 : 32);
    ctx.fillStyle =
      isWA && !isDark ? '#ffffff' : isDark ? '#e4e4e7' : '#18181b';
    ctx.font = '600 18px Inter, "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('9:41', x + 28, statusY);

    ctx.textAlign = 'right';
    ctx.fillText('5G  100%', x + w - 26, statusY);

    // Navigation row
    const navY = y + h - 42;
    const fgColor =
      isWA && !isDark ? '#ffffff' : isDark ? '#f4f4f5' : '#111827';

    // Back arrow
    ctx.strokeStyle = fgColor;
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 34, navY - 10);
    ctx.lineTo(x + 22, navY);
    ctx.lineTo(x + 34, navY + 10);
    ctx.stroke();

    // Contact Avatar
    drawAvatar(x + 76, navY, 27, 'them');

    // Contact Name
    ctx.fillStyle = fgColor;
    ctx.font = '700 23px Inter, "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(state.contactName, x + 116, navY - 3, w - 237);

    // Contact Status
    ctx.fillStyle =
      isWA && !isDark
        ? 'rgba(255,255,255,0.85)'
        : isDark
          ? '#a1a1aa'
          : '#71717a';
    ctx.font = '500 16px Inter, "Segoe UI", sans-serif';
    ctx.fillText(state.contactStatus, x + 116, navY + 18, w - 237);

    // Call / Video Icons on Right
    ctx.strokeStyle = fgColor;
    ctx.lineWidth = 2.4;
    ctx.strokeRect(x + w - 105, navY - 10, 22, 16);
    ctx.beginPath();
    ctx.arc(x + w - 45, navY - 2, 10, 0, Math.PI * 2);
    ctx.stroke();

    // Divider line for Instagram
    if (!isWA) {
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
      ctx.fillRect(x, y + h - 1, w, 1);
    }
    ctx.restore();
  }

  function drawChatComposer(
    x: number,
    y: number,
    w: number,
    h: number,
    isWA: boolean,
    isDark: boolean,
  ) {
    ctx.save();
    ctx.fillStyle = isWA
      ? isDark
        ? '#0b141a'
        : '#efeae2'
      : isDark
        ? '#000000'
        : '#ffffff';
    ctx.fillRect(x, y, w, h);

    const pillX = x + 18;
    const pillY = y + 16;
    const pillW = w - 96;
    const pillH = 54;

    roundRectPath(ctx, pillX, pillY, pillW, pillH, 27);
    ctx.fillStyle = isWA
      ? isDark
        ? '#202c33'
        : '#ffffff'
      : isDark
        ? '#1c1c1e'
        : '#f4f4f5';
    ctx.fill();

    ctx.fillStyle = isDark ? '#8e8e93' : '#71717a';
    ctx.font = '400 19px Inter, "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const placeholder = isWA ? 'Message' : 'Message...';
    ctx.fillText(placeholder, pillX + 24, pillY + pillH / 2);

    // Right Mic / Send Circle
    const btnCx = x + w - 44;
    const btnCy = pillY + pillH / 2;
    ctx.beginPath();
    ctx.arc(btnCx, btnCy, 25, 0, Math.PI * 2);
    ctx.fillStyle = isWA ? '#00a884' : '#3797f0';
    ctx.fill();

    // Mic icon inside button
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    roundRectPath(ctx, btnCx - 5, btnCy - 11, 10, 15, 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(btnCx, btnCy - 2, 10, 0, Math.PI);
    ctx.stroke();

    ctx.restore();
  }

  function drawChatFeed(
    feedX: number,
    feedY: number,
    feedW: number,
    feedH: number,
    schedule: Schedule,
    isWA: boolean,
    isDark: boolean,
    t: number,
  ) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(feedX, feedY, feedW, feedH);
    ctx.clip();

    // Today Pill Badge
    const pillW = 92;
    const pillH = 30;
    const pillX = feedX + (feedW - pillW) / 2;
    let cursorY = feedY + 10;

    roundRectPath(ctx, pillX, cursorY, pillW, pillH, 12);
    ctx.fillStyle = isWA
      ? isDark
        ? '#182229'
        : 'rgba(255,255,255,0.85)'
      : isDark
        ? '#1c1c1e'
        : '#f4f4f5';
    ctx.fill();

    ctx.fillStyle = isDark ? '#a1a1aa' : '#52525b';
    ctx.font = '600 14px Inter, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Today', feedX + feedW / 2, cursorY + pillH / 2);
    cursorY += pillH + 18;

    // Measure visible items
    const visibleItems = schedule.items.filter((item) => t >= item.appearAt);
    const measured = visibleItems.map((item) => {
      if (item.type === 'text') {
        const lines = wrapTextLines(
          item.text,
          feedW * 0.62,
          '500 21px Inter, "Segoe UI", sans-serif',
        );
        const bubbleH = Math.max(54, lines.length * 28 + 26);
        return { ...item, lines, bubbleH };
      } else {
        return { ...item, bubbleH: 94 };
      }
    });

    const totalContentH = measured.reduce((acc, m) => acc + m.bubbleH + 16, 0);
    const overflowOffset = Math.max(0, totalContentH - (feedH - 60));
    cursorY -= overflowOffset;

    measured.forEach((item) => {
      const age = Math.max(0, t - item.appearAt);
      const popScale = age < 0.22 ? 0.88 + (age / 0.22) * 0.12 : 1;

      if (item.type === 'text') {
        drawTextBubble(feedX, cursorY, feedW, item, isWA, isDark, popScale);
      } else {
        drawVoiceNoteBubble(
          feedX,
          cursorY,
          feedW,
          item,
          isWA,
          isDark,
          t,
          popScale,
        );
      }
      cursorY += item.bubbleH + 16;
    });

    ctx.restore();
  }

  function drawTextBubble(
    feedX: number,
    topY: number,
    feedW: number,
    item: TextItem & { lines: string[]; bubbleH: number },
    isWA: boolean,
    isDark: boolean,
    scale: number,
  ) {
    const isMe = item.sender === 'me';
    ctx.save();
    ctx.font = '500 21px Inter, "Segoe UI", sans-serif';

    let maxLineW = 0;
    item.lines.forEach((line) => {
      const w = ctx.measureText(line).width;
      if (w > maxLineW) maxLineW = w;
    });

    const bubbleW = Math.min(feedW * 0.74, Math.max(120, maxLineW + 44));
    const bubbleH = item.bubbleH;
    const bubbleX = isMe ? feedX + feedW - bubbleW - 22 : feedX + 22;

    const cx = bubbleX + bubbleW / 2;
    const cy = topY + bubbleH / 2;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);

    roundRectPath(ctx, bubbleX, topY, bubbleW, bubbleH, 20);
    if (isWA) {
      ctx.fillStyle = isMe
        ? isDark
          ? '#005c4b'
          : '#d9fdd3'
        : isDark
          ? '#202c33'
          : '#ffffff';
      ctx.fill();
    } else {
      if (isMe) {
        const grad = ctx.createLinearGradient(
          bubbleX,
          topY,
          bubbleX + bubbleW,
          topY + bubbleH,
        );
        grad.addColorStop(0, '#7c3aed');
        grad.addColorStop(1, '#ec4899');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = isDark ? '#262626' : '#efefef';
      }
      ctx.fill();
    }

    const textColor =
      !isWA && isMe ? '#ffffff' : isDark ? '#f4f4f5' : '#111827';

    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    item.lines.forEach((line, idx) => {
      ctx.fillText(line, bubbleX + 20, topY + 13 + idx * 28);
    });

    ctx.restore();
  }

  function drawVoiceNoteBubble(
    feedX: number,
    topY: number,
    feedW: number,
    item: VoiceItem & { bubbleH: number },
    isWA: boolean,
    isDark: boolean,
    t: number,
    scale: number,
  ) {
    const isMe = item.sender === 'me';
    const senderRole = isMe ? 'me' : 'them';
    const bubbleW = Math.min(430, feedW * 0.76);
    const bubbleH = item.bubbleH;
    const bubbleX = isMe ? feedX + feedW - bubbleW - 22 : feedX + 22;

    const isPlayingNow = t >= item.playStart && t < item.playEnd;
    const progress =
      t < item.playStart
        ? 0
        : Math.min(1, (t - item.playStart) / item.duration);

    ctx.save();
    const cx = bubbleX + bubbleW / 2;
    const cy = topY + bubbleH / 2;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);

    // Bubble Background
    roundRectPath(ctx, bubbleX, topY, bubbleW, bubbleH, 22);
    if (isWA) {
      ctx.fillStyle = isMe
        ? isDark
          ? '#005c4b'
          : '#d9fdd3'
        : isDark
          ? '#202c33'
          : '#ffffff';
      ctx.fill();
    } else {
      if (isMe) {
        const grad = ctx.createLinearGradient(
          bubbleX,
          topY,
          bubbleX + bubbleW,
          topY + bubbleH,
        );
        grad.addColorStop(0, '#6366f1');
        grad.addColorStop(0.5, '#a855f7');
        grad.addColorStop(1, '#ec4899');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = isDark ? '#262626' : '#efefef';
      }
      ctx.fill();
    }

    const btnCy = topY + bubbleH / 2 - 4;
    const fgColor = !isWA && isMe ? '#ffffff' : isDark ? '#e4e4e7' : '#27272a';

    // Sender Avatar Badge on WhatsApp voice bubble (uses actual sender's DP: Me vs Them)
    let playBtnX = bubbleX + 34;
    if (isWA) {
      const avatarCx = isMe ? bubbleX + bubbleW - 38 : bubbleX + 38;
      playBtnX = isMe ? bubbleX + 34 : bubbleX + 86;
      drawAvatar(avatarCx, btnCy, 23, senderRole);

      // Tiny mic badge on avatar
      ctx.fillStyle = '#25d366';
      ctx.beginPath();
      ctx.arc(
        isMe ? avatarCx - 15 : avatarCx + 15,
        btnCy + 15,
        8,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    } else if (!isMe) {
      // In Instagram DMs, incoming voice notes show sender's DP beside the bubble
      drawAvatar(feedX + 24, topY + bubbleH - 18, 16, 'them');
    }

    // Play / Pause Triangle or Bars
    ctx.fillStyle = fgColor;
    if (isPlayingNow) {
      ctx.fillRect(playBtnX - 7, btnCy - 10, 5, 20);
      ctx.fillRect(playBtnX + 2, btnCy - 10, 5, 20);
    } else {
      ctx.beginPath();
      ctx.moveTo(playBtnX - 6, btnCy - 11);
      ctx.lineTo(playBtnX + 11, btnCy);
      ctx.lineTo(playBtnX - 6, btnCy + 11);
      ctx.closePath();
      ctx.fill();
    }

    // Waveform Bars
    const waveStartX = playBtnX + 22;
    const waveEndX =
      isWA && isMe ? bubbleX + bubbleW - 76 : bubbleX + bubbleW - 24;
    const waveW = Math.max(90, waveEndX - waveStartX);
    const bars = state.waveformPeaks;
    const barStep = waveW / bars.length;

    bars.forEach((peak, idx) => {
      const barRatio = idx / bars.length;
      const bx = waveStartX + idx * barStep;
      const pulse = isPlayingNow ? 1 + Math.sin(t * 14 + idx * 0.7) * 0.14 : 1;
      const bh = Math.max(6, peak * 34 * pulse);
      const isPlayed = barRatio < progress;

      ctx.fillStyle = isPlayed
        ? isWA
          ? '#53bdeb'
          : '#ffffff'
        : !isWA && isMe
          ? 'rgba(255,255,255,0.4)'
          : isDark
            ? 'rgba(255,255,255,0.32)'
            : 'rgba(0,0,0,0.28)';

      roundRectPath(ctx, bx, btnCy - bh / 2, Math.max(2, barStep - 2.5), bh, 2);
      ctx.fill();
    });

    // Duration & Timestamp footer inside voice bubble
    const elapsedSec = isPlayingNow ? t - item.playStart : item.duration;
    ctx.fillStyle =
      !isWA && isMe ? 'rgba(255,255,255,0.85)' : isDark ? '#a1a1aa' : '#52525b';
    ctx.font = '500 14px Inter, "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(
      formatTime(elapsedSec) +
        ' · ' +
        (isMe ? state.myName : state.contactName),
      waveStartX,
      topY + bubbleH - 10,
      waveW * 0.58,
    );

    if (isWA) {
      ctx.textAlign = 'right';
      ctx.fillText(
        isMe ? '9:41 PM ✓✓' : '9:41 PM',
        waveEndX,
        topY + bubbleH - 10,
      );
    }

    // Optional Double-Tap Heart Reaction Pop-In halfway through the song
    const heartTriggerTime = item.playStart + item.duration * 0.45;
    if (state.heartReaction && t >= heartTriggerTime) {
      const heartAge = t - heartTriggerTime;
      const heartScale =
        heartAge < 0.25 ? Math.sin((heartAge / 0.25) * (Math.PI / 2)) * 1.2 : 1;
      const hx = isMe ? bubbleX + 26 : bubbleX + bubbleW - 26;
      const hy = topY + bubbleH + 2;

      ctx.save();
      ctx.translate(hx, hy);
      ctx.scale(heartScale, heartScale);
      ctx.fillStyle = isDark ? '#262626' : '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '18px Inter, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('❤️', 0, 1);
      ctx.restore();
    }

    ctx.restore();
  }

  // --- Canvas Geometry & Text Utilities ---
  function roundRectPath(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) {
    const radius = Math.min(r, w / 2, h / 2);
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + w, y, x + w, y + h, radius);
    context.arcTo(x + w, y + h, x, y + h, radius);
    context.arcTo(x, y + h, x, y, radius);
    context.arcTo(x, y, x + w, y, radius);
    context.closePath();
  }

  function wrapTextLines(text: string, maxWidth: number, fontStr: string) {
    ctx.save();
    ctx.font = fontStr;
    const words = text.split(/\s+/).flatMap((word) => {
      if (ctx.measureText(word).width <= maxWidth) return [word];
      const chars = Array.from(word);
      const parts: string[] = [];
      let part = '';
      for (const char of chars) {
        if (ctx.measureText(part + char).width > maxWidth) {
          parts.push(part);
          part = '';
        }
        part += char;
      }
      return [...parts, part];
    });
    const lines = [];
    let current = '';

    words.forEach((word) => {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    });
    if (current) lines.push(current);
    ctx.restore();
    return lines.length ? lines : [''];
  }

  function wrapAndDrawCenteredText(
    text: string,
    centerX: number,
    startY: number,
    maxWidth: number,
    lineHeight: number,
  ) {
    const lines = wrapTextLines(text, maxWidth, ctx.font);
    lines.slice(0, 2).forEach((line, idx) => {
      ctx.fillText(line, centerX, startY + idx * lineHeight);
    });
  }
}
