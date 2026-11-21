import QRCode from 'qrcode';
import { EXPO_GO_URL, RUN_EXAMPLE_URL } from '@/lib/expo';
import { Arrow } from './arrow';

const buttonClass =
  'group/btn inline-flex h-9 items-center gap-1.5 rounded-full bg-background px-4 font-medium text-[13px] text-foreground shadow-raised outline-hidden transition-[background-color] duration-150 ease-out hover:bg-surface focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 active:bg-foreground/10 active:duration-100';

// "Open on your phone": a QR code that opens the example app in Expo Go at this design, made at
// build time. Until EXPO_GO_URL is set (src/lib/expo.ts), it points to running the example app.
export async function OpenOnPhone({ id, title }: { id: string; title: string }) {
  const url = EXPO_GO_URL?.(id) ?? null;
  const svg = url
    ? await QRCode.toString(url, {
        type: 'svg',
        margin: 0,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#ffffff' },
      })
    : null;

  return (
    <section
      aria-labelledby="phone-heading"
      className="flex flex-col gap-5 rounded-[20px] bg-surface p-5 shadow-raised sm:flex-row sm:items-center"
    >
      {svg && (
        <div
          className="size-32 shrink-0 rounded-xl bg-white p-2.5 [&_svg]:size-full"
          role="img"
          aria-label={`QR code that opens ${title} in Expo Go`}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: an SVG made at build time by qrcode from our own URL.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
      <div className="min-w-0">
        <h2 id="phone-heading" className="font-medium text-[15px]">
          Open on your phone
        </h2>
        {url ? (
          <>
            <p className="mt-1 max-w-md text-pretty text-muted text-sm">
              Scan with your camera to open {title} in Expo Go, running in the example app.
            </p>
            <a href={url} className={`${buttonClass} mt-4`}>
              Open in Expo Go
              <Arrow direction="up-right" className="size-3" />
            </a>
          </>
        ) : (
          <>
            <p className="mt-1 max-w-md text-pretty text-muted text-sm">
              An Expo Go preview is on the way. Until then, run the example app to try {title} and
              the other designs on your phone or simulator.
            </p>
            <a
              href={RUN_EXAMPLE_URL}
              target="_blank"
              rel="noreferrer"
              className={`${buttonClass} mt-4`}
            >
              Run the example app
              <Arrow
                direction="up-right"
                className="size-3 transition-[translate] duration-150 ease-out group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 motion-reduce:transition-none"
              />
            </a>
          </>
        )}
      </div>
    </section>
  );
}
