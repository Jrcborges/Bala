import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { height } = Dimensions.get("window");

export default function AIChatPanel({ onAIAction }: any) {
  const panelY = useRef(new Animated.Value(height * 0.65)).current;

  const [messages, setMessages] = useState<any[]>([
    { from: "ai", text: "👋 Hola, ¿a dónde quieres ir?" }
  ]);
  const [input, setInput] = useState("");

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 10,
      onPanResponderMove: (_, g) => {
        let newY = height * 0.65 + g.dy;
        if (newY < 100) newY = 100;
        if (newY > height * 0.75) newY = height * 0.75;
        panelY.setValue(newY);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy < -80) {
          Animated.spring(panelY, { toValue: 100, useNativeDriver: false }).start();
        } else {
          Animated.spring(panelY, { toValue: height * 0.65, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = input;

    setMessages(prev => [...prev, { from: "user", text: userMsg }]);
    setInput("");

    try {
      const res = await fetch("https://TU_BACKEND/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: userMsg })
      });

      const ai = await res.json();

      setMessages(prev => [...prev, { from: "ai", text: ai.message }]);

      if (onAIAction) onAIAction(ai);

    } catch {
      setMessages(prev => [...prev, { from: "ai", text: "❌ Error de conexión" }]);
    }
  };

  return (
    <Animated.View style={[styles.panel, { top: panelY }]} {...panResponder.panHandlers}>
      <View style={styles.handle} />

      <ScrollView style={{ marginBottom: 10 }}>
        {messages.map((msg, i) => (
          <View
            key={i}
            style={[
              styles.msg,
              msg.from === "user" ? styles.userMsg : styles.aiMsg
            ]}
          >
            <Text style={styles.msgText}>{msg.text}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Escribe..."
          placeholderTextColor="#aaa"
          style={styles.input}
        />

        <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
          <Text style={{ color: "#fff" }}>➤</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    left: 0,
    right: 0,
    height: height * 0.8,
    backgroundColor: "#121212",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 15,
  },
  handle: {
    width: 60,
    height: 6,
    backgroundColor: "#555",
    borderRadius: 10,
    alignSelf: "center",
    marginBottom: 10,
  },
  msg: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 5,
    maxWidth: "80%",
  },
  userMsg: {
    backgroundColor: "#FF6A00",
    alignSelf: "flex-end",
  },
  aiMsg: {
    backgroundColor: "#1E1E1E",
    alignSelf: "flex-start",
  },
  msgText: {
    color: "#fff",
    fontSize: 15,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    color: "#fff",
    paddingVertical: 10,
  },
  sendBtn: {
    backgroundColor: "#FF6A00",
    padding: 10,
    borderRadius: 10,
  },
});
