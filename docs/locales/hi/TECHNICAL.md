# तकनीकी नोट्स

WakeLens Electron का उपयोग करता है और main/preload/renderer को अलग रखता है। Renderer सीधे Node.js access नहीं करता; वह सीमित preload API का उपयोग करता है।

## डेटा स्रोत

- `powercfg /lastwake`
- `powercfg /waketimers`
- `powercfg /requests`
- `powercfg /devicequery wake_armed`
- `Microsoft-Windows-Power-Troubleshooter` events

## स्थानीयकरण

Runtime strings `src/shared/i18n.ts` में हैं। निदान मूल प्रमाण से सक्रिय भाषा में फिर विश्लेषित होता है, इसलिए पुराना इतिहास भी चुनी हुई भाषा में दिखता है।

अरबी layout `dir="rtl"` से दाएँ-से-बाएँ होता है।
