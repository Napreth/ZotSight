// Copyright (C) 2026 Napreth. SPDX-License-Identifier: AGPL-3.0-or-later
export function safeFilename(title: string): string {
  const name = title.replace(/[<>:"/\\|?*\u0000-\u001f\[\]#^]/g, ' ').replace(/\s+/g,' ').trim().replace(/[. ]+$/g,'').slice(0,140).trim();
  return !name || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name) ? `文献 ${name}`.trim() : name;
}
