const toDate = (d: Date | string) => (typeof d === "string" ? new Date(d) : d);

export const fmtDate = (d: Date | string) =>
  toDate(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export const fmtTime = (d: Date | string) =>
  toDate(d).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

export const fmtDateTime = (d: Date | string) =>
  `${fmtDate(d)} ${fmtTime(d)}`;

export const fmtMonthYear = (d: Date | string) =>
  toDate(d).toLocaleDateString("fr-FR", { year: "numeric", month: "long" });

export const routeArrow = (lang: "ar" | "fr") =>
  lang === "ar" ? "←" : "→";