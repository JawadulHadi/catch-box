/** How long ago something happened, in plain words. */
export function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

/** Date in DD/MM/YYYY. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

/** Shorten a long web address so it still reads nicely in a list. */
export function shortUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.length > 40 ? `${parsed.pathname.slice(0, 40)}…` : parsed.pathname;
    return `${parsed.host}${path}`;
  } catch {
    return url;
  }
}

function escapeCsv(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  // Scraped text comes from other people's pages. A cell starting with = + @ (or a
  // dash not followed by a number) runs as a formula in Excel/Sheets, so defuse it.
  if (/^[=+@\t\r]|^-(?![\d.,])/.test(text)) text = `'${text}`;
  return /[",\r\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Build a CSV file from rows with a shared set of columns. */
export function toCsv(rows: Array<Record<string, unknown>>, columns: string[]): string {
  const lines = [columns.map(escapeCsv).join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => escapeCsv(row[column])).join(","));
  }
  return lines.join("\n");
}

/** Trigger a browser download of text content. */
export function downloadTextFile(filename: string, content: string, mime = "text/csv"): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  // Revoking in the same tick can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
