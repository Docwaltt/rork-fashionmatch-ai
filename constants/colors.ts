const colors = {
  black: "#000000",
  white: "#FFFFFF",
  richBlack: "#09090b", // Deep luxury black
  offWhite: "#FAFAFA",
  gray: {
    50: "#18181b",
    100: "#27272a",
    200: "#3f3f46",
    300: "#52525b",
    400: "#71717a",
    500: "#a1a1aa",
    600: "#d4d4d8",
    700: "#e4e4e7",
    800: "#f4f4f5",
    900: "#fafafa",
  },
  gold: {
    100: "#423E2F",
    200: "#695E38",
    300: "#8F7D40",
    400: "#D4AF37", // Classic Gold
    500: "#E6C256",
    600: "#F5E2A1",
    700: "#FFF5CC",
  },
};

export default {
  ...colors,
  text: "#FFFFFF",
  textSecondary: "#A1A1AA",
  background: "#09090b",
  card: "#18181b",
  border: "#27272a",
  tint: colors.gold[400],
  tabIconDefault: "#52525b",
  tabIconSelected: colors.gold[400],
  error: "#CF6679",
};
