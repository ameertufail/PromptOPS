import { API_HEALTH_PATH } from "@promptops/shared";

export default function HomePage() {
  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem", lineHeight: 1.5 }}>
      <h1>PromptOps Studio</h1>
      <p>Monorepo scaffold complete for frontend boundaries.</p>
      <p>
        Shared contract example: <code>{API_HEALTH_PATH}</code>
      </p>
    </main>
  );
}
