import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stringifyKeywords, parseKeywordsJson } from '@/lib/keywords';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { name, keywords } = body;

    const existing = await prisma.website.findFirst({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const data: { name?: string; keywordsJson?: string } = {};
    if (typeof name === 'string' && name.trim()) data.name = name.trim();
    if (keywords !== undefined) {
      data.keywordsJson = stringifyKeywords(
        Array.isArray(keywords) ? keywords.map((k: unknown) => String(k)) : []
      );
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
    }

    const updated = await prisma.website.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      website: {
        ...updated,
        _id: updated.id,
        keywords: parseKeywordsJson(updated.keywordsJson),
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
