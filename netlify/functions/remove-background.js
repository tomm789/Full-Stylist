const fetch = require('node-fetch');

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
        const { imageData } = JSON.parse(event.body);
        
        if (!imageData) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing imageData' }),
            };
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'API key not configured' }),
            };
        }

        // Use gemini-2.5-flash-image for background removal (fast and cheap)
        const modelId = 'gemini-2.5-flash-image';
        const prompt = "Remove the background from this image. Keep ONLY the main clothing item. Output a professional product shot with a pure white background.";

        const parts = [
            { text: prompt },
            {
                inline_data: {
                    mime_type: "image/jpeg",
                    data: imageData
                }
            }
        ];

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{ parts }],
                    generationConfig: {
                        response_modalities: ["IMAGE"],
                        temperature: 0.4
                    },
                    safetySettings: [
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
                        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
                        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
                    ]
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Extract image data
        const part = data.candidates?.[0]?.content?.parts?.[0];
        const resultB64 = part?.inline_data?.data || part?.inlineData?.data;

        if (!resultB64) {
            throw new Error('No image data returned from Gemini');
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                imageData: resultB64
            }),
        };
    } catch (error) {
        console.error('Error in remove-background function:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Internal server error' }),
        };
    }
};
