/**
 * Icons for the Badge Dock design (Reddit's classic tab bar): Home, Communities, Create, Chat
 * and Inbox. Drawn by hand in a 40-unit box meant to render at 26 pt (the design's icon box),
 * to the glyphs measured on the app's App Store screenshot at 2.593 px per pt: a 24 x 23 pt
 * house, a 24 pt ring with two people and a magnifier, a 21.5 pt plus, a 23 pt round speech
 * bubble and a 22.5 x 22.5 pt bell. Outlines use a 1.5 pt stroke with round joins and caps.
 *
 * Each icon switches on `focused`: outlined when inactive, solid when active, with its inner
 * details cut out of the solid shape. The screenshot shows only the solid house and the other
 * four outlined; the outline house and the solid Communities, Chat and Inbox are drawn to
 * match. The plus is the same in both states. The design crossfades the two.
 * Pass them as `tabBarIcon` in your screen options. Not the app's artwork: redrawn shapes.
 */
import Svg, { Circle, Defs, G, Mask, Path, Rect } from 'react-native-svg';
import type { TabIconProps } from 'tabcn';

/** 1.5 pt in the 40-unit box drawn at 26 pt. */
const STROKE = 2.31;

/** Stroke props shared by the outline glyphs. */
function line(color: string) {
  return {
    fill: 'none',
    stroke: color,
    strokeWidth: STROKE,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

/**
 * House with a small eave at each side and an arched doorway open at the bottom. Active: a
 * solid house with the doorway cut out (as shown in the app).
 */
export function HomeIcon({ color, size, focused }: TabIconProps) {
  if (focused) {
    return (
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Path
          d="M1.62 14.08L18.77 2.85Q20 2.08 21.23 2.85L38.38 14.08Q39.38 14.77 38.62 15.54Q38.23 15.92 37.54 15.92H36.31V36.15Q36.31 37.38 35.08 37.38H24.38V27.85A4.38 4.38 0 0 0 15.62 27.85V37.38H4.92Q3.69 37.38 3.69 36.15V15.92H2.46Q1.77 15.92 1.38 15.54Q0.62 14.77 1.62 14.08Z"
          fill={color}
        />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M23.23 36.23H34Q35.15 36.23 35.15 35.08V14.77H37.08L20 3.69L2.92 14.77H4.85V35.08Q4.85 36.23 6 36.23H16.77V27.85A3.23 3.23 0 0 1 23.23 27.85Z"
        {...line(color)}
      />
    </Svg>
  );
}

/**
 * A ring holding two people: round heads, the left one's shoulders running into the ring's
 * bottom, the right one's shoulders curving into a magnifier lens with a handle out of the
 * ring's lower right. Active: a solid disc with the people and the lens cut out.
 */
export function CommunitiesIcon({ color, size, focused }: TabIconProps) {
  if (focused) {
    return (
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Defs>
          <Mask
            id="badge-dock-communities-cut"
            maskUnits="userSpaceOnUse"
            x={0}
            y={0}
            width={40}
            height={40}
          >
            <Rect x={0} y={0} width={40} height={40} fill="#ffffff" />
            <Circle cx={14.69} cy={17.46} r={4.46} fill="#000000" />
            <Circle cx={25.92} cy={17.46} r={4.46} fill="#000000" />
            <Path
              d="M22.08 33.15V28Q22.08 24.77 18.85 24.77H12.46C8.92 24.77 6.62 27.08 6.62 29.85Q6.62 31.72 7.99 33.42A17.62 17.62 0 0 0 22.08 38.03Z"
              fill="#000000"
              stroke="#000000"
              strokeWidth={STROKE}
              strokeLinejoin="round"
            />
            <Circle cx={28.15} cy={30} r={5.62} fill="#000000" />
            {/* Keeps the ring's edge whole round the cut-outs, and a gap between body and lens. */}
            <Circle
              cx={20}
              cy={20.54}
              r={17.62}
              fill="none"
              stroke="#ffffff"
              strokeWidth={STROKE}
            />
            <Path d="M23.08 23.85V36.92" stroke="#ffffff" strokeWidth={1.69} />
          </Mask>
        </Defs>
        <G mask="url(#badge-dock-communities-cut)">
          <Circle cx={20} cy={20.54} r={18.77} fill={color} />
        </G>
        <Path d="M32.58 33.46L36.85 37" {...line(color)} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M3.56 26.85A17.62 17.62 0 1 1 35.96 27.98M7.99 33.42A17.62 17.62 0 0 0 26.02 37.09"
        {...line(color)}
      />
      <Path
        d="M22.08 33.15V28Q22.08 24.77 18.85 24.77H12.46C8.92 24.77 6.62 27.08 6.62 29.85Q6.62 31.72 7.99 33.42"
        {...line(color)}
      />
      <Path
        d="M23.77 24.38H28.15A5.62 5.62 0 0 1 25.18 34.76M32.58 33.46L36.85 37"
        {...line(color)}
      />
      <Circle cx={14.69} cy={17.46} r={3.31} {...line(color)} />
      <Circle cx={25.92} cy={17.46} r={3.31} {...line(color)} />
    </Svg>
  );
}

/** Create: a thin 21.5 pt plus with square ends, the same in both states. */
export function CreateIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M19.08 2.46H20.92V18.08H36.54V19.92H20.92V35.54H19.08V19.92H3.46V18.08H19.08Z"
        fill={color}
      />
    </Svg>
  );
}

/** The bubble: a circle with a short tail at its lower left. */
const BUBBLE = 'M12.46 35.65A16.62 16.62 0 1 0 4.94 27.87L3.23 36.31Z';
/** Three dots across the bubble's middle, as even-odd holes after the bubble. */
const DOTS =
  'M10.92 20.15A1.69 1.69 0 1 1 14.31 20.15A1.69 1.69 0 1 1 10.92 20.15Z' +
  'M18.31 20.15A1.69 1.69 0 1 1 21.69 20.15A1.69 1.69 0 1 1 18.31 20.15Z' +
  'M26 20.15A1.69 1.69 0 1 1 29.38 20.15A1.69 1.69 0 1 1 26 20.15Z';

/**
 * Chat: a round speech bubble with three dots inside and the tail at the lower left. Active:
 * a solid bubble with the dots cut out.
 */
export function ChatIcon({ color, size, focused }: TabIconProps) {
  if (focused) {
    return (
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Path d={BUBBLE + DOTS} fill={color} fillRule="evenodd" />
        <Path d={BUBBLE} {...line(color)} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path d={BUBBLE} {...line(color)} />
      <Path d={DOTS} fill={color} />
    </Svg>
  );
}

/** The bell: a round dome, straight sides that flare out to a flat rim. */
const BELL =
  'M9.77 18.92V15.23A10.23 10.23 0 0 1 30.23 15.23V18.92C30.23 22.46 36.08 24 36.08 27.69V30.15H3.92V27.69C3.92 24 9.77 22.46 9.77 18.92Z';
/** The clapper: a small half-disc under the rim. */
const CLAPPER = 'M16.46 35H23.54A3.54 3.54 0 0 1 16.46 35Z';

/** Inbox: a bell with a half-disc clapper below it. Active: a solid bell. */
export function InboxIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path d={BELL} {...line(color)} fill={focused ? color : 'none'} />
      <Path d={CLAPPER} fill={color} />
    </Svg>
  );
}
