import { type ReactNode, useEffect, useState } from 'react';
import { Keyboard, Platform, type StyleProp, View, type ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTabBar } from './state';

export interface TabBarRootProps {
  /**
   * `docked`: stays in the layout and pads the bottom safe area; screens end above it.
   * `floating`: floats over the screens, centred, `offset` above the bottom safe area.
   */
  placement: 'docked' | 'floating';
  /** Gap between a floating bar and the bottom safe area. Default 12. */
  offset?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children?: ReactNode;
}

function useKeyboardVisible(enabled: boolean): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subs = [
      Keyboard.addListener(show, () => setVisible(true)),
      Keyboard.addListener(hide, () => setVisible(false)),
    ];
    return () => {
      for (const s of subs) s.remove();
    };
  }, [enabled]);
  return enabled && visible;
}

/**
 * Outer container of a tab bar. Positions it, pads the safe area, reports the
 * space it covers to the navigator (`useBottomTabBarHeight()` in screens), and
 * hides it while the keyboard is open when the screen sets `tabBarHideOnKeyboard`.
 */
export function TabBarRoot({ placement, offset = 12, style, testID, children }: TabBarRootProps) {
  const { insets, hideOnKeyboard, reportHeight } = useTabBar();
  const keyboardVisible = useKeyboardVisible(hideOnKeyboard);
  const [height, setHeight] = useState(0);
  const hidden = useSharedValue(0);

  useEffect(() => {
    hidden.value = withTiming(keyboardVisible ? 1 : 0, {
      duration: 200,
      reduceMotion: ReduceMotion.System,
    });
  }, [keyboardVisible, hidden]);

  const bottomGap = placement === 'floating' ? insets.bottom + offset : 0;
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - hidden.value,
    transform: [{ translateY: hidden.value * (height + bottomGap) }],
  }));

  if (placement === 'floating') {
    return (
      <Animated.View
        testID={testID}
        pointerEvents={keyboardVisible ? 'none' : 'box-none'}
        style={[
          {
            position: 'absolute',
            left: insets.left,
            right: insets.right,
            bottom: bottomGap,
            alignItems: 'center',
          },
          animatedStyle,
        ]}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          setHeight(h);
          reportHeight(h + bottomGap);
        }}
      >
        <View style={style}>{children}</View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      testID={testID}
      pointerEvents={keyboardVisible ? 'none' : 'auto'}
      style={[
        {
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        keyboardVisible ? { position: 'absolute', left: 0, right: 0, bottom: 0 } : null,
        animatedStyle,
        style,
      ]}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        setHeight(h);
        reportHeight(h);
      }}
    >
      {children}
    </Animated.View>
  );
}
