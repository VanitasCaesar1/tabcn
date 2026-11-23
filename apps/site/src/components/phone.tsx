import { cn } from '@/lib/cn';
import { DemoVideo } from './demo-video';

export interface ScreenMedia {
  title: string;
  video: string | null;
  poster: string | null;
}

/** Side buttons, top to bottom, in container units of the frame's width (its body is 208.8 tall). */
const BUTTONS = [
  { side: 'left', kind: 'action', top: 38, height: 8.5 },
  { side: 'left', kind: 'volume', top: 54, height: 15 },
  { side: 'left', kind: 'volume', top: 72.5, height: 15 },
  { side: 'right', kind: 'side', top: 60, height: 24 },
  { side: 'right', kind: 'camera', top: 118, height: 13 },
] as const;

// An iPhone drawn in CSS (globals.css, .phone): a metal edge lit from the top left, a thin dark
// rim, a black bezel, the screen at the recordings' 1206 x 2622, the Dynamic Island, five side
// buttons and a faint reflection that lets taps through. Silver under the light site theme,
// graphite under the dark. Everything inside is sized in container units, so the frame keeps
// its proportions at any width the caller gives it.
export function PhoneFrame({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('@container isolate w-[260px] shrink-0', className)}>
      <div className="phone">
        {BUTTONS.map((b) => (
          <span
            key={`${b.side}-${b.top}`}
            aria-hidden
            data-side={b.side}
            data-kind={b.kind}
            className="phone-button"
            style={{ top: `${b.top}cqw`, height: `${b.height}cqw` }}
          />
        ))}
        <div className="phone-rim">
          <div className="phone-bezel">
            <div className="phone-screen">
              {children}
              <span aria-hidden className="phone-island" />
              <span aria-hidden className="phone-glass" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The foot of the same phone, for gallery cards: the screen is exactly the bar's loop (its
 * height over its width is `crop`), and the top fades into the card.
 */
export function PhoneFoot({
  crop,
  className,
  children,
}: {
  crop: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('@container', className)}>
      <div className="phone phone-foot" style={{ '--crop': crop } as React.CSSProperties}>
        <div className="phone-rim">
          <div className="phone-bezel">
            <div className="phone-screen">
              {children}
              <span aria-hidden className="phone-glass" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Shown until a design's recording lands in public/videos/.
export function ScreenPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-[2cqw] bg-[#141416] px-[8cqw] text-center">
      <p className="font-semibold text-[#ededed] text-[7cqw] leading-tight tracking-tight">
        {title}
      </p>
      <p className="text-[#8f8f8f] text-[4.2cqw]">Recording coming soon</p>
    </div>
  );
}

/** The design's recording in a phone, or the placeholder while it's missing. */
export function DesignPhone({
  media,
  play = 'auto',
  className,
}: {
  media: ScreenMedia;
  play?: 'auto' | boolean;
  className?: string;
}) {
  return (
    <PhoneFrame className={className}>
      {media.video ? (
        <DemoVideo src={media.video} poster={media.poster} title={media.title} play={play} />
      ) : (
        <ScreenPlaceholder title={media.title} />
      )}
    </PhoneFrame>
  );
}
