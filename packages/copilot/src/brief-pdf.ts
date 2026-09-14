export function renderBriefPdf(title: string, markdown: string): Uint8Array {
  const lines = [`${title}`, "", ...wrapText(stripMarkdown(markdown), 86)];
  const content = buildPageStream(lines.slice(0, 48));
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n",
    `4 0 obj << /Length ${content.length} >> stream\n${content}endstream\nendobj\n`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Courier >> endobj\n",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(body.length);
    body += obj;
  }
  const xrefAt = body.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += xref;
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return new TextEncoder().encode(body);
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\[news:[0-9a-f-]{36}\]/gi, "[news]")
    .replace(/\[des:([A-Z0-9.]+)\]/g, "$1")
    .replace(/[#*_`]/g, "")
    .replace(/\r\n/g, "\n");
}

function wrapText(text: string, width: number): string[] {
  const out: string[] = [];
  for (const raw of text.split("\n")) {
    if (raw.length === 0) {
      out.push("");
      continue;
    }
    let rest = raw;
    while (rest.length > width) {
      const slice = rest.slice(0, width);
      const breakAt = slice.lastIndexOf(" ");
      const take = breakAt > 40 ? breakAt : width;
      out.push(rest.slice(0, take));
      rest = rest.slice(take).trimStart();
    }
    out.push(rest);
  }
  return out;
}

function pdfEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPageStream(lines: string[]): string {
  const cmds = ["BT", "/F1 10 Tf", "50 760 Td", "12 TL"];
  for (const line of lines) {
    cmds.push(`(${pdfEscape(line)}) Tj`, "T*");
  }
  cmds.push("ET", "");
  return cmds.join("\n");
}
