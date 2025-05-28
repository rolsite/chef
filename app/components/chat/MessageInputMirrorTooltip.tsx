import React, { useEffect, useRef } from 'react';

interface Highlight {
  word: string;
  tooltip: string;
}

interface Tooltip {
  text: string;
  x: number;
  y: number;
}

interface MessageInputMirrorTooltipProps {
  value: string;
  highlights: Highlight[];
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  setTooltip: (t: Tooltip | null) => void;
  minHeight?: number;
  maxHeight?: number;
}

const MessageInputMirrorTooltip: React.FC<MessageInputMirrorTooltipProps> = ({
  value,
  highlights,
  textareaRef,
  setTooltip,
  minHeight = 100,
  maxHeight = 400,
}) => {
  const mirrorRef = useRef<HTMLDivElement>(null);

  // Render highlighted words as a single span
  const mirrorContent = [];
  let i = 0;
  while (i < value.length) {
    // Check if a highlight starts at this position
    let found = null;
    for (const h of highlights) {
      if (value.substring(i, i + h.word.length).toLowerCase() === h.word.toLowerCase()) {
        found = h;
        break;
      }
    }
    if (found) {
      mirrorContent.push(
        <span
          key={i}
          data-highlight={found.word}
          style={{
            background: '#fef08a',
            color: 'transparent',
            whiteSpace: 'pre',
          }}
        >
          {value.substring(i, i + found.word.length).replace(/ /g, '\u00A0')}
        </span>,
      );
      i += found.word.length;
    } else {
      const ch = value[i];
      if (ch === '\n') {
        mirrorContent.push(<br key={i} />);
      } else {
        mirrorContent.push(
          <span
            key={i}
            style={{
              color: 'transparent',
              whiteSpace: ch === ' ' ? 'pre' : undefined,
            }}
          >
            {ch === ' ' ? '\u00A0' : ch}
          </span>,
        );
      }
      i++;
    }
  }

  // Scroll sync: when textarea scrolls, mirror scrolls
  useEffect(() => {
    const textarea = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!textarea || !mirror) {
      return undefined;
    }
    function onScroll() {
      if (mirror && textarea) {
        mirror.scrollTop = textarea.scrollTop;
        mirror.scrollLeft = textarea.scrollLeft;
      }
    }
    textarea.addEventListener('scroll', onScroll);
    return () => {
      textarea.removeEventListener('scroll', onScroll);
    };
  }, [textareaRef]);

  // Mouse move handler: show tooltip under the whole highlighted word
  useEffect(() => {
    const textarea = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!textarea || !mirror) {
      return undefined;
    }
    function onMouseMove(e: MouseEvent) {
      if (!mirror) {
        return;
      }
      // Find the highlighted span under the mouse
      const spans = Array.from(mirror.querySelectorAll('span[data-highlight]')) as HTMLSpanElement[];
      for (const span of spans) {
        const spanRect = span.getBoundingClientRect();
        if (
          e.clientX >= spanRect.left &&
          e.clientX <= spanRect.right &&
          e.clientY >= spanRect.top &&
          e.clientY <= spanRect.bottom
        ) {
          const word = span.getAttribute('data-highlight');
          const highlight = highlights.find((h) => h.word.toLowerCase() === word?.toLowerCase());
          if (highlight && mirror.parentElement) {
            const parentRect = mirror.parentElement.getBoundingClientRect();
            setTooltip({
              text: highlight.tooltip,
              x: spanRect.left - parentRect.left,
              y: spanRect.bottom - parentRect.top + 10,
            });
            return;
          }
        }
      }
      setTooltip(null);
    }
    textarea.addEventListener('mousemove', onMouseMove);
    textarea.addEventListener('mouseleave', () => setTooltip(null));
    return () => {
      textarea.removeEventListener('mousemove', onMouseMove);
      textarea.removeEventListener('mouseleave', () => setTooltip(null));
    };
  }, [value, highlights, textareaRef, setTooltip]);

  // Mirror style: match textarea (proportional font)
  const mirrorStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    minHeight,
    maxHeight,
    fontFamily: 'inherit', // match textarea
    fontSize: '1rem',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    color: 'transparent',
    pointerEvents: 'none',
    zIndex: 3,
    padding: '8px 12px',
    overflow: 'hidden',
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div ref={mirrorRef} style={mirrorStyle} aria-hidden>
        {mirrorContent}
      </div>
    </div>
  );
};

export default MessageInputMirrorTooltip;
