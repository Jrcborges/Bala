export default function TransportSelector({
  distance,
  selected,
  onSelect,
}: {
  distance: number
  selected: string
  onSelect: (t: "moto" | "carro" | "triciclo") => void
}) {

  const rates = { moto: 0.35, carro: 0.6, triciclo: 0.45 }

  const prices = {
    moto: (distance * rates.moto).toFixed(2),
    carro: (distance * rates.carro).toFixed(2),
    triciclo: (distance * rates.triciclo).toFixed(2),
  }

  return (
    <View>
      <Text style={{ color: "#fff", fontSize: 18 }}>Tipo de transporte</Text>

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {(["moto", "carro", "triciclo"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => onSelect(t)}
            style={{
              backgroundColor: selected === t ? "#FF6A00" : "#1E1E1E",
              padding: 15,
              borderRadius: 12,
              width: "30%",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff" }}>
              {t === "moto" ? "🛵 Moto" : t === "carro" ? "🚗 Carro" : "🛺 Triciclo"}
            </Text>

            {distance > 0 && (
              <Text style={{ color: "#fff", marginTop: 5 }}>
                ${prices[t]}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}
