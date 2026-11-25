import { MessageCircle, Mic } from 'lucide-react';
import { formatTime, type Schedule } from '../../engines/timeline/schedule';
import { Wave } from '../../components/ui/controls';

export function Timeline({
  score,
  time,
  seek,
  selected,
  select,
  peaks,
}: {
  score: Schedule;
  time: number;
  seek: (t: number) => void;
  selected: string;
  select: (id: string) => void;
  peaks: number[];
}) {
  const pct = (t: number) => (100 * t) / score.total + '%';
  const tickSize = score.total < 32 ? 2 : score.total < 80 ? 5 : 30;
  const ticks = Array.from(
    { length: Math.ceil(score.total / tickSize) },
    (_, i) => i * tickSize,
  ).filter((t) => t === 0 || t / score.total < 0.96);
  return (
    <section className="timeline" aria-label="Timeline">
      <div className="timeline-head">
        <h2>Timeline</h2>
        <code>
          {formatTime(time)} <span>/</span> {formatTime(score.total)}
        </code>
      </div>
      <div className="timeline-grid">
        <div className="track-labels">
          <span />
          <span>
            <MessageCircle size={15} />
            <span>Chat</span>
          </span>
          <span>
            <Mic size={15} />
            <span>Audio</span>
          </span>
        </div>
        <div className="tracks">
          <div className="ruler">
            {ticks.map((t) => (
              <span key={t} style={{ left: pct(t) }}>
                {formatTime(t)}
              </span>
            ))}
          </div>
          <input
            className="seek"
            type="range"
            aria-label="Timeline playhead"
            min={0}
            max={score.total}
            step={0.01}
            value={time}
            onChange={(e) => seek(Number(e.target.value))}
          />
          <div className="track messages-track">
            {score.items
              .filter((item) => item.type === 'text')
              .map((item) => (
                <button
                  key={item.id}
                  className={
                    'timeline-message ' + (selected === item.id ? 'active' : '')
                  }
                  title={item.text}
                  style={{
                    left: pct(item.appearAt),
                    width: pct(Math.min(1.12, score.total - item.appearAt)),
                  }}
                  onClick={() => {
                    select(item.id);
                    seek(item.appearAt + 0.21);
                  }}
                >
                  <MessageCircle size={12} />
                  <span>{item.text}</span>
                </button>
              ))}
          </div>
          <div className="track">
            <button
              className={
                'timeline-voice ' + (selected === 'voice-note' ? 'active' : '')
              }
              aria-label="Jump to start of voice note"
              title="Voice note"
              style={{
                left: pct(score.voice.playStart),
                width: pct(score.voice.duration),
              }}
              onClick={() => {
                select('voice-note');
                seek(score.voice.playStart);
              }}
            >
              <Wave peaks={peaks} />
            </button>
          </div>
          <div className="playhead" style={{ left: pct(time) }} />
        </div>
      </div>
    </section>
  );
}
