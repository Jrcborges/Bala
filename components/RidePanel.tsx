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

export default function RidePanel({
  pickupText,
  destText,
  results,
  distance,
  onPickupFocus,
  onDestFocus,
  onSearch,
  onSelectResult,
  onConfirmPin,
  onCancel,
  onRequestRide,
}: any) {
  const panelY = useRef(new Animated.Value(height * 0.65)).current;
  const [transport, setTransport] = useState<"moto" | "carro" | "triciclo">("moto");

  /* Tarifas dinámicas */
  const rates = { moto: 0.35, carro: 0.6, triciclo: 0.45 };
  const prices :Record<"moto"|"carro"|"triciclo",string>= 
  {
    moto: (distance * rates.moto).toFixed(2),
    carro: (distance * rates.carro).toFixed(2),
    triciclo: (distance * rates.triciclo).toFixed(2),
  };

  /* Panel arrastrable */
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 10,
      onPanResponderMove: (_, gesture) => {
        let newY = height * 0.65 + gesture.dy;
        if (newY < 100) newY = 100;
        if (newY > height * 0.75) newY = height * 0.75;
        panelY.setValue(newY);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -80) {
          Animated.spring(panelY, { toValue: 100, useNativeDriver: false }).start();
        } else {
          Animated.spring(panelY, { toValue: height * 0.65, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View style={[styles.panel, { top: panelY }]} {...panResponder.panHandlers}>
      <View style={styles.handle} />

      <ScrollView>
        {/* INPUTS */}
        <View style={styles.inputs}>
          <View style={styles.row}>
            <TextInput
              placeholder="Origen"
              placeholderTextColor="#aaa"
              value={pickupText}
              onFocus={() => {
  onPickupFocus()
  Animated.spring(panelY, {
    toValue: 100,
    useNativeDriver: false
  }).start()
}}
              onChangeText={onSearch}
              style={styles.input}
            />
            <TouchableOpacity onPress={onCancel}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <TextInput
              placeholder="Destino"
              placeholderTextColor="#aaa"
              value={destText}
              onFocus={onDestFocus}
              onChangeText={onSearch}
              style={styles.input}
            />
          </View>
        </View>

        {/* BOTON FIJAR UBICACION */}
        <TouchableOpacity style={styles.action} onPress={onConfirmPin}>
          <Text style={styles.actionText}>📍 Fijar ubicación en el mapa</Text>
        </TouchableOpacity>

        {/* TRANSPORTE Y PRECIO */}
        <View style={styles.transportBox}>
          <Text style={styles.transportTitle}>Tipo de transporte</Text>
          <View style={styles.transportRow}>
            {(["moto", "carro", "triciclo"]as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.transportButton, transport === t && styles.transportActive]}
                onPress={() => setTransport(t)}
              >
                <Text style={styles.transportText}>
                  {t === "moto" ? "🛵 Moto" : t === "carro" ? "🚗 Carro" : "🛺 Triciclo"}
                </Text>
                {distance > 0 && <Text style={styles.price}>${prices[t]}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {/*Pedir viaje*/}
        {distance > 0 && (
         <TouchableOpacity style={styles.requestBtn} onPress={() => onRequestRide(transport)}>
           <Text style={styles.actionText}>🚀 Pedir viaje</Text>
         </TouchableOpacity>
        )}

        {/* RESULTADOS */}
        {results.length > 0 && (
          <View style={styles.results}>
            {results.map((item: any, i: number) => (
              <TouchableOpacity key={i} style={styles.result} onPress={() => onSelectResult(item)}>
                  <Text style={styles.resultText}>{item.properties.name || "Dirección"}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
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
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  handle: {
    width: 60,
    height: 6,
    backgroundColor: "#555",
    borderRadius: 10,
    alignSelf: "center",
    marginBottom: 15,
  },
  inputs: { backgroundColor: "#1E1E1E", borderRadius: 15, padding: 15 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  input: { flex: 1, color: "#fff", fontSize: 16 },
  close: { color: "#fff", fontSize: 20, marginLeft: 10 },
  action: { backgroundColor: "#FF6A00", padding: 15, borderRadius: 12, marginTop: 15 },
  actionText: { color: "#fff", fontSize: 16, fontWeight: "600", textAlign: "center" },
  transportBox: { marginTop: 20 },
  transportTitle: { color: "#fff", fontSize: 18, marginBottom: 10, fontWeight: "600" },
  transportRow: { flexDirection: "row", justifyContent: "space-between" },
  transportButton: {
    backgroundColor: "#1E1E1E",
    padding: 15,
    borderRadius: 12,
    width: "30%",
    alignItems: "center",
  },
  requestBtn:{
  backgroundColor:"#00C853",
  padding:18,
  borderRadius:15,
  marginTop:20,
  shadowColor:"#000",
  shadowOpacity:0.3,
  shadowRadius:5,
  elevation:5,
  };
  transportActive: { backgroundColor: "#FF6A00" },
  transportText: { color: "#fff", fontSize: 16, fontWeight: "500" },
  price: { color: "#fff", marginTop: 5, fontWeight: "bold" },
  results: { marginTop: 20 },
  result: { padding: 15, borderBottomWidth: 1, borderBottomColor: "#333" },
  resultText: { color: "#fff", fontSize: 16 },
});
