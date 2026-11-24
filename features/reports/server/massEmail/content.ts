/**
 * Mass email content: sanitize the composed HTML, produce the plain-text
 * version, and wrap both with the compliance footer (unsubscribe link and
 * mailing address). Pure functions — no I/O.
 */
import sanitizeHtml from "sanitize-html";
import { convert } from "html-to-text";

export const MAILING_ADDRESS = "The Rivers Lodge & Hunt Club · 18103 E 2300 Ln, La Cygne, KS 66040";

/** What the composer may produce. Anything else is stripped. */
const ALLOWED: sanitizeHtml.IOptions = {
  allowedTags: ["h1", "h2", "h3", "p", "br", "strong", "b", "em", "i", "u", "s", "a", "img", "ul", "ol", "li", "blockquote", "hr"],
  allowedAttributes: { a: ["href", "title"], img: ["src", "alt", "width", "height"] },
  // Applies to absolute URLs; site-relative paths (e.g. /manus-storage/…) are
  // kept and made absolute at send time.
  allowedSchemes: ["https", "http", "mailto", "tel"],
  allowedSchemesByTag: { img: ["https", "http"] },
  allowProtocolRelative: false,
};

/** Strip anything that isn't simple formatted content (scripts, styles, event handlers, iframes…). */
export function sanitizeBodyHtml(html: string): string {
  return sanitizeHtml(html ?? "", ALLOWED).trim();
}

/** Turn site-relative links and image sources into absolute URLs for the inbox. */
export function absolutizeUrls(html: string, siteUrl: string): string {
  const base = siteUrl.replace(/\/+$/, "");
  return html.replace(/\s(src|href)="(\/(?!\/)[^"]*)"/g, (_m, attr, path) => ` ${attr}="${base}${path}"`);
}

/** Plain-text version of an HTML body (links shown as "text [url]"). */
export function htmlToPlainText(html: string): string {
  return convert(html ?? "", {
    wordwrap: 78,
    selectors: [
      { selector: "a", options: { hideLinkHrefIfSameAsText: true, linkBrackets: ["[", "]"] } },
      { selector: "img", format: "skip" },
      { selector: "h1", options: { uppercase: false } },
      { selector: "h2", options: { uppercase: false } },
      { selector: "h3", options: { uppercase: false } },
    ],
  }).trim();
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Final email for one recipient: the sanitized body (absolute URLs) in a
 * simple branded layout, plus the footer. `unsubscribeUrl` is personal.
 */
export function renderEmail(opts: { bodyHtml: string; siteUrl: string; unsubscribeUrl: string; preheader?: string }): { html: string; text: string } {
  const body = absolutizeUrls(sanitizeBodyHtml(opts.bodyHtml), opts.siteUrl)
    // Inline styles (many email apps ignore <style>): fit images, brand links.
    .replace(/<img /g, '<img style="max-width:100%;height:auto;display:block;" ')
    .replace(/<a /g, '<a style="color:#9B4D19;" target="_blank" ');
  const unsub = esc(opts.unsubscribeUrl);
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title></title></head>
<body style="margin:0;padding:0;background:#f4f1ea;">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${esc(opts.preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e3ddd0;">
<tr><td style="padding:20px 28px;border-bottom:1px solid #e3ddd0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#9B4D19;font-weight:bold;">The Rivers Lodge &amp; Hunt Club</td></tr>
<tr><td class="body" style="padding:24px 28px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:#2B2823;">
${body}
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #e3ddd0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#6b665c;">
${esc(MAILING_ADDRESS)}<br>
You're receiving this because you're a member or guest of The Rivers Lodge &amp; Hunt Club.
<a href="${unsub}" style="color:#6b665c;text-decoration:underline;">Unsubscribe</a>
</td></tr>
</table></td></tr></table>
</body></html>`;
  const text = `${htmlToPlainText(body)}

--
${MAILING_ADDRESS}
Unsubscribe: ${opts.unsubscribeUrl}`;
  return { html, text };
}
