# 技术说明

WakeLens 使用 Electron，并分离 main、preload 和 renderer。renderer 不能直接访问 Node.js，只能调用受限 preload API。

## 数据源

- `powercfg /lastwake`
- `powercfg /waketimers`
- `powercfg /requests`
- `powercfg /devicequery wake_armed`
- `Microsoft-Windows-Power-Troubleshooter` 事件

## 本地化

运行时字符串位于 `src/shared/i18n.ts`。诊断会根据原始证据和当前语言重新计算，因此旧历史也能用当前语言显示。

Arabic 通过 `dir="rtl"` 使用从右到左布局。
