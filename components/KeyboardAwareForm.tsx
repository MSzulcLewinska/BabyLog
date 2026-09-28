import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Keyboard,
    Platform,
    ScrollView,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from 'react-native';

import { subscribeFieldFocus } from '@/lib/keyboard-focus';

type KeyboardAwareFormProps = {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

const FOCUS_MARGIN = 24;

export default function KeyboardAwareForm({
  children,
  contentContainerStyle,
}: KeyboardAwareFormProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Przewijamy do pola, które właśnie zostało wybrane. Wcześniej formularz
  // zwijał się do końca i pole imienia znikało pod klawiaturą.
  useEffect(
    () =>
      subscribeFieldFocus((offset) => {
        const target = Math.max(0, offset - FOCUS_MARGIN);
        requestAnimationFrame(() => {
          scrollViewRef.current?.scrollTo({ y: target, animated: true });
        });
      }),
    []
  );

  const handleContentSizeChange = useCallback(() => {
    if (keyboardHeight === 0) return;
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    });
  }, [keyboardHeight]);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: keyboardHeight + 16 },
        contentContainerStyle,
      ]}
      onContentSizeChange={handleContentSizeChange}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
  },

  content: {
    flexGrow: 1,
  },
});
