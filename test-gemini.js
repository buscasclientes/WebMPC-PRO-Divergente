const apiKey = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY';
const model = 'gemini-2.5-flash';

console.log('--- Testing Gemini API key ---');
console.log('Sending request to Gemini model:', model);

async function testGemini() {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: 'Hola! Confirma si recibes este mensaje correctamente.' }]
          }],
          generationConfig: { maxOutputTokens: 100 }
        })
      }
    );

    console.log('HTTP Status Code:', response.status);

    const data = await response.json();
    if (!response.ok) {
      console.error('Error from Gemini API:', JSON.stringify(data, null, 2));
      process.exit(1);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('\n--- Gemini Response ---');
    console.log(text);
    console.log('-----------------------\n');
    console.log('Success! The API key is active and functioning correctly.');
  } catch (err) {
    console.error('Request failed:', err.message);
    process.exit(1);
  }
}

testGemini();
