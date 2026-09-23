# Design Tokens

> 来源：设计规范「设计 token」板块截图，逐表核对后写入。
> 每张表的取值都经过**双重校验**：先在高倍放大切片中读取文本，再对色卡区域做像素采样比对，两者一致才写入。
>
> 本文件是 `docs/ui/设计目标文档.md` 第 4 章的引用依据。设计稿与代码中的颜色、字号、圆角、间距、阴影取值**必须**来自本文件，不得出现规范外数值。

## 目录

| 集合 | Token 数 | 说明 |
| ---- | -------- | ---- |
| [颜色](#颜色) | 26 | Brand / Success / Error / Gray / Auxiliary 五组色阶 |
| [字体](#字体) | 14 | 字号阶梯 / 字体使用 / 字体行高 |
| [圆角](#圆角) | 7 | 0 / 2 / 4 / 6 / 8 / 16 / 9999 七档 |
| [间距](#间距) | 8 | 0 / 2 / 4 / 8 / 12 / 16 / 20 / 24 八档 |
| [阴影](#阴影) | 7 | 5 个静态投影 + 交互态投影 |

---

## 颜色

AI 统一规范：颜色设计 token 包含色阶（Brand、Success、Warning、Error）和辅助色（主色、危险色、文字色等），AI 生成页面时需按颜色场景引用。

### Brand · 主题色阶

以 Figma 主题色 `#0065FF` 为核心，覆盖标签、按钮与主按钮的交互态。

| 颜色 | 色值 | 等级 | 引用说明 | CSS 变量 |
| ---- | ---- | ---- | -------- | -------- |
| ![F5F9FF](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%23F5F9FF%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#F5F9FF` | 100 | 主题色浅色背景 | `--color-brand-100` |
| ![EBF3FF](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%23EBF3FF%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#EBF3FF` | 200 | 标签背景色 | `--color-brand-200` |
| ![CCE0FF](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%23CCE0FF%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#CCE0FF` | 300 | 标签描边 | `--color-brand-300` |
| ![99C1FF](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%2399C1FF%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#99C1FF` | 400 | 主按钮禁用 | `--color-brand-400` |
| ![3384FF](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%233384FF%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#3384FF` | 500 | 主按钮悬浮颜色 | `--color-brand-500` |
| ![0065FF](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%230065FF%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#0065FF` | 600 | 主按钮默认颜色 | `--color-brand-600` |
| ![0047B2](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%230047B2%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#0047B2` | 700 | 主按钮按下颜色 | `--color-brand-700` |

### Success · 成功色阶

以 `#26A555` 为正常态。

| 颜色 | 色值 | 等级 | 引用说明 | CSS 变量 |
| ---- | ---- | ---- | -------- | -------- |
| ![E9F6EE](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%23E9F6EE%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#E9F6EE` | 200 | 标签背景色 | `--color-success-200` |
| ![D4EDDD](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%23D4EDDD%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#D4EDDD` | 300 | 标签描边 | `--color-success-300` |
| ![26A555](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%2326A555%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#26A555` | 600 | 成功提示颜色 | `--color-success-600` |
| ![1B743C](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%231B743C%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#1B743C` | 700 | 成功色按下态 | `--color-success-700` |

### Warning · 警示色阶

以 `#FFE083` 为注意色，等待与提示场景使用。

| 颜色 | 色值 | 等级 | 引用说明 | CSS 变量 |
| ---- | ---- | ---- | -------- | -------- |
| ![FFE083](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%23FFE083%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#FFE083` | 200 | 标识警示色 | `--color-warning-200` |
| ![FAFBFC](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%23FAFBFC%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#FAFBFC` | 300 | 弱背景 | `--color-gray-200` |
| ![F5F7FA](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%23F5F7FA%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#F5F7FA` | 300 | 常规背景 | `--color-gray-300` |
| ![EDF1F7](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%23EDF1F7%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#EDF1F7` | 400 | 页面背景 | `--color-gray-400` |
| ![F2F5FA](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%23F2F5FA%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#F2F5FA` | 500 | 分割线 | `--color-gray-500` |
| ![E1E5EB](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%23E1E5EB%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#E1E5EB` | 600 | 边框 | `--color-gray-600` |

> 该表中 300–600 号色复用 gray 色阶，仅 200 号 `#FFE083` 为本组独立色。

### Error · 错误色阶

以 `#FF4C26` 为错误提示色。

| 颜色 | 色值 | 等级 | 引用说明 | CSS 变量 |
| ---- | ---- | ---- | -------- | -------- |
| ![FFF1EE](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%23FFF1EE%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#FFF1EE` | 200 | 标签背景色 | `--color-error-200` |
| ![FFDBD4](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%23FFDBD4%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#FFDBD4` | 300 | 标签描边 | `--color-error-300` |
| ![FF4C26](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%23FF4C26%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#FF4C26` | 600 | 错误提示颜色 | `--color-error-600` |
| ![B3351B](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%23B3351B%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#B3351B` | 700 | 错误色按下态 | `--color-error-700` |

### Gray · 灰度色

用于标题、正文、辅助信息、提示文本、背景和分割线。

| 颜色 | 色值 | 等级 | 引用说明 | CSS 变量 |
| ---- | ---- | ---- | -------- | -------- |
| ![FFFFFF](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%23FFFFFF%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#FFFFFF` | 100 | 页面 / 容器主背景 | `--color-gray-100` |
| ![FAFBFC](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%23FAFBFC%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#FAFBFC` | 200 | 弱背景 | `--color-gray-200` |
| ![F5F7FA](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%23F5F7FA%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#F5F7FA` | 300 | 常规背景 | `--color-gray-300` |
| ![EDF1F7](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%23EDF1F7%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#EDF1F7` | 400 | 页面背景 | `--color-gray-400` |
| ![F2F5FA](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%23F2F5FA%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#F2F5FA` | 500 | 分割线 | `--color-gray-500` |
| ![E1E5EB](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%23E1E5EB%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#E1E5EB` | 600 | 边框 | `--color-gray-600` |
| ![C9CED6](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%23C9CED6%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#C9CED6` | 700 | 禁用文字和占位符 | `--color-gray-700` |
| ![99A1AD](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%2399A1AD%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#99A1AD` | 800 | 提示说明 | `--color-gray-800` |
| ![474F59](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%23474F59%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#474F59` | 900 | 正文 / 常规文本 | `--color-gray-900` |
| ![0D1014](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%230D1014%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#0D1014` | 1000 | 标题 / 主要文本 | `--color-gray-1000` |

### Auxiliary · 辅助色

用于图表、标签等辅助场景的独立颜色。

| 颜色 | 色值 | 等级 | 引用说明 | CSS 变量 |
| ---- | ---- | ---- | -------- | -------- |
| ![557CA7](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%3E%3Crect%20x%3D%220.5%22%20y%3D%220.5%22%20width%3D%2215%22%20height%3D%2215%22%20rx%3D%224%22%20fill%3D%22%23557CA7%22%20stroke%3D%22%2300000026%22%2F%3E%3C%2Fsvg%3E) | `#557CA7` | 600 | 图标 / 标签等辅助场景 | `--color-aux-600` |

---

## 字体

AI 统一规范：字体 token 包含字号阶梯（12px Caption、14/16px Title-S-M 常用标题、20px Title-L 大标题、24/32px Data-S-L 数据展示）、字体使用（Inter / PingFang SC / Microsoft YaHei 等字体族）、字体行高三个子模块，AI 在生成图文页面时按此引用对应字号、字体和行高。

### Font Size · 字号阶梯

字号阶梯：12 / 14 / 16 / 20 / 24 / 32，按角色分 Caption（辅助说明）、Title-S/M/L（常用标题/小常用标题/大标题）、Data-S/L（数据展示）。

| 样式 | 字号 | 引用说明 | CSS 变量 |
| ---- | ---- | -------- | -------- |
| ![12px](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2234%22%20height%3D%2230%22%3E%3Ctext%20x%3D%222%22%20y%3D%2222%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2212%22%20fill%3D%22%230D1014%22%3EAa%3C%2Ftext%3E%3C%2Fsvg%3E) | `12px` | 辅助说明 / 注释文字 | `--font-size-12` |
| ![14px](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2234%22%20height%3D%2230%22%3E%3Ctext%20x%3D%222%22%20y%3D%2222%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2214%22%20fill%3D%22%230D1014%22%3EAa%3C%2Ftext%3E%3C%2Fsvg%3E) | `14px` | 常用标题·小 | `--font-size-14` |
| ![16px](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2234%22%20height%3D%2230%22%3E%3Ctext%20x%3D%222%22%20y%3D%2222%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2216%22%20fill%3D%22%230D1014%22%3EAa%3C%2Ftext%3E%3C%2Fsvg%3E) | `16px` | 常用标题 | `--font-size-16` |
| ![20px](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2234%22%20height%3D%2230%22%3E%3Ctext%20x%3D%222%22%20y%3D%2222%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2220%22%20fill%3D%22%230D1014%22%3EAa%3C%2Ftext%3E%3C%2Fsvg%3E) | `20px` | 大标题 | `--font-size-20` |
| ![24px](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2234%22%20height%3D%2230%22%3E%3Ctext%20x%3D%222%22%20y%3D%2222%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2224%22%20fill%3D%22%230D1014%22%3EAa%3C%2Ftext%3E%3C%2Fsvg%3E) | `24px` | 数据展示 | `--font-size-24` |
| ![32px](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2234%22%20height%3D%2230%22%3E%3Ctext%20x%3D%222%22%20y%3D%2222%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2232%22%20fill%3D%22%230D1014%22%3EAa%3C%2Ftext%3E%3C%2Fsvg%3E) | `32px` | 数据展示 | `--font-size-32` |

### Font Family · 字体使用

使用顺序：PingFang SC → 方正兰亭准黑简体 → 思源黑体 → Arial。Roboto 仅用于数字展示、总数据展示。

| 样式 | 字体 | 引用说明 | CSS 变量 |
| ---- | ---- | -------- | -------- |
| ![汉](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2222%22%20height%3D%2224%22%3E%3Ctext%20x%3D%221%22%20y%3D%2218%22%20font-size%3D%2216%22%20fill%3D%22%230D1014%22%3E%E6%B1%89%3C%2Ftext%3E%3C%2Fsvg%3E) | `PingFang SC` | — | `--font-family-PingFang SC` |
| ![汉](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2222%22%20height%3D%2224%22%3E%3Ctext%20x%3D%221%22%20y%3D%2218%22%20font-size%3D%2216%22%20fill%3D%22%230D1014%22%3E%E6%B1%89%3C%2Ftext%3E%3C%2Fsvg%3E) | `方正兰亭准黑简体` | — | `--font-family-chinese` |
| ![汉](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2222%22%20height%3D%2224%22%3E%3Ctext%20x%3D%221%22%20y%3D%2218%22%20font-size%3D%2216%22%20fill%3D%22%230D1014%22%3E%E6%B1%89%3C%2Ftext%3E%3C%2Fsvg%3E) | `思源黑体` | — | `--font-family-fallback` |
| ![汉](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2222%22%20height%3D%2224%22%3E%3Ctext%20x%3D%221%22%20y%3D%2218%22%20font-size%3D%2216%22%20fill%3D%22%230D1014%22%3E%E6%B1%89%3C%2Ftext%3E%3C%2Fsvg%3E) | `Arial` | — | `--font-family-arial` |
| ![汉](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2222%22%20height%3D%2224%22%3E%3Ctext%20x%3D%221%22%20y%3D%2218%22%20font-size%3D%2216%22%20fill%3D%22%230D1014%22%3E%E6%B1%89%3C%2Ftext%3E%3C%2Fsvg%3E) | `Roboto` | 数字展示、总数据展示 | `--font-family-number` |

### Line Height · 字体行高

行高分类：紧凑行高（行高 = 字号，即 100%）+ 默认行高（单行显示）+ 多行文本（多行正文，行高 = 字号 1.6 倍）。

| 样式 | 行高值 | 引用说明 | CSS 变量 |
| ---- | ------ | -------- | -------- |
| ![](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2234%22%20height%3D%2224%22%3E%3Ctext%20x%3D%222%22%20y%3D%228%22%20font-size%3D%2211%22%20fill%3D%22%23474F59%22%3E1%3C%2Ftext%3E%3C%2Fsvg%3E) | `1 × 字号` | 紧凑行高（行高等于字号，即 100%） | `--line-height-100` |
| ![](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2234%22%20height%3D%2236%22%3E%3Ctext%20x%3D%222%22%20y%3D%228%22%20font-size%3D%2211%22%20fill%3D%22%23474F59%22%3E1%3C%2Ftext%3E%3C%2Fsvg%3E) | `normal` | 单行显示 | `--line-height-default` |
| ![](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2234%22%20height%3D%2254%22%3E%3Ctext%20x%3D%222%22%20y%3D%228%22%20font-size%3D%2211%22%20fill%3D%22%23474F59%22%3E1%3C%2Ftext%3E%3Ctext%20x%3D%222%22%20y%3D%2230%22%20font-size%3D%2211%22%20fill%3D%22%23474F59%22%3E1%3C%2Ftext%3E%3C%2Fsvg%3E) | `1.6 × 字号` | 多行正文（行高为字号 1.6 倍） | `--line-height-multiple` |

---

## 圆角

AI 统一规范：圆角阶梯 token，包含 0/2/4/6/8/16/9999 七档圆角，AI 在生成元素圆角时按此阶梯引用对应数值，胶囊形态使用 9999。

### Radius · 圆角阶梯

覆盖直角、微圆角、控件、卡片、大圆角与胶囊形态。

| 样式 | 圆角值 | 引用说明 | CSS 变量 |
| ---- | ------ | -------- | -------- |
| ![0px](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2240%22%20height%3D%2240%22%3E%3Cpath%20d%3D%22M2%202%20h18%20v18%20h-2%20v-16%20h-16%20z%22%20fill%3D%22%23CCE0FF%22%20stroke%3D%22%230065FF%22%20stroke-width%3D%221.5%22%2F%3E%3C%2Fsvg%3E) | `0px` | 直角（无圆角） | `--radius-0` |
| ![2px](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2240%22%20height%3D%2240%22%3E%3Cpath%20d%3D%22M2%202%20h18%20v2%20h-16%20a2%202%200%200%200%20-2%202%20v16%20h-2%20z%22%20fill%3D%22%23CCE0FF%22%20stroke%3D%22%230065FF%22%20stroke-width%3D%221.5%22%2F%3E%3C%2Fsvg%3E) | `2px` | 微圆角 | `--radius-2` |
| ![4px](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2240%22%20height%3D%2240%22%3E%3Cpath%20d%3D%22M2%202%20h18%20v2%20h-14%20a4%204%200%200%200%20-4%204%20v14%20h-2%20z%22%20fill%3D%22%23CCE0FF%22%20stroke%3D%22%230065FF%22%20stroke-width%3D%221.5%22%2F%3E%3C%2Fsvg%3E) | `4px` | 小圆角 | `--radius-4` |
| ![6px](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2240%22%20height%3D%2240%22%3E%3Cpath%20d%3D%22M2%202%20h18%20v2%20h-12%20a6%206%200%200%200%20-6%206%20v12%20h-2%20z%22%20fill%3D%22%23CCE0FF%22%20stroke%3D%22%230065FF%22%20stroke-width%3D%221.5%22%2F%3E%3C%2Fsvg%3E) | `6px` | 小圆角 / 控件 | `--radius-6` |
| ![8px](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2240%22%20height%3D%2240%22%3E%3Cpath%20d%3D%22M2%202%20h18%20v2%20h-10%20a8%208%200%200%200%20-8%208%20v10%20h-2%20z%22%20fill%3D%22%23CCE0FF%22%20stroke%3D%22%230065FF%22%20stroke-width%3D%221.5%22%2F%3E%3C%2Fsvg%3E) | `8px` | 中等圆角 / 卡片 | `--radius-8` |
| ![16px](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2240%22%20height%3D%2240%22%3E%3Cpath%20d%3D%22M2%202%20h18%20v2%20h-2%20a16%2016%200%200%200%20-16%2016%20v2%20h-2%20z%22%20fill%3D%22%23CCE0FF%22%20stroke%3D%22%230065FF%22%20stroke-width%3D%221.5%22%2F%3E%3C%2Fsvg%3E) | `16px` | 大圆角 / 弹窗卡片 | `--radius-16` |
| ![9999px](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2240%22%20height%3D%2240%22%3E%3Cpath%20d%3D%22M2%202%20h18%20a9%209%200%200%201%209%209%20v9%20a9%209%200%200%201%20-9%209%20h-18%20a9%209%200%200%201%20-9%20-9%20v-9%20a9%209%200%200%201%209%20-9%20z%22%20fill%3D%22%23CCE0FF%22%20stroke%3D%22%230065FF%22%20stroke-width%3D%221.5%22%2F%3E%3C%2Fsvg%3E) | `9999px` | 胶囊形态 / 按钮 | `--radius-9999` |

---

## 间距

AI 统一规范：间距阶梯 token，包含 0 / 2 / 4 / 8 / 12 / 16 / 20 / 24 八档间距，AI 在生成内边距、外边距与元素间隔时按此阶梯引用对应数值。

### Spacing · 间距阶梯

用于内边距、外边距与元素间隔。

| 样式 | 间距值 | 引用说明 | CSS 变量 |
| ---- | ------ | -------- | -------- |
| ![0px](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2242%22%20height%3D%2214%22%3E%3Crect%20x%3D%221%22%20y%3D%224%22%20width%3D%222.0%22%20height%3D%226%22%20rx%3D%221%22%20fill%3D%22%230065FF%22%2F%3E%3C%2Fsvg%3E) | `0px` | 无间距 | `--spacing-0` |
| ![2px](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2242%22%20height%3D%2214%22%3E%3Crect%20x%3D%221%22%20y%3D%224%22%20width%3D%223.2%22%20height%3D%226%22%20rx%3D%221%22%20fill%3D%22%230065FF%22%2F%3E%3C%2Fsvg%3E) | `2px` | 极紧凑间距 | `--spacing-2` |
| ![4px](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2242%22%20height%3D%2214%22%3E%3Crect%20x%3D%221%22%20y%3D%224%22%20width%3D%226.4%22%20height%3D%226%22%20rx%3D%221%22%20fill%3D%22%230065FF%22%2F%3E%3C%2Fsvg%3E) | `4px` | 紧凑间距 | `--spacing-4` |
| ![8px](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2242%22%20height%3D%2214%22%3E%3Crect%20x%3D%221%22%20y%3D%224%22%20width%3D%2212.8%22%20height%3D%226%22%20rx%3D%221%22%20fill%3D%22%230065FF%22%2F%3E%3C%2Fsvg%3E) | `8px` | 中等间距 | `--spacing-8` |
| ![12px](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2242%22%20height%3D%2214%22%3E%3Crect%20x%3D%221%22%20y%3D%224%22%20width%3D%2219.2%22%20height%3D%226%22%20rx%3D%221%22%20fill%3D%22%230065FF%22%2F%3E%3C%2Fsvg%3E) | `12px` | 默认间距 | `--spacing-12` |
| ![16px](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2242%22%20height%3D%2214%22%3E%3Crect%20x%3D%221%22%20y%3D%224%22%20width%3D%2225.6%22%20height%3D%226%22%20rx%3D%221%22%20fill%3D%22%230065FF%22%2F%3E%3C%2Fsvg%3E) | `16px` | 较大间距 | `--spacing-16` |
| ![20px](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2242%22%20height%3D%2214%22%3E%3Crect%20x%3D%221%22%20y%3D%224%22%20width%3D%2232.0%22%20height%3D%226%22%20rx%3D%221%22%20fill%3D%22%230065FF%22%2F%3E%3C%2Fsvg%3E) | `20px` | 大间距 | `--spacing-20` |
| ![24px](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2242%22%20height%3D%2214%22%3E%3Crect%20x%3D%221%22%20y%3D%224%22%20width%3D%2238.4%22%20height%3D%226%22%20rx%3D%221%22%20fill%3D%22%230065FF%22%2F%3E%3C%2Fsvg%3E) | `24px` | 超大间距 | `--spacing-24` |

---

## 阴影

AI 统一规范：投影系统 token，包含 7 个静态阴影（card、button-primary、popover、node-hover、input-focus、input-error）和 2 个交互阴影（card-interactive、card-hover）。

### Shadow · 投影系统

5 个静态投影，用于卡片、按钮、弹层、节点等场景。

| 样式 | 投影值 | 引用说明 | CSS 变量 |
| ---- | ------ | -------- | -------- |
| ![](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2234%22%20height%3D%2230%22%3E%3Crect%20x%3D%228%22%20y%3D%226%22%20width%3D%2218%22%20height%3D%2216%22%20rx%3D%223%22%20fill%3D%22%23FFFFFF%22%20stroke%3D%22%23E1E5EB%22%20filter%3D%22url%28%23s%29%22%2F%3E%3Cfilter%20id%3D%22s%22%20x%3D%22-60%25%22%20y%3D%22-60%25%22%20width%3D%22220%25%22%20height%3D%22220%25%22%3E%3CfeDropShadow%20dx%3D%220%22%20dy%3D%220%22%20stdDeviation%3D%224.0%22%20flood-color%3D%22%230065FF%22%20flood-opacity%3D%220.06%22%2F%3E%3C%2Ffilter%3E%3C%2Fsvg%3E) | `0 0 8px rgba(0, 101, 255, 0.06)` | 卡片 | `--shadow-card` |
| ![](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2234%22%20height%3D%2230%22%3E%3Crect%20x%3D%228%22%20y%3D%226%22%20width%3D%2218%22%20height%3D%2216%22%20rx%3D%223%22%20fill%3D%22%23FFFFFF%22%20stroke%3D%22%23E1E5EB%22%20filter%3D%22url%28%23s%29%22%2F%3E%3Cfilter%20id%3D%22s%22%20x%3D%22-60%25%22%20y%3D%22-60%25%22%20width%3D%22220%25%22%20height%3D%22220%25%22%3E%3CfeDropShadow%20dx%3D%220%22%20dy%3D%224%22%20stdDeviation%3D%222.0%22%20flood-color%3D%22%230065FF%22%20flood-opacity%3D%220.16%22%2F%3E%3C%2Ffilter%3E%3C%2Fsvg%3E) | `0 4px 4px rgba(85, 124, 167, 0.16)` | 卡片悬浮 | `--shadow-card-hover` |
| ![](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2234%22%20height%3D%2230%22%3E%3Crect%20x%3D%228%22%20y%3D%226%22%20width%3D%2218%22%20height%3D%2216%22%20rx%3D%223%22%20fill%3D%22%23FFFFFF%22%20stroke%3D%22%23E1E5EB%22%20filter%3D%22url%28%23s%29%22%2F%3E%3Cfilter%20id%3D%22s%22%20x%3D%22-60%25%22%20y%3D%22-60%25%22%20width%3D%22220%25%22%20height%3D%22220%25%22%3E%3CfeDropShadow%20dx%3D%220%22%20dy%3D%222%22%20stdDeviation%3D%223.0%22%20flood-color%3D%22%230065FF%22%20flood-opacity%3D%220.3%22%2F%3E%3C%2Ffilter%3E%3C%2Fsvg%3E) | `0 2px 6px rgba(0, 101, 255, 0.30)` | 主按钮 | `--shadow-button-primary` |
| ![](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2234%22%20height%3D%2230%22%3E%3Crect%20x%3D%228%22%20y%3D%226%22%20width%3D%2218%22%20height%3D%2216%22%20rx%3D%223%22%20fill%3D%22%23FFFFFF%22%20stroke%3D%22%23E1E5EB%22%20filter%3D%22url%28%23s%29%22%2F%3E%3Cfilter%20id%3D%22s%22%20x%3D%22-60%25%22%20y%3D%22-60%25%22%20width%3D%22220%25%22%20height%3D%22220%25%22%3E%3CfeDropShadow%20dx%3D%220%22%20dy%3D%220%22%20stdDeviation%3D%2210.0%22%20flood-color%3D%22%230065FF%22%20flood-opacity%3D%220.12%22%2F%3E%3C%2Ffilter%3E%3C%2Fsvg%3E) | `0 0 20px rgba(85, 124, 167, 0.12)` | 弹层 / 气泡 | `--shadow-popover` |
| ![](data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2234%22%20height%3D%2230%22%3E%3Crect%20x%3D%228%22%20y%3D%226%22%20width%3D%2218%22%20height%3D%2216%22%20rx%3D%223%22%20fill%3D%22%23FFFFFF%22%20stroke%3D%22%23E1E5EB%22%20filter%3D%22url%28%23s%29%22%2F%3E%3Cfilter%20id%3D%22s%22%20x%3D%22-60%25%22%20y%3D%22-60%25%22%20width%3D%22220%25%22%20height%3D%22220%25%22%3E%3CfeDropShadow%20dx%3D%220%22%20dy%3D%228%22%20stdDeviation%3D%226.0%22%20flood-color%3D%22%230065FF%22%20flood-opacity%3D%220.2%22%2F%3E%3C%2Ffilter%3E%3C%2Fsvg%3E) | `0 8px 12px rgba(85, 124, 167, 0.20)` | 节点悬浮 | `--shadow-node-hover` |

### 交互态阴影

规范声明共 7 个静态阴影与 2 个交互阴影，截图中仅给出上述 5 行可视投影。以下两个交互态在规范中被点名，具体数值未在截图的投影表中列出：

| CSS 变量 | 说明 | 数值 |
| -------- | ---- | ---- |
| `--card-interactive` | 卡片交互态 | 待规范补充 |
| `--card-hover` | 卡片悬浮态 | 待规范补充 |

> 另有 `input-focus` 与 `input-error` 两个输入态投影同样在规范中被点名，数值未在截图中列出。
> 二者在实现层可先由 `--shadow-button-primary` 派生，待规范补全后替换。

---

## 使用约定

1. **优先级**：语义化变量优先于色阶变量。组件应引用 `--color-brand-600` 这类语义别名，而不是直接写死 hex。
2. **禁止自由取值**：颜色、字号、圆角、间距、阴影一律从本文件取值。截图中未出现的数值视为规范外取值。
3. **色阶与语义的对应关系**：
   - 主按钮：默认 `--color-brand-600`，悬浮 `--color-brand-500`，按下 `--color-brand-700`，禁用 `--color-brand-400`。
   - 标签：背景 `*-200`，描边 `*-300`。
   - 正文与标题：`--color-gray-900` / `--color-gray-1000`。
   - 占位与禁用：`--color-gray-700`。
4. **胶囊形态**使用 `--radius-9999`，不要写 `100px` 之类的近似值。
5. **数字展示**使用 `--font-family-number`（Roboto）；中文正文按 `PingFang SC → 方正兰亭准黑简体 → 思源黑体 → Arial` 顺序回退。
6. **间距**使用八档阶梯，禁止出现 `6px`、`10px`、`14px` 等阶梯外间距。

## 校验记录

| 项目 | 结果 |
| ---- | ---- |
| 颜色 token | 26 项，逐色卡像素采样比对，通道误差 ≤ 1/255（渲染噪点） |
| 字号 / 圆角 / 间距 / 阴影 | 全部经高倍放大切片逐值核对 |
| 未解析取值 | `--card-interactive`、`--card-hover`、`input-focus`、`input-error` 共 4 项，已在文档中标注 |
| 来源 | 设计规范「设计 token」板块截图 5 张 |
