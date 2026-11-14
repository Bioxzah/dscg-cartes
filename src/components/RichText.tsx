import { parseBold } from '../cards/richText.ts';

export function RichText({ text }: { text: string }) {
  return (
    <>
      {parseBold(text).map((s, i) => (s.bold ? <strong key={i}>{s.text}</strong> : <span key={i}>{s.text}</span>))}
    </>
  );
}
