import { aggregateDiff, type DiffTuple } from '@/lib/diff-format';

function buildRuleBasedSummary(params: {
  classification: string;
  addedPreview: string;
  removedPreview: string;
}): string {
  const { classification, addedPreview, removedPreview } = params;
  const parts: string[] = [];

  if (classification === 'Major') {
    parts.push('Substantial content update detected compared to the previous capture.');
  } else if (classification === 'Minor') {
    parts.push('A smaller copy or layout-text adjustment was detected.');
  } else {
    parts.push('Content appears materially unchanged.');
  }

  if (addedPreview.length > 0) {
    const clip = addedPreview.slice(0, 160).trim();
    parts.push(`New material includes: "${clip}${addedPreview.length > 160 ? '…' : ''}"`);
  }
  if (removedPreview.length > 0) {
    const clip = removedPreview.slice(0, 160).trim();
    parts.push(`Removed or shortened areas mention: "${clip}${removedPreview.length > 160 ? '…' : ''}"`);
  }

  return parts.join(' ');
}

async function summarizeWithOpenAI(prompt: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 220,
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content:
              'You summarize website text deltas for monitoring dashboards. Output 1–3 short sentences, plain English, no bullet symbols, no JSON.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      console.warn('[WebPulse:ai] OpenAI HTTP', res.status, await res.text().catch(() => ''));
      return null;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (e) {
    console.warn('[WebPulse:ai] OpenAI error', e);
    return null;
  }
}

/**
 * OpenAI when OPENAI_API_KEY is set; otherwise rule-based summary from diff tuples.
 */
export async function generateAISummary(diffs: DiffTuple[], classification: string): Promise<string> {
  const { added, removed } = aggregateDiff(diffs);
  const addedPreview = added.replace(/\s+/g, ' ').trim();
  const removedPreview = removed.replace(/\s+/g, ' ').trim();

  const prompt = [
    `Change level: ${classification}.`,
    addedPreview ? `Text added (truncated): ${addedPreview.slice(0, 2500)}` : 'No additions.',
    removedPreview ? `Text removed (truncated): ${removedPreview.slice(0, 2500)}` : 'No removals.',
    'Explain what likely changed for a product manager in two sentences.',
  ].join('\n\n');

  const ai = await summarizeWithOpenAI(prompt);
  if (ai) return ai;

  return buildRuleBasedSummary({
    classification,
    addedPreview,
    removedPreview,
  });
}
