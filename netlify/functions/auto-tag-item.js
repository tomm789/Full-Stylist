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
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'API key not configured' }),
            };
        }

        const { imageData } = JSON.parse(event.body);
        
        if (!imageData) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing imageData' }),
            };
        }

        const prompt = `Analyze this clothing item image and extract the following information in JSON format:
{
    "category": "one of: Tops, Bottoms, Shoes, Accessories, Outerwear, Dresses",
    "primaryColor": "main color name (e.g. navy blue, red, black)",
    "style": "style descriptor (e.g. casual, formal, sporty, vintage, modern)",
    "estimatedSize": "if detectable: XS, S, M, L, XL, or null if not detectable",
    "itemType": "specific item type (e.g. t-shirt, jeans, sneakers, watch)"
}

Return ONLY valid JSON, no other text.`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            {
                                inline_data: {
                                    mime_type: "image/jpeg",
                                    data: imageData
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.3
                    }
                })
            }
        );

        const data = await response.json();
        
        if (!response.ok || data.error) {
            throw new Error(data.error?.message || 'API error');
        }

        const textResult = data.candidates[0]?.content?.parts[0]?.text;
        if (!textResult) {
            throw new Error('No response from AI');
        }

        // Parse JSON response
        let tags;
        try {
            // Clean the response (remove markdown code blocks if present)
            const cleaned = textResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            tags = JSON.parse(cleaned);
        } catch (e) {
            // Fallback parsing
            tags = {
                category: "All",
                primaryColor: "Unknown",
                style: "casual",
                estimatedSize: null,
                itemType: "clothing item"
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(tags),
        };
    } catch (error) {
        console.error('Error in auto-tag-item function:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Internal server error' }),
        };
    }
};
