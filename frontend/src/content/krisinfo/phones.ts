import type { ContentSource, ListSection, Phone } from "../../types/krisinfo"

const KRISINFORMATION_PHONES: ContentSource = {
  name: "Krisinformation.se",
  url: "https://www.krisinformation.se/detta-gor-samhallet/viktiga-telefonnummer/",
}

const LAST_VERIFIED = "2026-11-02"

/**
 * Phone numbers for help and information, in the order of the source page.
 *
 * The texts are written in own words based on the source; numbers, facts and meaning match it.
 */
export const phoneNumbersSection: ListSection<Phone> = {
  id: "phone-numbers",
  title: "Viktiga telefonnummer",
  summary: "Här hittar du viktiga telefonnummer för hjälp och rådgivning.",
  points: [],
  source: KRISINFORMATION_PHONES,
  lastVerified: LAST_VERIFIED,
  items: [
    {
      number: "112",
      label: "Nödsituationer",
      description:
        "Via 112 kan du även få kontakt med flygräddning, sjöräddning och fjällräddning. Du kan också nå jourhavande präst och Giftinformationscentralen.",
      whenToUse:
        "Vid en nödsituation ska du ringa 112. Det kan handla om akut sjukdom, en brand eller ett brott som pågår.",
      isEmergency: true,
      source: KRISINFORMATION_PHONES,
      lastVerified: LAST_VERIFIED,
    },
    {
      number: "113 13",
      label: "Information om olyckor och kriser",
      description:
        "För samtal från utlandet eller från en utländsk mobil i Sverige använder du numret +46 77 33 113 13.",
      whenToUse: "På 113 13 får du information om större olyckor och kriser i Sverige.",
      isEmergency: false,
      source: KRISINFORMATION_PHONES,
      lastVerified: LAST_VERIFIED,
    },
    {
      number: "114 14",
      label: "Polisen vid icke-akuta händelser",
      description:
        "För samtal från utlandet eller från en utländsk mobil i Sverige använder du numret +46 77 114 14 00.",
      whenToUse:
        "Du når polisen på 114 14 i ärenden som inte är akuta, exempelvis om du vill lämna tips eller anmäla ett brott som inte pågår.",
      isEmergency: false,
      source: KRISINFORMATION_PHONES,
      lastVerified: LAST_VERIFIED,
    },
    {
      number: "1177",
      label: "Råd om sjukvård och hälsa",
      description:
        "Du får prata med en sjuksköterska som bedömer dina symtom och ger råd. Vid behov får du även hjälp att hitta rätt mottagning.",
      whenToUse: "När du behöver råd vid sjukdom som inte är akut kan du ringa 1177.",
      isEmergency: false,
      source: KRISINFORMATION_PHONES,
      lastVerified: LAST_VERIFIED,
    },
  ],
}
