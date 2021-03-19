import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  fonts: {
    heading: "Lora, Courier New, monospace, serif",
    body:
      "apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, \
      Fira Sans, Droid Sans, Helvetica Neue, sans-serif",
    mono: "Menlo, monospace",
  },
  fontSizes: {
    xs: "0.75rem",
    sm: "0.875rem",
    md: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
    "5xl": "3rem",
    "6xl": "4rem",
  },
  styles: {
    global: {
      ":root": {
        "--reach-combobox": "1",
      },
      "img:not([alt])": {
        border: "5px solid",
        borderColor: "red.500",
        opacity: "0.5",
      },
    },
  },
});

export default theme;
