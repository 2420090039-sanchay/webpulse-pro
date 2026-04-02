import {
  PDFDocument,
  type PDFPage,
  rgb,
  type PDFFont,
  StandardFonts,
} from 'pdf-lib';
import type { Website, ChangeLog } from '@prisma/client';
import {
  aggregateDiff,
  classificationToImpactLevel,
  computeImpactScore,
  formatDiffBullets,
  narrativeFromDiff,
  parseDiffTuples,
  scanStatusLabel,
} from '@/lib/diff-format';

const APP_DISPLAY = 'WebPulse Pro';
const SUBTITLE = 'Website Change Report';
const MARGIN = 48;
const CONTENT_RIGHT_PAD = 48;
const FOOTER_Y = 32;
const LINE_GRAY = rgb(0.85, 0.86, 0.88);
const TEXT = rgb(0.12, 0.13, 0.15);
const TEXT_MUTED = rgb(0.45, 0.46, 0.48);
const ACCENT = rgb(0.35, 0.38, 0.95);
const DANGER = rgb(0.86, 0.22, 0.22);
const SUCCESS = rgb(0.08, 0.62, 0.38);

type DrawCtx = {
  doc: PDFDocument;
  page: PDFPage;
  width: number;
  height: number;
  y: number;
  font: PDFFont;
  fontBold: PDFFont;
};

function wrapWords(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split(/\n/);
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) <= maxWidth) {
        line = test;
      } else {
        if (line) lines.push(line);
        if (font.widthOfTextAtSize(word, size) <= maxWidth) {
          line = word;
        } else {
          let chunk = '';
          for (const ch of word) {
            const t2 = chunk + ch;
            if (font.widthOfTextAtSize(t2, size) > maxWidth && chunk) {
              lines.push(chunk);
              chunk = ch;
            } else chunk = t2;
          }
          line = chunk;
        }
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [''];
}

function wrapUrl(url: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let chunk = '';
  for (let i = 0; i < url.length; i++) {
    const c = url[i];
    const test = chunk + c;
    if (font.widthOfTextAtSize(test, size) > maxWidth && chunk) {
      lines.push(chunk);
      chunk = c;
    } else {
      chunk = test;
    }
  }
  if (chunk) lines.push(chunk);
  return lines.length ? lines : [''];
}

function ensureSpace(ctx: DrawCtx, minBottom: number): DrawCtx {
  if (ctx.y >= minBottom) return ctx;
  ctx.page = ctx.doc.addPage([ctx.width, ctx.height]);
  ctx.y = ctx.height - MARGIN;
  return ctx;
}

function drawHr(ctx: DrawCtx): DrawCtx {
  ctx = ensureSpace(ctx, MARGIN + 40);
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y + 6 },
    end: { x: ctx.width - CONTENT_RIGHT_PAD, y: ctx.y + 6 },
    thickness: 0.6,
    color: LINE_GRAY,
  });
  ctx.y -= 20;
  return ctx;
}

function drawTextLines(
  ctx: DrawCtx,
  lines: string[],
  size: number,
  color = TEXT,
  font?: PDFFont,
  lineGap = 2
): DrawCtx {
  const f = font ?? ctx.font;
  const lh = size + lineGap;
  for (const line of lines) {
    ctx = ensureSpace(ctx, MARGIN + lh + 24);
    ctx.page.drawText(line, { x: MARGIN, y: ctx.y, size, font: f, color });
    ctx.y -= lh;
  }
  return ctx;
}

function drawSectionTitle(ctx: DrawCtx, title: string): DrawCtx {
  ctx = ensureSpace(ctx, MARGIN + 48);
  ctx.y -= 6;
  ctx.page.drawText(title.toUpperCase(), {
    x: MARGIN,
    y: ctx.y,
    size: 11,
    font: ctx.fontBold,
    color: ACCENT,
  });
  ctx.y -= 22;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y + 14 },
    end: { x: MARGIN + 140, y: ctx.y + 14 },
    thickness: 2,
    color: ACCENT,
  });
  ctx.y -= 18;
  return ctx;
}

function drawKeyValueBlock(
  ctx: DrawCtx,
  rows: { label: string; value: string }[]
): DrawCtx {
  const labelW = 118;
  const valX = MARGIN + labelW;
  const maxW = ctx.width - CONTENT_RIGHT_PAD - valX;
  for (const row of rows) {
    ctx = ensureSpace(ctx, MARGIN + 52);
    ctx.page.drawText(row.label, {
      x: MARGIN,
      y: ctx.y,
      size: 10,
      font: ctx.fontBold,
      color: TEXT_MUTED,
    });
    const valueLines =
      row.label.toLowerCase().includes('url')
        ? wrapUrl(row.value, ctx.font, 10, maxW)
        : wrapWords(row.value, ctx.font, 10, maxW);
    let first = true;
    for (const vl of valueLines) {
      ctx = ensureSpace(ctx, MARGIN + 28);
      ctx.page.drawText(vl, {
        x: first ? valX : valX,
        y: ctx.y,
        size: 10,
        font: ctx.font,
        color: TEXT,
      });
      ctx.y -= 14;
      first = false;
    }
    ctx.y -= 6;
  }
  return ctx;
}

function drawMetricsRow(
  ctx: DrawCtx,
  metrics: { label: string; value: string }[]
): DrawCtx {
  const n = metrics.length;
  const totalW = ctx.width - MARGIN - CONTENT_RIGHT_PAD;
  const colW = totalW / n;
  ctx = ensureSpace(ctx, MARGIN + 72);
  const top = ctx.y;

  metrics.forEach((m, i) => {
    const x = MARGIN + i * colW;
    ctx.page.drawRectangle({
      x: x + 2,
      y: top - 58,
      width: colW - 6,
      height: 56,
      borderColor: LINE_GRAY,
      borderWidth: 0.8,
      color: rgb(0.97, 0.97, 0.99),
    });
    ctx.page.drawText(m.label.toUpperCase(), {
      x: x + 10,
      y: top - 14,
      size: 7,
      font: ctx.fontBold,
      color: TEXT_MUTED,
    });
    ctx.page.drawText(m.value, {
      x: x + 10,
      y: top - 36,
      size: 13,
      font: ctx.fontBold,
      color: TEXT,
    });
  });
  ctx.y = top - 72;
  return ctx;
}

function drawFooterOnAllPages(doc: PDFDocument, font: PDFFont) {
  const pages = doc.getPages();
  const n = pages.length;
  pages.forEach((page, i) => {
    const { width } = page.getSize();
    const msg = `${APP_DISPLAY}  ·  Confidential Report  ·  Page ${i + 1} of ${n}`;
    const tw = font.widthOfTextAtSize(msg, 8);
    page.drawText(msg, {
      x: (width - tw) / 2,
      y: FOOTER_Y,
      size: 8,
      font,
      color: TEXT_MUTED,
    });
  });
}

type KeywordSignalsPdf = {
  appeared: string[];
  disappeared: string[];
  contextChanged: { term: string; note: string }[];
};

export async function buildWebPulseReportPdf(params: {
  website: Website;
  snapshotCount: number;
  changeLogCount: number;
  logsDesc: ChangeLog[];
  uptimePercent: number;
  trackedKeywords: string[];
  latestSnapshotMeta: {
    screenshotPath: string | null;
    httpStatus: number | null;
    responseTimeMs: number | null;
  } | null;
}): Promise<Uint8Array> {
  const {
    website,
    snapshotCount,
    changeLogCount,
    logsDesc,
    uptimePercent,
    trackedKeywords,
    latestSnapshotMeta,
  } = params;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const first = doc.addPage();
  const { width, height } = first.getSize();

  let ctx: DrawCtx = {
    doc,
    page: first,
    width,
    height,
    y: height - MARGIN,
    font,
    fontBold,
  };

  const headerBandH = 78;
  ctx.page.drawRectangle({
    x: 0,
    y: ctx.height - headerBandH,
    width: ctx.width,
    height: headerBandH,
    color: rgb(0.94, 0.94, 0.98),
  });
  ctx.page.drawRectangle({
    x: 0,
    y: ctx.height - 3,
    width: ctx.width,
    height: 3,
    color: ACCENT,
  });

  ctx.page.drawText(APP_DISPLAY, {
    x: MARGIN,
    y: ctx.height - MARGIN - 6,
    size: 22,
    font: fontBold,
    color: TEXT,
  });
  ctx.page.drawText(SUBTITLE.toUpperCase(), {
    x: MARGIN,
    y: ctx.height - MARGIN - 34,
    size: 10,
    font: fontBold,
    color: TEXT_MUTED,
  });
  const generated = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date());
  ctx.page.drawText(`Generated ${generated}`, {
    x: MARGIN,
    y: ctx.height - MARGIN - 54,
    size: 9,
    font: font,
    color: TEXT_MUTED,
  });

  ctx.y = ctx.height - headerBandH - MARGIN;

  ctx = drawSectionTitle(ctx, 'Monitor overview');
  ctx = drawKeyValueBlock(ctx, [
    { label: 'Website name', value: website.name },
    { label: 'URL monitored', value: website.url },
    {
      label: 'Last scanned',
      value: website.lastChecked
        ? new Intl.DateTimeFormat('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(website.lastChecked)
        : 'Not yet scanned',
    },
    { label: 'Total scans (snapshots)', value: String(snapshotCount) },
    {
      label: 'Uptime (last 100 checks)',
      value: `${uptimePercent}% pages reachable`,
    },
    {
      label: 'Keywords tracked',
      value:
        trackedKeywords.length > 0 ? trackedKeywords.join(', ') : 'None configured',
    },
    {
      label: 'Latest HTTP / latency',
      value: latestSnapshotMeta
        ? `${latestSnapshotMeta.httpStatus ?? '—'} · ${latestSnapshotMeta.responseTimeMs ?? '—'} ms`
        : '—',
    },
    {
      label: 'Latest screenshot',
      value: latestSnapshotMeta?.screenshotPath
        ? latestSnapshotMeta.screenshotPath
        : 'Not captured (disabled or pending)',
    },
  ]);

  ctx = drawHr(ctx);

  const latest = logsDesc[0];
  const latestDiffs = latest ? parseDiffTuples(latest.diffResult) : [];
  const agg = aggregateDiff(latestDiffs);
  const impactScore = latest ? computeImpactScore(latestDiffs) : 0;
  const impactLevel = classificationToImpactLevel(
    latest?.classification ?? website.status
  );
  const changed = scanStatusLabel(website.status, logsDesc.length > 0);

  ctx = drawSectionTitle(ctx, 'Scan status');
  ctx = drawKeyValueBlock(ctx, [
    {
      label: 'Status',
      value: changed === 'CHANGED' ? 'CHANGED' : 'NO CHANGE',
    },
    {
      label: 'Description',
      value:
        changed === 'CHANGED'
          ? 'Content has been updated compared to the baseline or previous version.'
          : 'No substantive content delta detected on the latest scan.',
    },
    {
      label: 'Impact level',
      value: impactLevel,
    },
  ]);

  ctx = drawHr(ctx);

  ctx = drawSectionTitle(ctx, 'Metrics summary');
  ctx = drawMetricsRow(ctx, [
    { label: 'Impact score', value: String(impactScore) },
    { label: 'Total scans', value: String(snapshotCount) },
    { label: 'Total changes', value: String(changeLogCount) },
    { label: 'Added', value: String(agg.addedLen) },
    { label: 'Removed', value: String(agg.removedLen) },
  ]);

  ctx = drawHr(ctx);

  ctx = drawSectionTitle(ctx, 'AI-generated summary');
  const narrative = narrativeFromDiff(
    latest?.classification ?? website.status,
    agg.addedLen,
    agg.removedLen
  );
  const aiPrimary =
    latest?.aiSummary?.trim() ||
    narrative;
  ctx = drawTextLines(
    ctx,
    wrapWords(aiPrimary, font, 11, ctx.width - MARGIN - CONTENT_RIGHT_PAD),
    11
  );

  let ks: KeywordSignalsPdf | null = null;
  if (latest?.keywordSignalsJson) {
    try {
      ks = JSON.parse(latest.keywordSignalsJson) as KeywordSignalsPdf;
    } catch {
      ks = null;
    }
  }

  if (ks && (ks.appeared.length || ks.disappeared.length || ks.contextChanged.length)) {
    ctx = drawHr(ctx);
    ctx = drawSectionTitle(ctx, 'Keyword tracking');
    const lines: string[] = [];
    if (ks.appeared.length)
      lines.push(`Appeared: ${ks.appeared.join('; ')}`);
    if (ks.disappeared.length)
      lines.push(`Disappeared: ${ks.disappeared.join('; ')}`);
    for (const c of ks.contextChanged) {
      lines.push(`Context shift (“${c.term}”): ${c.note}`);
    }
    ctx = drawTextLines(
      ctx,
      wrapWords(lines.join(' '), font, 10, ctx.width - MARGIN - CONTENT_RIGHT_PAD),
      10
    );
  }

  ctx = drawHr(ctx);

  ctx = drawSectionTitle(ctx, 'Detected differences');
  const bullets = formatDiffBullets(latestDiffs, 620);
  ctx.page.drawText('Added content', {
    x: MARGIN,
    y: ctx.y,
    size: 10,
    font: fontBold,
    color: SUCCESS,
  });
  ctx.y -= 16;
  for (const line of wrapWords(bullets.addedLines.join(' '), font, 10, ctx.width - MARGIN - CONTENT_RIGHT_PAD)) {
    ctx = ensureSpace(ctx, MARGIN + 24);
    ctx.page.drawText(`Added: "${line}"`, {
      x: MARGIN,
      y: ctx.y,
      size: 10,
      font,
      color: TEXT,
    });
    ctx.y -= 14;
  }
  ctx.y -= 8;
  ctx.page.drawText('Removed content', {
    x: MARGIN,
    y: ctx.y,
    size: 10,
    font: fontBold,
    color: DANGER,
  });
  ctx.y -= 16;
  for (const line of wrapWords(
    bullets.removedLines.join(' '),
    font,
    10,
    ctx.width - MARGIN - CONTENT_RIGHT_PAD
  )) {
    ctx = ensureSpace(ctx, MARGIN + 24);
    ctx.page.drawText(`Removed: "${line}"`, {
      x: MARGIN,
      y: ctx.y,
      size: 10,
      font,
      color: TEXT,
    });
    ctx.y -= 14;
  }

  ctx = drawHr(ctx);

  ctx = drawSectionTitle(ctx, 'Scan history');
  const colTs = MARGIN;
  const colSt = MARGIN + 108;
  const colCh = MARGIN + 188;
  const colIm = MARGIN + 248;
  const colSum = MARGIN + 310;
  const histRows: { ts: string; st: string; ch: string; im: string; sum: string }[] = [];

  for (let i = logsDesc.length - 1; i >= 0; i--) {
    const log = logsDesc[i]!;
    const diffs = parseDiffTuples(log.diffResult);
    const a = aggregateDiff(diffs);
    const fragments = a.addedFragments + a.removedFragments;
    const sumText =
      log.aiSummary?.trim().slice(0, 120) ||
      (log.classification === 'No Change'
        ? 'No content delta'
        : `Content updated (${log.classification})`);
    histRows.push({
      ts: new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(log.timestamp),
      st: log.classification === 'No Change' ? 'No Change' : 'Changed',
      ch: String(fragments),
      im: classificationToImpactLevel(log.classification),
      sum: sumText + (log.aiSummary && log.aiSummary.length > 120 ? '…' : ''),
    });
  }

  if (snapshotCount > 0 && histRows.length === 0) {
    histRows.push({
      ts: new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(website.createdAt),
      st: 'No Change',
      ch: '0',
      im: 'NONE',
      sum: 'Initial baseline — no deltas yet',
    });
  }

  ctx = ensureSpace(ctx, MARGIN + 60);
  const headerY = ctx.y;
  ctx.page.drawText('Timestamp', { x: colTs, y: headerY, size: 8, font: fontBold, color: TEXT_MUTED });
  ctx.page.drawText('Status', { x: colSt, y: headerY, size: 8, font: fontBold, color: TEXT_MUTED });
  ctx.page.drawText('Changes', { x: colCh, y: headerY, size: 8, font: fontBold, color: TEXT_MUTED });
  ctx.page.drawText('Impact', { x: colIm, y: headerY, size: 8, font: fontBold, color: TEXT_MUTED });
  ctx.page.drawText('Summary', { x: colSum, y: headerY, size: 8, font: fontBold, color: TEXT_MUTED });
  ctx.y = headerY - 18;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y + 8 },
    end: { x: ctx.width - CONTENT_RIGHT_PAD, y: ctx.y + 8 },
    thickness: 0.5,
    color: LINE_GRAY,
  });
  ctx.y -= 8;

  for (const row of histRows) {
    ctx = ensureSpace(ctx, MARGIN + 44);
    ctx.page.drawText(row.ts, { x: colTs, y: ctx.y, size: 8, font, color: TEXT });
    ctx.page.drawText(row.st, { x: colSt, y: ctx.y, size: 8, font, color: TEXT });
    ctx.page.drawText(row.ch, { x: colCh, y: ctx.y, size: 8, font, color: TEXT });
    ctx.page.drawText(row.im, { x: colIm, y: ctx.y, size: 8, font, color: TEXT });
    const sumLines = wrapWords(row.sum, font, 8, ctx.width - colSum - CONTENT_RIGHT_PAD);
    let sy = ctx.y;
    for (const sl of sumLines) {
      ctx = ensureSpace(ctx, MARGIN + 20);
      ctx.page.drawText(sl, { x: colSum, y: sy, size: 8, font, color: TEXT });
      sy -= 11;
    }
    ctx.y = sy - 10;
  }

  drawFooterOnAllPages(doc, font);
  return doc.save();
}
