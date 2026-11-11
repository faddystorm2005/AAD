import { Fragment } from 'react';

/**
 * Renders portal text with the owner's line breaks kept. Text without a
 * line break renders as the same single text node it always was, so the
 * baked-in copy produces identical markup.
 */
export default function TextLines({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  if (lines.length === 1) return <>{text}</>;
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line}
        </Fragment>
      ))}
    </>
  );
}
