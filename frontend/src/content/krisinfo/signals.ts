import type { ActionLink, ContentSource, ListSection, Signal } from "../../types/krisinfo"

const MCF_OUTDOOR_WARNING: ContentSource = {
  name: "Myndigheten för civilt försvar (MCF)",
  url: "https://www.mcf.se/sv/rad-till-privatpersoner/skyddsrum-utrymning-och-varningssystem/viktigt-meddelande-till-allmanheten-vma-och-andra-varningar/utomhusvarning--hesa-fredrik/",
}

const KRISINFORMATION_VMA: ContentSource = {
  name: "Krisinformation.se",
  url: "https://www.krisinformation.se/varningssystem/vma-flyglarm-och-beredskapslarm/viktigt-meddelande-till-allmanheten-sa-funkar-det/",
}

// P4 is a set of local channels with no single national page, so the link opens SR's channel
// list, where listeners pick their local P4.
const P4_LINK: ActionLink = {
  label: "Sveriges Radio – lokala P4-kanaler",
  url: "https://www.sverigesradio.se/kanaler",
}

const KRISINFORMATION_LINK: ActionLink = {
  label: "Krisinformation.se",
  url: "https://www.krisinformation.se/",
}

const MCF_AUDIO_BASE = "https://www.mcf.se/contentassets/ffc078def2284745ae47c8282f83839f"

const LAST_VERIFIED = "2026-11-02"

/**
 * The four outdoor warning signals, in the order of the source page.
 *
 * The texts are written in own words based on the source; facts and meaning match it and no
 * advice is added. `meaning` is absent and `whatToDo` empty where no official source states
 * anything. Action links only complement the step text. `audioLinkUrl` points to MCF's own MP3
 * recordings, which the browser opens itself.
 */
export const warningSignalsSection: ListSection<Signal> = {
  id: "warning-signals",
  title: "Utomhusvarning – Hesa Fredrik",
  summary:
    "Hesa Fredrik är det vanliga namnet på utomhusvarningssystemet som varnar allmänheten i fredstid och under höjd beredskap.",
  points: [],
  source: MCF_OUTDOOR_WARNING,
  lastVerified: LAST_VERIFIED,
  items: [
    {
      id: "important-message",
      name: "Viktigt meddelande",
      patternDescription:
        "Signalen hörs i 7 sekunder, följt av 14 sekunders paus. Mönstret upprepas 6 gånger och avslutas efter 2 minuter.",
      meaning:
        "Signalen betyder att något allvarligt har inträffat och att ett Viktigt meddelande till allmänheten (VMA) har utfärdats.",
      meaningSource: KRISINFORMATION_VMA,
      whatToDo: [
        { text: "Ta dig inomhus." },
        {
          text: "Se till att alla fönster och dörrar är stängda och stäng om möjligt av ventilationen.",
        },
        { text: "Ta del av information via Sveriges Radio P4, tv eller text-tv.", link: P4_LINK },
        {
          text: "På Krisinformation.se hittar du mer information.",
          link: KRISINFORMATION_LINK,
        },
        { text: "För ytterligare information kan du även ringa informationsnumret 113 13." },
      ],
      // The source states both 6 repeats and a 2-minute total; the duration is kept because the
      // drawn timeline ends there, and 6 whole tones fit in it.
      pattern: { toneSeconds: 7, pauseSeconds: 14, totalDurationSeconds: 120 },
      audioLinkUrl: `${MCF_AUDIO_BASE}/01-viktigt-meddelande.mp3`,
      source: MCF_OUTDOOR_WARNING,
      lastVerified: LAST_VERIFIED,
    },
    {
      id: "air-raid",
      name: "Flyglarm",
      patternDescription:
        "Signalen hörs i 2 sekunder, följt av 2 sekunders paus. Mönstret upprepas under 1 minut.",
      whatToDo: [
        {
          text: "Bege dig omedelbart till det närmaste stället där du kan skydda dig: ett skyddsrum, en källare eller något annat utrymme som ger skydd.",
        },
        {
          text: "Inne i en byggnad är du bättre skyddad än ute. Ett rum som saknar fönster skyddar bäst.",
        },
      ],
      pattern: { toneSeconds: 2, pauseSeconds: 2, totalDurationSeconds: 60 },
      audioLinkUrl: `${MCF_AUDIO_BASE}/03-flyglarm.mp3`,
      source: MCF_OUTDOOR_WARNING,
      lastVerified: LAST_VERIFIED,
    },
    {
      id: "readiness-alert",
      name: "Beredskapslarm",
      patternDescription:
        "Signalen hörs i 30 sekunder, följt av 15 sekunders paus. Mönstret upprepas under 5 minuter.",
      meaning: "Larmet visar att högsta beredskap råder i hela Sverige.",
      whatToDo: [
        { text: "Ta dig inomhus." },
        { text: "Följ informationen i Sveriges Radio P4.", link: P4_LINK },
        {
          text: "Om du är värnpliktig eller civilpliktig ska du genast bege dig till platsen som anges i din krigsplaceringsorder.",
        },
        {
          text: "Om du är krigsplacerad på din arbetsplats ska du följa anvisningarna från din arbetsgivare.",
        },
      ],
      pattern: { toneSeconds: 30, pauseSeconds: 15, totalDurationSeconds: 300 },
      audioLinkUrl: `${MCF_AUDIO_BASE}/04-beredskapslarm.mp3`,
      source: MCF_OUTDOOR_WARNING,
      lastVerified: LAST_VERIFIED,
    },
    {
      id: "all-clear",
      name: "Faran över",
      patternDescription: "Signalen hörs en gång som ett sammanhängande ljud i 30 sekunder.",
      whatToDo: [],
      pattern: { toneSeconds: 30, pauseSeconds: 0, repeatCount: 1 },
      audioLinkUrl: `${MCF_AUDIO_BASE}/02-faran-over-.mp3`,
      source: MCF_OUTDOOR_WARNING,
      lastVerified: LAST_VERIFIED,
    },
  ],
}
