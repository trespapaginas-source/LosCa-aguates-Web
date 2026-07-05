// Cloudflare Pages Function proxy to retrieve Google Calendar ICS
// Maps automatically to: /api/calendar-proxy

export async function onRequest(context) {
  const calendarUrl = 'https://calendar.google.com/calendar/ical/canaguates228%40gmail.com/public/basic.ics';

  try {
    const response = await fetch(calendarUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LosCanaquates/1.0)',
      },
      // Cloudflare edge caching: cache the calendar ICS for 2 minutes to keep it fast
      cf: {
        cacheEverything: true,
        cacheTtl: 120,
      }
    });

    if (!response.ok) {
      return new Response(`Error fetching calendar: ${response.status}`, { 
        status: response.status,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    const icsText = await response.text();

    return new Response(icsText, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=120', // Client browser cache 2 minutes
      },
    });
  } catch (error) {
    return new Response(`Proxy Error: ${error.message}`, { 
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}
