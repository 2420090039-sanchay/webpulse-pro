import * as cheerio from 'cheerio';
import crypto from 'crypto';
import { diff_match_patch } from 'diff-match-patch';
import nodemailer from 'nodemailer';
import { fetchPageWithMetrics } from '@/lib/fetch-page';

const dmp = new diff_match_patch();

export function normalizeHtmlToText(html: string): string {
  const $ = cheerio.load(html);

  $('script, style, noscript, iframe, svg, template, link[rel="stylesheet"]').remove();

  $('*').contents().each(function () {
    if (this.type === 'comment') {
      $(this).remove();
    }
  });

  let text = $('body').text() || $.text();

  text = text.replace(/\s+/g, ' ').trim();

  if (!text.length) {
    console.warn('[WebPulse:fetch] empty normalized text; using stripped HTML fallback');
    $('script, style').remove();
    text = $.root().text().replace(/\s+/g, ' ').trim();
  }

  return text;
}

export async function fetchAndNormalize(url: string): Promise<string> {
  console.log('[WebPulse:fetch] request →', url);
  const page = await fetchPageWithMetrics(url);
  if (!page.ok) {
    throw new Error(page.error ?? `HTTP ${page.statusCode} for ${url}`);
  }
  console.log('[WebPulse:fetch] response bytes=', page.html.length, 'finalUrl=', page.finalUrl);
  return normalizeHtmlToText(page.html);
}

export function hashString(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

export function computeDiff(oldText: string, newText: string): [number, string][] {
  const diffs = dmp.diff_main(oldText, newText);
  dmp.diff_cleanupSemantic(diffs);
  return diffs as [number, string][];
}

export function classifyChange(diffs: [number, string][]): 'Minor' | 'Major' | 'No Change' {
  let addedLength = 0;
  let removedLength = 0;

  for (const [operation, text] of diffs) {
    if (operation === 1) addedLength += text.length; // Added
    if (operation === -1) removedLength += text.length; // Removed
  }

  const totalChangeLength = addedLength + removedLength;

  if (totalChangeLength === 0) return 'No Change';
  if (totalChangeLength < 100) return 'Minor';
  return 'Major';
}

export async function sendEmailAlert(email: string, websiteName: string, websiteUrl: string, diffSummary: string) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP credentials not configured. Skipping email alert.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"WebPulse Alerts" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `🚨 Major Change Detected: ${websiteName}`,
    html: `
      <h2>WebPulse Alert</h2>
      <p>A major change was detected on your monitored website: <strong>${websiteName}</strong>.</p>
      <p><a href="${websiteUrl}">${websiteUrl}</a></p>
      <h3>Change Summary</h3>
      <p>Total diff fragments changed: ${diffSummary}</p>
      <hr />
      <p>Log in to your WebPulse dashboard to view the full diff report.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}
