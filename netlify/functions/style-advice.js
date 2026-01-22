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

        const { context, selectedItems, allWardrobe } = JSON.parse(event.body);
        
        let prompt = '';
        if (context === 'selected' && selectedItems.length > 0) {
            prompt = `You are a professional fashion stylist. The user has selected these items from their wardrobe:
${selectedItems.map((item, idx) => `${idx + 1}. ${item.title} (${item.category}, ${item.style || 'casual'})`).join('\n')}

Available wardrobe items:
${allWardrobe.map((item, idx) => `${idx + 1}. ${item.title} (${item.category}, ${item.style || 'casual'}, ${item.primaryColor || 'various'})`).join('\n')}

Provide:
1. Styling advice for combining the selected items
2. Suggest 3-5 additional items from the available wardrobe that would complement the selected items
3. Give specific pairing recommendations

Format your response as JSON:
{
    "advice": "your styling advice text here",
    "suggestedItems": [array of item IDs from the available wardrobe that would pair well]
}`;
        } else {
            prompt = `You are a professional fashion stylist. Analyze the user's wardrobe and provide:
1. General styling tips based on their collection
2. Suggestions for items that might be missing
3. Recommendations for creating versatile outfits

Available wardrobe items:
${allWardrobe.map((item, idx) => `${idx + 1}. ${item.title} (${item.category}, ${item.style || 'casual'}, ${item.primaryColor || 'various'})`).join('\n')}

Format your response as JSON:
{
    "advice": "your styling advice text here",
    "suggestedItems": []
}`;
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7
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
        let advice;
        try {
            const cleaned = textResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            advice = JSON.parse(cleaned);
        } catch (e) {
            // Fallback
            advice = {
                advice: textResult.substring(0, 500),
                suggestedItems: []
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(advice),
        };
    } catch (error) {
        console.error('Error in style-advice function:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Internal server error' }),
        };
    }
};
