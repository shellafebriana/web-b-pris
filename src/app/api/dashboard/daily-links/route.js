import { getDailyLinks } from '@/lib/prisma-queries';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return Response.json(
        { error: 'startDate dan endDate required' },
        { status: 400 }
      );
    }

    const data = await getDailyLinks(startDate, endDate);

    return Response.json({ 
      success: true,
      data,
      dateRange: { startDate, endDate }
    });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}