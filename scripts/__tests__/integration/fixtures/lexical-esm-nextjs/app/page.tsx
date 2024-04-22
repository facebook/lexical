import EditorUseClient from "./EditorUseClient";

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <main>
  		<h1>Next.js Rich Text Lexical Example</h1>
      <EditorUseClient />
    </main>
  );
}
