import { afterEach, describe, expect, it, vi } from "vitest"
import {
  detectInstallPlatform,
  readInstallPlatform,
  type InstallPlatform,
  type InstallPlatformInputs,
} from "./installPlatform"

const webKit = "AppleWebKit/605.1.15 (KHTML, like Gecko)"
const blink = "AppleWebKit/537.36 (KHTML, like Gecko)"
const iPhone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)"
const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"

const userAgents = {
  iPhoneSafari: `${iPhone} ${webKit} Version/18.5 Mobile/15E148 Safari/604.1`,
  iPhoneChrome: `${iPhone} ${webKit} CriOS/138.0.0.0 Mobile/15E148 Safari/604.1`,
  iPhoneEdge: `${iPhone} ${webKit} Version/18.0 EdgiOS/138.0.0.0 Mobile/15E148 Safari/604.1`,
  iPhoneWebView: `${iPhone} ${webKit} Mobile/15E148`,
  iPadLegacy:
    "Mozilla/5.0 (iPad; CPU OS 12_5 like Mac OS X) " +
    `${webKit} Version/12.1 Mobile/15E148 Safari/604.1`,
  macSafari: `${mac} ${webKit} Version/18.5 Safari/605.1.15`,
  macChrome: `${mac} ${blink} Chrome/138.0.0.0 Safari/537.36`,
  macEdge: `${mac} ${blink} Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0`,
  macFirefox:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:140.0) Gecko/20100101 Firefox/140.0",
  macChromiumWithVersion: `${mac} ${blink} Version/18.0 Chrome/138.0.0.0 Safari/537.36`,
  macWithoutVersion: `${mac} ${webKit} Safari/605.1.15`,
  windowsChrome: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) ${blink} Chrome/138.0.0.0 Safari/537.36`,
  windowsEdge:
    `Mozilla/5.0 (Windows NT 10.0; Win64; x64) ${blink} ` +
    "Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0",
  linuxChrome: `Mozilla/5.0 (X11; Linux x86_64) ${blink} Chrome/138.0.0.0 Safari/537.36`,
  androidChrome: `Mozilla/5.0 (Linux; Android 15) ${blink} Chrome/138.0.0.0 Mobile Safari/537.36`,
  instagramIos: `${iPhone} ${webKit} Mobile/15E148 Instagram 390.0.0.0 (iPhone16,1)`,
  instagramWithSafari: `${iPhone} ${webKit} Version/18.5 Mobile/15E148 Safari/604.1 Instagram 390.0`,
  facebookIos: `${iPhone} ${webKit} Mobile/15E148 [FBAN/FBIOS;FBAV/500.0.0.0]`,
  facebookWithSafari: `${iPhone} ${webKit} Version/18.5 Safari/604.1 [FBAN/FBIOS;FBAV/500.0.0.0]`,
  facebookAndroid: `Mozilla/5.0 (Linux; Android 15) ${blink} Chrome/138.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/500.0]`,
  messengerIos: `${iPhone} ${webKit} Version/18.5 Safari/604.1 [FBAN/MessengerForiOS;FBAV/500.0]`,
  messengerToken: `${iPhone} ${webKit} Version/18.5 Safari/604.1 Messenger/500.0`,
}

function detect(overrides: Partial<InstallPlatformInputs>) {
  return detectInstallPlatform({
    userAgent: userAgents.iPhoneSafari,
    maxTouchPoints: 0,
    navigatorStandalone: false,
    displayModeStandalone: false,
    ...overrides,
  })
}

describe("detectInstallPlatform", () => {
  it.each<[string, string, number, InstallPlatform]>([
    ["iPhone Safari", userAgents.iPhoneSafari, 5, "ios"],
    ["iPhone Chrome", userAgents.iPhoneChrome, 5, "ios"],
    ["iPhone Edge", userAgents.iPhoneEdge, 5, "ios"],
    ["iPad with an iPad user agent", userAgents.iPadLegacy, 5, "ios"],
    ["iPad reporting itself as a Mac", userAgents.macSafari, 5, "ios"],
    ["Mac Safari", userAgents.macSafari, 0, "macos-safari"],
    ["Mac Chrome", userAgents.macChrome, 0, "none"],
    ["Mac Edge", userAgents.macEdge, 0, "none"],
    ["Mac Firefox", userAgents.macFirefox, 0, "none"],
    ["a Mac Chromium browser with a Version token", userAgents.macChromiumWithVersion, 0, "none"],
    [
      "a Mac browser with a Safari token but no Version token",
      userAgents.macWithoutVersion,
      0,
      "none",
    ],
    ["Windows Chrome", userAgents.windowsChrome, 0, "none"],
    ["Windows Edge", userAgents.windowsEdge, 0, "none"],
    ["Linux Chrome", userAgents.linuxChrome, 0, "none"],
    ["Android Chrome", userAgents.androidChrome, 5, "none"],
  ])("selects the platform for %s", (_name, userAgent, maxTouchPoints, expected) => {
    expect(detect({ userAgent, maxTouchPoints })).toBe(expected)
  })

  it("does not treat a Mac with a single touch point as an iPad", () => {
    expect(detect({ userAgent: userAgents.macSafari, maxTouchPoints: 1 })).toBe("macos-safari")
  })

  it.each([
    ["iOS", userAgents.iPhoneSafari, "navigatorStandalone"],
    ["iOS", userAgents.iPhoneSafari, "displayModeStandalone"],
    ["macOS", userAgents.macSafari, "navigatorStandalone"],
    ["macOS", userAgents.macSafari, "displayModeStandalone"],
  ])("selects none when %s runs installed, signalled by %s", (_name, userAgent, signal) => {
    expect(detect({ userAgent, [signal]: true })).toBe("none")
  })

  it.each([
    ["Instagram", userAgents.instagramIos],
    ["Instagram with a Safari token", userAgents.instagramWithSafari],
    ["Facebook", userAgents.facebookIos],
    ["Facebook with a Safari token", userAgents.facebookWithSafari],
    ["Facebook on Android", userAgents.facebookAndroid],
    ["Messenger", userAgents.messengerIos],
    ["a Messenger token alone", userAgents.messengerToken],
  ])("selects none in the in-app browser %s", (_name, userAgent) => {
    expect(detect({ userAgent })).toBe("none")
  })

  it("selects none for an unlisted iOS web view without a Safari token", () => {
    expect(detect({ userAgent: userAgents.iPhoneWebView })).toBe("none")
  })

  it("selects none for an empty user agent", () => {
    expect(detect({ userAgent: "" })).toBe("none")
  })
})

describe("readInstallPlatform", () => {
  function stubBrowser(browserNavigator: Partial<Navigator>, matches: boolean | null = false) {
    vi.stubGlobal("navigator", browserNavigator)
    vi.stubGlobal("window", matches === null ? {} : { matchMedia: () => ({ matches }) })
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("reads the platform from the browser, treating a missing standalone flag as false", () => {
    stubBrowser({ userAgent: userAgents.iPhoneSafari, maxTouchPoints: 5 })

    expect(readInstallPlatform()).toBe("ios")
  })

  it("selects none when the iOS standalone flag is set", () => {
    stubBrowser({ userAgent: userAgents.iPhoneSafari, maxTouchPoints: 5, standalone: true })

    expect(readInstallPlatform()).toBe("none")
  })

  it("selects none when the standalone display mode matches", () => {
    stubBrowser({ userAgent: userAgents.macSafari, maxTouchPoints: 0 }, true)

    expect(readInstallPlatform()).toBe("none")
  })

  it("selects none without matchMedia", () => {
    stubBrowser({ userAgent: userAgents.iPhoneSafari, maxTouchPoints: 5 }, null)

    expect(readInstallPlatform()).toBe("none")
  })

  it.each<[string, Partial<Navigator>]>([
    ["no navigator properties", {}],
    ["a missing user agent", { maxTouchPoints: 5 }],
    ["a missing touch point count", { userAgent: userAgents.iPhoneSafari }],
    ["an empty user agent", { userAgent: "", maxTouchPoints: 5 }],
  ])("selects none with %s", (_name, browserNavigator) => {
    stubBrowser(browserNavigator)

    expect(readInstallPlatform()).toBe("none")
  })

  it("selects none outside the browser", () => {
    vi.stubGlobal("navigator", undefined)
    vi.stubGlobal("window", undefined)

    expect(readInstallPlatform()).toBe("none")
  })
})
