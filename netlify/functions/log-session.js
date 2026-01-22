exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const { userName, action, details, timestamp } = JSON.parse(event.body);
        
        // In a real production app, we would write this to a database like Supabase or MongoDB.
        // For Netlify Functions, we'll log it to stdout which is visible in the Netlify function logs.
        console.log(`[SESSION LOG] ${timestamp} | User: ${userName} | Action: ${action} | Details:`, JSON.stringify(details));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true }),
        };
    } catch (error) {
        console.error('Error logging session:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
