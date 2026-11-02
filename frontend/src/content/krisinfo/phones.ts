import type { ContentSource, ListSection, Phone } from "../../types/krisinfo"

const KRISINFORMATION_PHONES: ContentSource = {
  name: "Krisinformation.se",
  url: "https://www.krisinformation.se/detta-gor-samhallet/viktiga-telefonnummer/",
}

const VARDGUIDEN_1177: ContentSource = {
  name: "1177.se",
  url: "https://www.1177.se/om-1177/nar-du-ringer-1177/nar-du-ringer-1177/",
}

const LAST_VERIFIED = "2026-11-02"

/**
 * Phone numbers for help and information, in the order of the section's source page.
 *
 * Each post names the page it is based on; the texts are written in own words based on that
 * source, and numbers, facts and meaning match it.
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
      number: "1177",
      label: "Vårdråd per telefon",
      description:
        "Du får hjälp att avgöra om du behöver söka vård och i så fall var, och råd om hur du kan göra. Det är en sjuksköterska som svarar. Du kan ringa när som helst på dygnet.",
      whenToUse: "Känner du dig sjuk men behöver inte akut hjälp, kan du ringa 1177 och få råd.",
      isEmergency: false,
      abroadNumber: "+46 771-11 77 00",
      source: VARDGUIDEN_1177,
      lastVerified: LAST_VERIFIED,
    },
    {
      number: "113 13",
      label: "Upplysningar vid kriser och olyckor",
      description: "Numret är inte till för att larma. Behöver någon akut hjälp ringer du 112.",
      whenToUse:
        "Undrar du vad som gäller vid en större olycka eller kris i Sverige kan du ringa 113 13.",
      isEmergency: false,
      abroadNumber: "+46 77 33 113 13",
      source: KRISINFORMATION_PHONES,
      lastVerified: LAST_VERIFIED,
    },
    {
      number: "114 14",
      label: "Kontakt med polisen utan brådska",
      description: "Pågår brottet just nu är det en nödsituation. Ring då 112.",
      whenToUse:
        "Ring 114 14 för polisärenden som kan vänta, till exempel om du har ett tips eller vill anmäla ett brott som redan har skett.",
      isEmergency: false,
      abroadNumber: "+46 77 114 14 00",
      source: KRISINFORMATION_PHONES,
      lastVerified: LAST_VERIFIED,
    },
  ],
}
