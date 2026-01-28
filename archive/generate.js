exports.handler = async (event, context) => {
    // Handle CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: '',
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        // Get API key from environment variable
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'API key not configured' }),
            };
        }

        // Parse request body
        const { prompt, images, model, responseType } = JSON.parse(event.body);

        console.log(`Incoming request: model=${model}, images=${images?.length}, responseType=${responseType || 'IMAGE'}, prompt="${prompt?.substring(0, 100)}..."`);

        if (!prompt || (!images && responseType !== 'TEXT')) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields' }),
            };
        }

        // Validate and set model
        const validModels = [
            'gemini-3-pro-image-preview',
            'standard-plus',
            'gemini-2.5-flash-image'
        ];
        let modelId = model && validModels.includes(model) ? model : 'gemini-2.5-flash-image';

        if (modelId === 'standard-plus') {
            modelId = 'gemini-2.5-flash-image';
        }

        // Build request parts
        const parts = [{ text: prompt }];
        if (images && Array.isArray(images)) {
            images.forEach(b64 => {
                parts.push({
                    inline_data: {
                        mime_type: "image/jpeg",
                        data: b64
                    }
                });
            });
        }

        // Set up generation config
        const generationConfig = {
            temperature: 0.4
        };

        if (responseType === 'TEXT') {
            // Text only response
        } else {
            generationConfig.response_modalities = ["IMAGE"];
        }

        // Call Google Gemini API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{ parts }],
                    generationConfig,
                    safetySettings: [
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
                        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
                        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
                    ]
                })
            }
        );

        let data;
        try {
            data = await response.json();
        } catch (e) {
            console.error('Failed to parse Google API response as JSON:', await response.text());
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Invalid response from Google API' }),
            };
        }

        // Handle API errors
        if (!response.ok || data.error) {
            console.error('Google API Error:', JSON.stringify(data, null, 2));
            const errorMessage = data.error?.message || 'Unknown API error';
            return {
                statusCode: response.status || 500,
                headers,
                body: JSON.stringify({ error: errorMessage }),
            };
        }

        // Check for safety blocks
        if (data.promptFeedback?.blockReason) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: `Safety Block: ${data.promptFeedback.blockReason}` 
                }),
            };
        }

        // Validate response structure
        if (!data.candidates || data.candidates.length === 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'No candidates returned from API' }),
            };
        }

        const candidate = data.candidates[0];
        
        // Handle TEXT response
        if (responseType === 'TEXT') {
            const textResult = candidate.content?.parts?.[0]?.text;
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ text: textResult }),
            };
        }

        const part = candidate.content?.parts?.[0];
        if (!part) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Empty content in API response' }),
            };
        }

        // Extract image data
        const inlineData = part.inline_data || part.inlineData;
        if (!inlineData?.data) {
            // Check if it returned text instead (refusal)
            if (part.text) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: `Model Refused: "${part.text}"` }),
                };
            }
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'No image data found in API response' }),
            };
        }

        // Return successful response
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                imageData: inlineData.data
            }),
        };

    } catch (error) {
        console.error('Error in generate function:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: error.message || 'Internal server error' 
            }),
        };
    }
};

