export async function POST(request) {
  const { messages } = await request.json();

  if (!messages?.length) {
    return Response.json({ error: "Aucun message." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_KEY;
  if (!apiKey) {
    return Response.json({ error: "Clé API manquante." }, { status: 500 });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      stream: true,
      messages: [
        { role: "system", content: "Tu es un assistant IA utile, intelligent et bienveillant. Tu réponds en français par défaut sauf si l'utilisateur écrit dans une autre langue." },
        ...messages,
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return Response.json({ error: err.error?.message || `Erreur OpenAI (${res.status})` }, { status: 500 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const json = JSON.parse(data);
              const text = json.choices?.[0]?.delta?.content;
              if (text) controller.enqueue(encoder.encode(text));
            } catch {}
          }
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`\n\nErreur: ${err.message}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
