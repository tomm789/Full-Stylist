export interface LogClientMetricBody {
  name: string;
  durationMs: number;
  meta?: Record<string, unknown>;
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const handler = async (event: { httpMethod: string; body?: string }) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body ?? '{}') as LogClientMetricBody;
    const { name, durationMs, meta } = body;
    const payload = { name, durationMs, ...(meta != null && Object.keys(meta).length > 0 ? { meta } : {}) };
    console.log('CLIENT_METRIC', JSON.stringify(payload));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true }),
    };
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Bad request' }),
    };
  }
};
