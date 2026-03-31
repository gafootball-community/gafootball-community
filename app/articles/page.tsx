export default function ArticlesPage() {
  return (
    <main className="h-[calc(100vh-80px)] p-2">
      <iframe
        src="https://gafootballcenter.com"
        className="h-full w-full rounded-2xl border border-white/10"
        loading="lazy"
        referrerPolicy="no-referrer"
        sandbox="allow-same-origin allow-scripts allow-popups"
      />
    </main>
  );
}