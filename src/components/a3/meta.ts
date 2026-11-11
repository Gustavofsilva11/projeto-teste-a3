export const pageHead = (title: string, description: string) => () => ({
  meta: [
    { title: `${title} · A3 Guardian` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} · A3 Guardian` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ],
});
