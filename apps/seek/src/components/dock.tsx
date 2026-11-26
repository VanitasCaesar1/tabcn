/**
 * Ask Dock wired to Seek's search: the prompt on Discover, the status pill while a search runs
 * (pressing it cancels), and the still or clip the viewer attached.
 */
import { AskDock } from '@registry/ask-dock/ask-dock';
import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';
import { useTabBar } from 'react-native-tabcn';
import { STILL } from '@/lib/films';
import { attach, cancel, search, useSeek } from '@/lib/search';

export function SeekDock() {
  const { activeIndex } = useTabBar();
  const { status, attachment } = useSeek();
  return (
    <AskDock
      showPrompt={activeIndex === 0}
      status={status}
      onStatusPress={cancel}
      prompt={{
        placeholder: 'Describe a film, or paste a clue…',
        onSend: search,
        onAddPhoto: () => attach('still'),
        onAddVideo: () => attach('clip'),
        attachment: attachment
          ? {
              preview: <Image source={STILL} style={StyleSheet.absoluteFill} contentFit="cover" />,
              label: attachment === 'clip' ? 'Clip from your library' : 'Still from your library',
              onRemove: () => attach(null),
            }
          : undefined,
      }}
    />
  );
}
