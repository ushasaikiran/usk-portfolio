// netlify/functions/chat.js

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // Always show up in logs
  console.log("✅ chat function hit:", {
    method: event.httpMethod,
    hasBody: !!event.body,
    envKeyExists: !!process.env.OPENAI_API_KEY,
  });

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed. Use POST." }),
    };
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.log("❌ Missing OPENAI_API_KEY env var");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY in Netlify env vars." }),
      };
    }

    const { message } = JSON.parse(event.body || "{}");
    if (!message || !message.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Message is required." }),
      };
    }

    // Call OpenAI Responses API using fetch
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input: [
          { role: "system", content: "You are a friendly portfolio assistant. Keep answers short and helpful." },
          { role: "user", content: message },
        ],
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.log("❌ OpenAI request failed:", data);
      return {
        statusCode: resp.status,
        headers,
        body: JSON.stringify({ error: data?.error?.message || "OpenAI error", raw: data }),
      };
    }

    const reply = data.output_text || "Thanks! Ask me anything about my projects, skills, or resume.";
    console.log("✅ Reply generated");
    return { statusCode: 200, headers, body: JSON.stringify({ reply }) };
  } catch (err) {
    console.log("❌ Function crashed:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server error", details: String(err) }),
    };
  }
};
