export async function callOpenAI(prompt, apiKey, model = "gpt-4.1-mini") {
  if (!apiKey) throw new Error("OpenAI API key missing");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "No response";
}
