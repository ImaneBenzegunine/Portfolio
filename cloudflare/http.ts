export function json(
  body: unknown,
  status = 200,
  extra: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      ...extra,
    },
  });
}

export const unavailable = () =>
  json(
    {
      message:
        "The contact form is temporarily unavailable. Please use LinkedIn.",
    },
    503,
  );

export async function readJson(request: Request) {
  const max = 16 * 1024;
  if (Number(request.headers.get("Content-Length")) > max)
    return { error: json({ message: "Message is too large." }, 413) };
  const reader = request.body?.getReader();
  if (!reader) return { error: json({ message: "Send a JSON object." }, 400) };
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        return { error: json({ message: "Message is too large." }, 413) };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return {
      data: JSON.parse(
        new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(
          bytes,
        ),
      ),
    };
  } catch {
    return { error: json({ message: "Send valid JSON content." }, 400) };
  } finally {
    reader.releaseLock();
  }
}
