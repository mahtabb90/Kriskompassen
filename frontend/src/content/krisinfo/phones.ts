import type { ContentSource, ListSection, Phone } from "../../types/krisinfo"

const KRISINFORMATION_PHONES: ContentSource = {
  name: "Krisinformation.se",
  url: "https://www.krisinformation.se/detta-gor-samhallet/viktiga-telefonnummer/",
}

const VARDGUIDEN_1177: ContentSource = {
  name: "1177.se",
  url: "https://www.1177.se/om-1177/nar-du-ringer-1177/nar-du-ringer-1177/",
}

const SOS_ALARM_112: ContentSource = {
  name: "SOS Alarm",
  url: "https://www.sosalarm.se/om-oss/vanliga-fragor-och-svar/for-privatpersoner/112-bra-att-veta-innan-du-ringer/",
}

const BRIS: ContentSource = {
  name: "Bris",
  url: "https://www.bris.se/for-barn-och-unga/prata-med-oss/",
}

const TELETAL: ContentSource = {
  name: "Teletal",
  url: "https://www.teletal.se/",
}

const LAST_VERIFIED = "2026-11-02"

/**
 * Phone numbers for help and information.
 *
 * 112, 1177, 113 13 and 114 14 follow the order of the section's source page; Bris and Teletal,
 * which that page does not list with a number, follow them. Each post names the page it is
 * based on; the texts are written in own words based on that source, and numbers, facts and
 * meaning match it.
 */
export const phoneNumbersSection: ListSection<Phone> = {
  id: "phone-numbers",
  title: "Viktiga telefonnummer",
  summary:
    "Numren nedan går till akut hjälp, vårdråd, polisen, information vid kriser och stöd. Har du en mobil kan du ringa direkt från sidan.",
  points: [],
  source: KRISINFORMATION_PHONES,
  lastVerified: LAST_VERIFIED,
  items: [
    {
      number: "112",
      label: "Larmnummer vid nöd",
      description:
        "Samtalet kopplas vidare till polis, ambulans eller räddningstjänst. Ett vanligt sms till 112 kommer inte fram, så ring.",
      whenToUse: "Är det bråttom och står någons liv, egendom eller miljön på spel, ringer du 112.",
      isEmergency: true,
      source: SOS_ALARM_112,
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
    {
      number: "116 111",
      label: "Bris – samtal för dig under 18",
      description:
        "Du kan vara anonym, och samtalet kostar inget och syns inte på telefonräkningen. Vill du hellre skriva går det att sms:a samma nummer.",
      whenToUse:
        "Är du under 18 och behöver någon att prata med kan du ringa 116 111, vilken tid som helst.",
      isEmergency: false,
      source: BRIS,
      lastVerified: LAST_VERIFIED,
    },
    {
      number: "020-22 11 44",
      label: "Teletal – hjälp medan du ringer",
      description:
        "Tjänsten kostar inget och du behöver varken ansöka eller boka. Den är öppen 07.30–20.00 på vardagar och 12.00–16.00 på helger.",
      whenToUse:
        "Har du svårt att klara ett telefonsamtal på egen hand kan du ringa 020-22 11 44 och få hjälp under samtalet.",
      isEmergency: false,
      source: TELETAL,
      lastVerified: LAST_VERIFIED,
    },
  ],
}
