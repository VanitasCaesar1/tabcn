import { cn } from '@/lib/cn';
import { DemoVideo } from './demo-video';

export interface ScreenMedia {
  title: string;
  video: string | null;
  poster: string | null;
}

// An iPhone-shaped frame. Everything inside is sized in container units, so the frame keeps
// its proportions at any width the caller gives it.
export function PhoneFrame({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('@container w-[260px] shrink-0', className)}>
      <div className="relative aspect-[9/19.5] rounded-[16cqw] bg-[#0c0c0d] p-[3.2cqw] shadow-[0_0_0_1px_var(--border),inset_0_0_0_1px_oklch(1_0_0/0.12),0_30px_60px_-24px_oklch(0_0_0/0.55)]">
        <div className="relative h-full w-full overflow-hidden rounded-[13cqw] bg-black">
          {children}
          <span
            aria-hidden
            className="absolute top-[3.2cqw] left-1/2 h-[8.4cqw] w-[30cqw] -translate-x-1/2 rounded-full bg-black"
          />
        </div>
      </div>
    </div>
  );
}

// Shown until a design's recording lands in public/videos/.
export function ScreenPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-[2cqw] bg-[#141416] bg-[radial-gradient(oklch(1_0_0/0.09)_1px,transparent_1px)] [background-size:5.5cqw_5.5cqw] px-[8cqw] text-center">
      <p className="font-semibold text-[#ededed] text-[8cqw] leading-tight tracking-tight">
        {title}
      </p>
      <p className="text-[#8f8f8f] text-[4.6cqw]">Recording coming soon</p>
      {/* A quiet sketch of a floating tab bar where the real one will be. */}
      <span
        aria-hidden
        className="absolute inset-x-[10cqw] bottom-[7cqw] flex h-[15cqw] items-center justify-around rounded-full bg-[#1f1f22] px-[5cqw] shadow-[inset_0_0_0_1px_oklch(1_0_0/0.08)]"
      >
        <span className="h-[7cqw] w-[18cqw] rounded-full bg-[#ededed]/85" />
        <span className="size-[3.5cqw] rounded-full bg-[#8f8f8f]/70" />
        <span className="size-[3.5cqw] rounded-full bg-[#8f8f8f]/70" />
        <span className="size-[3.5cqw] rounded-full bg-[#8f8f8f]/70" />
      </span>
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
