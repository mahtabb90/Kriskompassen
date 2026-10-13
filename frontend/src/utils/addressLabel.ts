import type { AddressLabel } from "../types/address"

/** Renders an address label as Swedish display text. */
export function describeAddressLabel(label: AddressLabel): string {
  switch (label.kind) {
    case "hem":
      return "Hem"
    case "arbete":
      return "Arbete"
    case "annan":
      return label.text
  }
}
