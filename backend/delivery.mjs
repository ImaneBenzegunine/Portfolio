export async function deliverPending(store, transport, config) {
  for (const row of store.pending()) {
    const data = JSON.parse(row.payload);
    try {
      const response = await transport.sendMail({
        from: config.from,
        to: config.to,
        replyTo: data.email,
        subject: `[Portfolio] ${data.kind === "hiring" ? "Hiring opportunity" : "Project collaboration"}`,
        messageId: `<${row.id}@portfolio.local>`,
        text: Object.entries(data)
          .filter(([, v]) => v)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n\n"),
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      if (!response.accepted?.length) throw Error("No recipient accepted");
      store.sent(row.id);
    } catch {
      store.retry(row.id, Number(row.attempts) + 1);
    }
  }
}
