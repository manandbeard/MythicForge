import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ category: string }> }
) {
  const { category } = await params;
  const dbDataPath = path.join(process.cwd(), 'data', 'cleaned', `${category}.json`);

  try {
    const fileContent = await fs.readFile(dbDataPath, 'utf8');
    const data = JSON.parse(fileContent);

    // Extract query parameters for search/filtering
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    const level = searchParams.get('level');
    const school = searchParams.get('school')?.toLowerCase();
    const sort = searchParams.get('sort');

    let results = data;
    
    if (query) {
       results = results.filter((item: any) => item.name.toLowerCase().includes(query));
    }
    
    if (level && level !== 'all') {
      results = results.filter((item: any) => item.level?.toString() === level);
    }
    
    if (school && school !== 'all') {
      results = results.filter((item: any) => item.school?.toLowerCase() === school);
    }

    if (sort === 'name_asc') {
      results.sort((a: any, b: any) => a.name.localeCompare(b.name));
    } else if (sort === 'name_desc') {
      results.sort((a: any, b: any) => b.name.localeCompare(a.name));
    } else if (sort === 'level_asc') {
      results.sort((a: any, b: any) => (parseInt(a.level) || 0) - (parseInt(b.level) || 0));
    } else if (sort === 'level_desc') {
      results.sort((a: any, b: any) => (parseInt(b.level) || 0) - (parseInt(a.level) || 0));
    }

    // Limit to 50 results unless otherwise specified
    const limitParams = searchParams.get('limit');
    let limit = 50;
    if (limitParams) {
      if (limitParams === 'all') limit = results.length;
      else limit = parseInt(limitParams, 10);
    }

    return NextResponse.json(results.slice(0, limit));
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return NextResponse.json({ error: `Category ${category} not found. Please run the ingest script.` }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to retrieve data' }, { status: 500 });
  }
}

