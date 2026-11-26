/**
 * Reply Stack's demo: the reply row shows on Home only (a post is open there), with the viewer's
 * photo from the scenes' avatars, so it rises in and sinks away as the tab changes. The other tabs
 * show X's compose button above the bar's end instead. The glass
 * follows the Customize panel's light or dark scene (dark, as in X's screenshot, by default).
 */
import { ReplyStack } from '@registry/reply-stack/reply-stack';
import { Image, StyleSheet } from 'react-native';
import { useTabBar } from 'react-native-tabcn';

import { usePreviewSettings } from './embed';
import { AVATARS } from './scenes/photos';

/** The tab the reply row belongs to. */
const POST_TAB = 0;

export function ReplyStackDemo() {
  const { activeIndex } = useTabBar();
  const scheme = usePreviewSettings().scheme ?? 'dark';
  return (
    <ReplyStack
      tint={scheme}
      reply={{ avatar: <Image source={AVATARS[2]} style={styles.avatar} /> }}
      compose={{ label: 'Post' }}
      showReply={activeIndex === POST_TAB}
    />
  );
}

// The photo fills its circle, which shrinks while the row is docked.
const styles = StyleSheet.create({ avatar: { width: '100%', height: '100%' } });
