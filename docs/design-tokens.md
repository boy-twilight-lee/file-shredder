# Digital Human Design Tokens

## Collections

| Collection    | Modes | Default mode | Token count |
| ------------- | ----- | ------------ | ----------- |
| `color 色彩`  | light | `light`      | 45          |
| `basic 基础`  | light | `light`      | 55          |
| `font 字体`   | base  | `base`       | 17          |
| `radius 圆角` | base  | `base`       | 14          |
| `size 尺寸`   | base  | `base`       | 49          |

## color 色彩

| Token                   | Type  | Mode values                           | Scope     | Web syntax                         | Description                      |
| ----------------------- | ----- | ------------------------------------- | --------- | ---------------------------------- | -------------------------------- |
| `主题色/主题色1`        | COLOR | light: {alias: 基础色/brand/1}        | ALL_FILLS | var(--dh-color-brand-1)            | 兼容别名 → 基础色/brand/1        |
| `主题色/主题色2`        | COLOR | light: {alias: 基础色/brand/2}        | ALL_FILLS | var(--dh-color-brand-2)            | 兼容别名 → 基础色/brand/2        |
| `主题色/主题色3`        | COLOR | light: {alias: 基础色/brand/3}        | ALL_FILLS | var(--dh-color-brand-3)            | 兼容别名 → 基础色/brand/3        |
| `主题色/主题色4`        | COLOR | light: {alias: 基础色/brand/4}        | ALL_FILLS | var(--dh-color-brand-4)            | 兼容别名 → 基础色/brand/4        |
| `主题色/主题色5`        | COLOR | light: {alias: 基础色/brand/5}        | ALL_FILLS | var(--dh-color-brand-5)            | 兼容别名 → 基础色/brand/5        |
| `辅助色/辅助色1`        | COLOR | light: {alias: 基础色/auxiliary/1}    | ALL_FILLS | var(--dh-color-auxiliary-1)        | 兼容别名 → 基础色/auxiliary/1    |
| `辅助色/辅助色2`        | COLOR | light: {alias: 基础色/auxiliary/2}    | ALL_FILLS | var(--dh-color-auxiliary-2)        | 兼容别名 → 基础色/auxiliary/2    |
| `辅助色/辅助色3`        | COLOR | light: {alias: 基础色/auxiliary/3}    | ALL_FILLS | var(--dh-color-auxiliary-3)        | 兼容别名 → 基础色/auxiliary/3    |
| `灰度色/灰度色1`        | COLOR | light: {alias: 基础色/gray/1}         | ALL_FILLS | var(--dh-color-gray-1)             | 兼容别名 → 基础色/gray/1         |
| `灰度色/灰度色2`        | COLOR | light: {alias: 基础色/gray/2}         | ALL_FILLS | var(--dh-color-gray-2)             | 兼容别名 → 基础色/gray/2         |
| `灰度色/灰度色3`        | COLOR | light: {alias: 基础色/gray/3}         | ALL_FILLS | var(--dh-color-gray-3)             | 兼容别名 → 基础色/gray/3         |
| `灰度色/灰度色4`        | COLOR | light: {alias: 基础色/gray/4}         | ALL_FILLS | var(--dh-color-gray-4)             | 兼容别名 → 基础色/gray/4         |
| `灰度色/灰度色5`        | COLOR | light: {alias: 基础色/gray/5}         | ALL_FILLS | var(--dh-color-gray-5)             | 兼容别名 → 基础色/gray/5         |
| `灰度色/灰度色6`        | COLOR | light: {alias: 基础色/gray/6}         | ALL_FILLS | var(--dh-color-gray-6)             | 兼容别名 → 基础色/gray/6         |
| `灰度色/灰度色7`        | COLOR | light: {alias: 基础色/gray/7}         | ALL_FILLS | var(--dh-color-gray-7)             | 兼容别名 → 基础色/gray/7         |
| `功能色/功能色1`        | COLOR | light: {alias: 基础色/status/success} | ALL_FILLS | var(--dh-color-status-success)     | 兼容别名 → 基础色/status/success |
| `功能色/功能色2`        | COLOR | light: {alias: 基础色/status/error}   | ALL_FILLS | var(--dh-color-status-error)       | 兼容别名 → 基础色/status/error   |
| `功能色/功能色3`        | COLOR | light: {alias: 基础色/status/warning} | ALL_FILLS | var(--dh-color-status-warning)     | 兼容别名 → 基础色/status/warning |
| `功能色/功能色4`        | COLOR | light: {alias: 基础色/status/caution} | ALL_FILLS | var(--dh-color-status-caution)     | 兼容别名 → 基础色/status/caution |
| `功能色/功能色5`        | COLOR | light: {alias: 基础色/status/info}    | ALL_FILLS | var(--dh-color-status-info)        | 兼容别名 → 基础色/status/info    |
| `功能色/功能色6`        | COLOR | light: {alias: 基础色/status/accent}  | ALL_FILLS | var(--dh-color-status-accent)      | 兼容别名 → 基础色/status/accent  |
| `基础色/brand/1`        | COLOR | light: #0057FF                        | ALL_FILLS | var(--dh-primitive-brand-1)        | 基础色，来源于「主题色/主题色1」 |
| `基础色/brand/2`        | COLOR | light: #0057FF / alpha 0.8            | ALL_FILLS | var(--dh-primitive-brand-2)        | 基础色，来源于「主题色/主题色2」 |
| `基础色/brand/3`        | COLOR | light: #0057FF / alpha 0.4            | ALL_FILLS | var(--dh-primitive-brand-3)        | 基础色，来源于「主题色/主题色3」 |
| `基础色/brand/4`        | COLOR | light: #E5EEFF                        | ALL_FILLS | var(--dh-primitive-brand-4)        | 基础色，来源于「主题色/主题色4」 |
| `基础色/brand/5`        | COLOR | light: #0057FF / alpha 0.05           | ALL_FILLS | var(--dh-primitive-brand-5)        | 基础色，来源于「主题色/主题色5」 |
| `基础色/auxiliary/1`    | COLOR | light: #0D1839                        | ALL_FILLS | var(--dh-primitive-auxiliary-1)    | 基础色，来源于「辅助色/辅助色1」 |
| `基础色/auxiliary/2`    | COLOR | light: #3D4766                        | ALL_FILLS | var(--dh-primitive-auxiliary-2)    | 基础色，来源于「辅助色/辅助色2」 |
| `基础色/auxiliary/3`    | COLOR | light: #7D8AB2                        | ALL_FILLS | var(--dh-primitive-auxiliary-3)    | 基础色，来源于「辅助色/辅助色3」 |
| `基础色/gray/1`         | COLOR | light: #101114                        | ALL_FILLS | var(--dh-primitive-gray-1)         | 基础色，来源于「灰度色/灰度色1」 |
| `基础色/gray/2`         | COLOR | light: #525766                        | ALL_FILLS | var(--dh-primitive-gray-2)         | 基础色，来源于「灰度色/灰度色2」 |
| `基础色/gray/3`         | COLOR | light: #797B80                        | ALL_FILLS | var(--dh-primitive-gray-3)         | 基础色，来源于「灰度色/灰度色3」 |
| `基础色/gray/4`         | COLOR | light: #B0B3BD                        | ALL_FILLS | var(--dh-primitive-gray-4)         | 基础色，来源于「灰度色/灰度色4」 |
| `基础色/gray/5`         | COLOR | light: #D9D9D9                        | ALL_FILLS | var(--dh-primitive-gray-5)         | 基础色，来源于「灰度色/灰度色5」 |
| `基础色/gray/6`         | COLOR | light: #EAECF2                        | ALL_FILLS | var(--dh-primitive-gray-6)         | 基础色，来源于「灰度色/灰度色6」 |
| `基础色/gray/7`         | COLOR | light: #F1F2F5                        | ALL_FILLS | var(--dh-primitive-gray-7)         | 基础色，来源于「灰度色/灰度色7」 |
| `基础色/status/success` | COLOR | light: #52C1B4                        | ALL_FILLS | var(--dh-primitive-status-success) | 基础色，来源于「功能色/功能色1」 |
| `基础色/status/error`   | COLOR | light: #EA5B41                        | ALL_FILLS | var(--dh-primitive-status-error)   | 基础色，来源于「功能色/功能色2」 |
| `基础色/status/warning` | COLOR | light: #FF9900                        | ALL_FILLS | var(--dh-primitive-status-warning) | 基础色，来源于「功能色/功能色3」 |
| `基础色/status/caution` | COLOR | light: #FFD600                        | ALL_FILLS | var(--dh-primitive-status-caution) | 基础色，来源于「功能色/功能色4」 |
| `基础色/status/info`    | COLOR | light: #00A2FF                        | ALL_FILLS | var(--dh-primitive-status-info)    | 基础色，来源于「功能色/功能色5」 |
| `基础色/status/accent`  | COLOR | light: #903DA8                        | ALL_FILLS | var(--dh-primitive-status-accent)  | 基础色，来源于「功能色/功能色6」 |
| `基础色/common/white`   | COLOR | light: #FFFFFF                        | ALL_FILLS | var(--dh-primitive-common-white)   | 基础白色                         |
| `基础色/common/black`   | COLOR | light: #000000                        | ALL_FILLS | var(--dh-primitive-common-black)   | 基础黑色                         |
| `基础色/common/mask`    | COLOR | light: #000000 / alpha 0.6            | ALL_FILLS | var(--dh-primitive-common-mask)    | 遮罩颜色                         |

## basic 基础

| Token                                        | Type  | Mode values                           | Scope                               | Web syntax                                       | Description                      |
| -------------------------------------------- | ----- | ------------------------------------- | ----------------------------------- | ------------------------------------------------ | -------------------------------- |
| `基础投影/基础投影1/color`                   | COLOR | light: #000000 / alpha 0.1            | EFFECT_COLOR                        | var(--dh-shadow-level-1-color)                   | 基础投影1 的投影颜色             |
| `基础投影/基础投影1/offset-x`                | FLOAT | light: 0                              | EFFECT_FLOAT                        | var(--dh-shadow-level-1-offset-x)                | 复合阴影「基础投影1」的水平偏移  |
| `基础投影/基础投影1/offset-y`                | FLOAT | light: 1                              | EFFECT_FLOAT                        | var(--dh-shadow-level-1-offset-y)                | 复合阴影「基础投影1」的垂直偏移  |
| `基础投影/基础投影1/blur`                    | FLOAT | light: 4                              | EFFECT_FLOAT                        | var(--dh-shadow-level-1-blur)                    | 复合阴影「基础投影1」的模糊半径  |
| `基础投影/基础投影1/spread`                  | FLOAT | light: 0                              | EFFECT_FLOAT                        | var(--dh-shadow-level-1-spread)                  | 复合阴影「基础投影1」的扩散半径  |
| `基础投影/基础投影2/color`                   | COLOR | light: #000000 / alpha 0.1            | EFFECT_COLOR                        | var(--dh-shadow-level-2-color)                   | 基础投影2 的投影颜色             |
| `基础投影/基础投影2/offset-x`                | FLOAT | light: 0                              | EFFECT_FLOAT                        | var(--dh-shadow-level-2-offset-x)                | 复合阴影「基础投影2」的水平偏移  |
| `基础投影/基础投影2/offset-y`                | FLOAT | light: 3                              | EFFECT_FLOAT                        | var(--dh-shadow-level-2-offset-y)                | 复合阴影「基础投影2」的垂直偏移  |
| `基础投影/基础投影2/blur`                    | FLOAT | light: 8                              | EFFECT_FLOAT                        | var(--dh-shadow-level-2-blur)                    | 复合阴影「基础投影2」的模糊半径  |
| `基础投影/基础投影2/spread`                  | FLOAT | light: 0                              | EFFECT_FLOAT                        | var(--dh-shadow-level-2-spread)                  | 复合阴影「基础投影2」的扩散半径  |
| `基础投影/中层投影/color`                    | COLOR | light: #000000 / alpha 0.15           | EFFECT_COLOR                        | var(--dh-shadow-level-middle-color)              | 中层投影 的投影颜色              |
| `基础投影/中层投影/offset-x`                 | FLOAT | light: 0                              | EFFECT_FLOAT                        | var(--dh-shadow-level-middle-offset-x)           | 复合阴影「中层投影」的水平偏移   |
| `基础投影/中层投影/offset-y`                 | FLOAT | light: 6                              | EFFECT_FLOAT                        | var(--dh-shadow-level-middle-offset-y)           | 复合阴影「中层投影」的垂直偏移   |
| `基础投影/中层投影/blur`                     | FLOAT | light: 24                             | EFFECT_FLOAT                        | var(--dh-shadow-level-middle-blur)               | 复合阴影「中层投影」的模糊半径   |
| `基础投影/中层投影/spread`                   | FLOAT | light: 0                              | EFFECT_FLOAT                        | var(--dh-shadow-level-middle-spread)             | 复合阴影「中层投影」的扩散半径   |
| `基础投影/高亮投影/color`                    | COLOR | light: #0057FF / alpha 0.2            | EFFECT_COLOR                        | var(--dh-shadow-highlight-color)                 | 高亮投影 的投影颜色              |
| `基础投影/高亮投影/offset-x`                 | FLOAT | light: 0                              | EFFECT_FLOAT                        | var(--dh-shadow-highlight-offset-x)              | 复合阴影「高亮投影」的水平偏移   |
| `基础投影/高亮投影/offset-y`                 | FLOAT | light: 8                              | EFFECT_FLOAT                        | var(--dh-shadow-highlight-offset-y)              | 复合阴影「高亮投影」的垂直偏移   |
| `基础投影/高亮投影/blur`                     | FLOAT | light: 16                             | EFFECT_FLOAT                        | var(--dh-shadow-highlight-blur)                  | 复合阴影「高亮投影」的模糊半径   |
| `基础投影/高亮投影/spread`                   | FLOAT | light: 0                              | EFFECT_FLOAT                        | var(--dh-shadow-highlight-spread)                | 复合阴影「高亮投影」的扩散半径   |
| `基础颜色拓展/brand/brand-color`             | COLOR | light: {alias: 基础色/brand/1}        | ALL_FILLS                           | var(--dh-semantic-brand-brand-color)             | 语义别名 → 基础色/brand/1        |
| `基础颜色拓展/brand/brand-color-hover`       | COLOR | light: {alias: 基础色/brand/2}        | ALL_FILLS                           | var(--dh-semantic-brand-brand-color-hover)       | 语义别名 → 基础色/brand/2        |
| `基础颜色拓展/brand/brand-color-disabled`    | COLOR | light: {alias: 基础色/brand/3}        | ALL_FILLS                           | var(--dh-semantic-brand-brand-color-disabled)    | 语义别名 → 基础色/brand/3        |
| `基础颜色拓展/brand/brand-color-light-hover` | COLOR | light: {alias: 基础色/brand/4}        | ALL_FILLS                           | var(--dh-semantic-brand-brand-color-light-hover) | 语义别名 → 基础色/brand/4        |
| `基础颜色拓展/brand/brand-color-light`       | COLOR | light: {alias: 基础色/brand/5}        | ALL_FILLS                           | var(--dh-semantic-brand-brand-color-light)       | 语义别名 → 基础色/brand/5        |
| `基础颜色拓展/brand/brand-color-focus`       | COLOR | light: {alias: 基础色/brand/3}        | ALL_FILLS                           | var(--dh-semantic-brand-brand-color-focus)       | 语义别名 → 基础色/brand/3        |
| `文本颜色/text-color-primary`                | COLOR | light: {alias: 基础色/gray/1}         | SHAPE_FILL, TEXT_FILL               | var(--dh-text-text-color-primary)                | 语义别名 → 基础色/gray/1         |
| `文本颜色/text-color-secondary`              | COLOR | light: {alias: 基础色/gray/2}         | SHAPE_FILL, TEXT_FILL, STROKE_COLOR | var(--dh-text-text-color-secondary)              | 语义别名 → 基础色/gray/2         |
| `文本颜色/text-color-placeholder`            | COLOR | light: {alias: 基础色/gray/3}         | SHAPE_FILL, TEXT_FILL               | var(--dh-text-text-color-placeholder)            | 语义别名 → 基础色/gray/3         |
| `文本颜色/text-color-disabled`               | COLOR | light: {alias: 基础色/gray/4}         | SHAPE_FILL, TEXT_FILL               | var(--dh-text-text-color-disabled)               | 语义别名 → 基础色/gray/4         |
| `文本颜色/text-color-brand`                  | COLOR | light: {alias: 基础色/brand/1}        | SHAPE_FILL, TEXT_FILL               | var(--dh-text-text-color-brand)                  | 语义别名 → 基础色/brand/1        |
| `文本颜色/text-color-anti`                   | COLOR | light: {alias: 基础色/common/white}   | SHAPE_FILL, TEXT_FILL               | var(--dh-text-text-color-anti)                   | 语义别名 → 基础色/common/white   |
| `图标颜色/icon-color-primary`                | COLOR | light: {alias: 基础色/gray/1}         | SHAPE_FILL, STROKE_COLOR            | var(--dh-icon-icon-color-primary)                | 语义别名 → 基础色/gray/1         |
| `图标颜色/icon-color-secondary`              | COLOR | light: {alias: 基础色/gray/3}         | SHAPE_FILL, STROKE_COLOR            | var(--dh-icon-icon-color-secondary)              | 语义别名 → 基础色/gray/3         |
| `图标颜色/icon-color-disabled`               | COLOR | light: {alias: 基础色/gray/4}         | SHAPE_FILL, STROKE_COLOR            | var(--dh-icon-icon-color-disabled)               | 语义别名 → 基础色/gray/4         |
| `图标颜色/icon-color-brand`                  | COLOR | light: {alias: 基础色/brand/1}        | SHAPE_FILL, STROKE_COLOR            | var(--dh-icon-icon-color-brand)                  | 语义别名 → 基础色/brand/1        |
| `背景色/bg-color-page`                       | COLOR | light: {alias: 基础色/gray/7}         | FRAME_FILL, SHAPE_FILL              | var(--dh-background-bg-color-page)               | 语义别名 → 基础色/gray/7         |
| `背景色/bg-color-container`                  | COLOR | light: {alias: 基础色/common/white}   | FRAME_FILL, SHAPE_FILL              | var(--dh-background-bg-color-container)          | 语义别名 → 基础色/common/white   |
| `背景色/bg-color-container-hover`            | COLOR | light: {alias: 基础色/gray/7}         | FRAME_FILL, SHAPE_FILL              | var(--dh-background-bg-color-container-hover)    | 语义别名 → 基础色/gray/7         |
| `背景色/bg-color-component`                  | COLOR | light: {alias: 基础色/gray/6}         | FRAME_FILL, SHAPE_FILL              | var(--dh-background-bg-color-component)          | 语义别名 → 基础色/gray/6         |
| `背景色/bg-color-component-hover`            | COLOR | light: {alias: 基础色/gray/5}         | FRAME_FILL, SHAPE_FILL              | var(--dh-background-bg-color-component-hover)    | 语义别名 → 基础色/gray/5         |
| `背景色/bg-color-component-disabled`         | COLOR | light: {alias: 基础色/gray/7}         | FRAME_FILL, SHAPE_FILL              | var(--dh-background-bg-color-component-disabled) | 语义别名 → 基础色/gray/7         |
| `背景色/bg-color-container-select`           | COLOR | light: {alias: 基础色/brand/4}        | FRAME_FILL, SHAPE_FILL              | var(--dh-background-bg-color-container-select)   | 语义别名 → 基础色/brand/4        |
| `背景色/bg-color-brand-light`                | COLOR | light: {alias: 基础色/brand/5}        | FRAME_FILL, SHAPE_FILL              | var(--dh-background-bg-color-brand-light)        | 语义别名 → 基础色/brand/5        |
| `边框/component-border`                      | COLOR | light: {alias: 基础色/gray/5}         | STROKE_COLOR                        | var(--dh-border-component-border)                | 语义别名 → 基础色/gray/5         |
| `边框/component-border-subtle`               | COLOR | light: {alias: 基础色/gray/6}         | STROKE_COLOR                        | var(--dh-border-component-border-subtle)         | 语义别名 → 基础色/gray/6         |
| `边框/component-border-strong`               | COLOR | light: {alias: 基础色/gray/4}         | STROKE_COLOR                        | var(--dh-border-component-border-strong)         | 语义别名 → 基础色/gray/4         |
| `边框/component-border-brand`                | COLOR | light: {alias: 基础色/brand/1}        | STROKE_COLOR                        | var(--dh-border-component-border-brand)          | 语义别名 → 基础色/brand/1        |
| `基础颜色拓展/success/success-color`         | COLOR | light: {alias: 基础色/status/success} | ALL_FILLS                           | var(--dh-semantic-success-success-color)         | 语义别名 → 基础色/status/success |
| `基础颜色拓展/error/error-color`             | COLOR | light: {alias: 基础色/status/error}   | ALL_FILLS                           | var(--dh-semantic-error-error-color)             | 语义别名 → 基础色/status/error   |
| `基础颜色拓展/warning/warning-color`         | COLOR | light: {alias: 基础色/status/warning} | ALL_FILLS                           | var(--dh-semantic-warning-warning-color)         | 语义别名 → 基础色/status/warning |
| `基础颜色拓展/caution/caution-color`         | COLOR | light: {alias: 基础色/status/caution} | ALL_FILLS                           | var(--dh-semantic-caution-caution-color)         | 语义别名 → 基础色/status/caution |
| `基础颜色拓展/info/info-color`               | COLOR | light: {alias: 基础色/status/info}    | ALL_FILLS                           | var(--dh-semantic-info-info-color)               | 语义别名 → 基础色/status/info    |
| `基础颜色拓展/accent/accent-color`           | COLOR | light: {alias: 基础色/status/accent}  | ALL_FILLS                           | var(--dh-semantic-accent-accent-color)           | 语义别名 → 基础色/status/accent  |
| `遮罩/mask-active`                           | COLOR | light: {alias: 基础色/common/mask}    | FRAME_FILL, SHAPE_FILL              | var(--dh-mask-mask-active)                       | 语义别名 → 基础色/common/mask    |

## font 字体

| Token                  | Type   | Mode values                | Scope       | Web syntax                     | Description                  |
| ---------------------- | ------ | -------------------------- | ----------- | ------------------------------ | ---------------------------- |
| `font/family-primary`  | STRING | base: `PingFang SC`        | FONT_FAMILY | var(--dh-font-family-primary)  | 主字体，实际使用 1631 处     |
| `font/family-numeric`  | STRING | base: `Source Han Sans CN` | FONT_FAMILY | var(--dh-font-family-numeric)  | 数字强调字体，实际使用 37 处 |
| `font-style/regular`   | STRING | base: `Regular`            | FONT_STYLE  | var(--dh-font-style-regular)   | 常规字重，实际使用 1223 处   |
| `font-style/semibold`  | STRING | base: `Semibold`           | FONT_STYLE  | var(--dh-font-style-semibold)  | 强调字重，实际使用 408 处    |
| `font-style/bold`      | STRING | base: `Bold`               | FONT_STYLE  | var(--dh-font-style-bold)      | 数据强调字重，实际使用 36 处 |
| `font-size/text-xs`    | FLOAT  | base: 10                   | FONT_SIZE   | var(--dh-font-size-text-xs)    | 实际字号 10px，使用 21 处    |
| `font-size/text-sm`    | FLOAT  | base: 12                   | FONT_SIZE   | var(--dh-font-size-text-sm)    | 实际字号 12px，使用 320 处   |
| `font-size/text-md`    | FLOAT  | base: 14                   | FONT_SIZE   | var(--dh-font-size-text-md)    | 实际字号 14px，使用 1208 处  |
| `font-size/text-lg`    | FLOAT  | base: 16                   | FONT_SIZE   | var(--dh-font-size-text-lg)    | 实际字号 16px，使用 68 处    |
| `font-size/title-sm`   | FLOAT  | base: 18                   | FONT_SIZE   | var(--dh-font-size-title-sm)   | 实际字号 18px，使用 18 处    |
| `font-size/title-md`   | FLOAT  | base: 24                   | FONT_SIZE   | var(--dh-font-size-title-md)   | 实际字号 24px，使用 19 处    |
| `line-height/text-xs`  | FLOAT  | base: 18                   | LINE_HEIGHT | var(--dh-line-height-text-xs)  | 实际行高 18px，使用 21 处    |
| `line-height/text-sm`  | FLOAT  | base: 20                   | LINE_HEIGHT | var(--dh-line-height-text-sm)  | 实际行高 20px，使用 320 处   |
| `line-height/text-md`  | FLOAT  | base: 22                   | LINE_HEIGHT | var(--dh-line-height-text-md)  | 实际行高 22px，使用 1111 处  |
| `line-height/text-lg`  | FLOAT  | base: 24                   | LINE_HEIGHT | var(--dh-line-height-text-lg)  | 实际行高 24px，使用 67 处    |
| `line-height/title-sm` | FLOAT  | base: 26                   | LINE_HEIGHT | var(--dh-line-height-title-sm) | 实际行高 26px，使用 18 处    |
| `line-height/title-md` | FLOAT  | base: 32                   | LINE_HEIGHT | var(--dh-line-height-title-md) | 实际行高 32px，使用 35 处    |

## radius 圆角

| Token         | Type  | Mode values | Scope         | Web syntax            | Description                                    |
| ------------- | ----- | ----------- | ------------- | --------------------- | ---------------------------------------------- |
| `radius/0`    | FLOAT | base: 0     | CORNER_RADIUS | var(--dh-radius-0)    | 实际圆角 0px，使用 3448 处                     |
| `radius/4`    | FLOAT | base: 4     | CORNER_RADIUS | var(--dh-radius-4)    | 实际圆角 4px，使用 98 处                       |
| `radius/6`    | FLOAT | base: 6     | CORNER_RADIUS | var(--dh-radius-6)    | 实际圆角 6px，使用 333 处                      |
| `radius/8`    | FLOAT | base: 8     | CORNER_RADIUS | var(--dh-radius-8)    | 实际圆角 8px，使用 40 处                       |
| `radius/9`    | FLOAT | base: 9     | CORNER_RADIUS | var(--dh-radius-9)    | 实际圆角 9px，使用 12 处                       |
| `radius/10`   | FLOAT | base: 10    | CORNER_RADIUS | var(--dh-radius-10)   | 实际圆角 10px，使用 313 处                     |
| `radius/12`   | FLOAT | base: 12    | CORNER_RADIUS | var(--dh-radius-12)   | 实际圆角 12px，使用 299 处                     |
| `radius/14`   | FLOAT | base: 14    | CORNER_RADIUS | var(--dh-radius-14)   | 实际圆角 14px，使用 9 处                       |
| `radius/15`   | FLOAT | base: 15    | CORNER_RADIUS | var(--dh-radius-15)   | 实际圆角 15px，使用 38 处                      |
| `radius/16`   | FLOAT | base: 16    | CORNER_RADIUS | var(--dh-radius-16)   | 实际圆角 16px，使用 114 处                     |
| `radius/20`   | FLOAT | base: 20    | CORNER_RADIUS | var(--dh-radius-20)   | 实际圆角 20px，使用 94 处                      |
| `radius/24`   | FLOAT | base: 24    | CORNER_RADIUS | var(--dh-radius-24)   | 实际圆角 24px，使用 46 处                      |
| `radius/32`   | FLOAT | base: 32    | CORNER_RADIUS | var(--dh-radius-32)   | 实际圆角 32px，使用 6 处                       |
| `radius/full` | FLOAT | base: 9999  | CORNER_RADIUS | var(--dh-radius-full) | 全圆角，对应现有 100px 等胶囊写法，使用 113 处 |

## size 尺寸

| Token        | Type  | Mode values            | Scope             | Web syntax           | Description                 |
| ------------ | ----- | ---------------------- | ----------------- | -------------------- | --------------------------- |
| `size/0`     | FLOAT | base: 0                | WIDTH_HEIGHT, GAP | var(--dh-size-0)     | 实际使用的基础尺寸 0px      |
| `size/2`     | FLOAT | base: 2                | WIDTH_HEIGHT, GAP | var(--dh-size-2)     | 实际使用的基础尺寸 2px      |
| `size/4`     | FLOAT | base: 4                | WIDTH_HEIGHT, GAP | var(--dh-size-4)     | 实际使用的基础尺寸 4px      |
| `size/6`     | FLOAT | base: 6                | WIDTH_HEIGHT, GAP | var(--dh-size-6)     | 实际使用的基础尺寸 6px      |
| `size/8`     | FLOAT | base: 8                | WIDTH_HEIGHT, GAP | var(--dh-size-8)     | 实际使用的基础尺寸 8px      |
| `size/10`    | FLOAT | base: 10               | WIDTH_HEIGHT, GAP | var(--dh-size-10)    | 实际使用的基础尺寸 10px     |
| `size/12`    | FLOAT | base: 12               | WIDTH_HEIGHT, GAP | var(--dh-size-12)    | 实际使用的基础尺寸 12px     |
| `size/14`    | FLOAT | base: 14               | WIDTH_HEIGHT, GAP | var(--dh-size-14)    | 实际使用的基础尺寸 14px     |
| `size/16`    | FLOAT | base: 16               | WIDTH_HEIGHT, GAP | var(--dh-size-16)    | 实际使用的基础尺寸 16px     |
| `size/18`    | FLOAT | base: 18               | WIDTH_HEIGHT, GAP | var(--dh-size-18)    | 实际使用的基础尺寸 18px     |
| `size/20`    | FLOAT | base: 20               | WIDTH_HEIGHT, GAP | var(--dh-size-20)    | 实际使用的基础尺寸 20px     |
| `size/24`    | FLOAT | base: 24               | WIDTH_HEIGHT, GAP | var(--dh-size-24)    | 实际使用的基础尺寸 24px     |
| `size/28`    | FLOAT | base: 28               | WIDTH_HEIGHT, GAP | var(--dh-size-28)    | 实际使用的基础尺寸 28px     |
| `size/30`    | FLOAT | base: 30               | WIDTH_HEIGHT, GAP | var(--dh-size-30)    | 实际使用的基础尺寸 30px     |
| `size/32`    | FLOAT | base: 32               | WIDTH_HEIGHT, GAP | var(--dh-size-32)    | 实际使用的基础尺寸 32px     |
| `size/36`    | FLOAT | base: 36               | WIDTH_HEIGHT, GAP | var(--dh-size-36)    | 实际使用的基础尺寸 36px     |
| `size/38`    | FLOAT | base: 38               | WIDTH_HEIGHT, GAP | var(--dh-size-38)    | 实际使用的基础尺寸 38px     |
| `size/40`    | FLOAT | base: 40               | WIDTH_HEIGHT, GAP | var(--dh-size-40)    | 实际使用的基础尺寸 40px     |
| `size/46`    | FLOAT | base: 46               | WIDTH_HEIGHT, GAP | var(--dh-size-46)    | 实际使用的基础尺寸 46px     |
| `size/48`    | FLOAT | base: 48               | WIDTH_HEIGHT, GAP | var(--dh-size-48)    | 实际使用的基础尺寸 48px     |
| `size/56`    | FLOAT | base: 56               | WIDTH_HEIGHT, GAP | var(--dh-size-56)    | 实际使用的基础尺寸 56px     |
| `space/0`    | FLOAT | base: {alias: size/0}  | GAP               | var(--dh-space-0)    | 间距 0px                    |
| `space/2`    | FLOAT | base: {alias: size/2}  | GAP               | var(--dh-space-2)    | 间距 2px                    |
| `space/4`    | FLOAT | base: {alias: size/4}  | GAP               | var(--dh-space-4)    | 间距 4px                    |
| `space/6`    | FLOAT | base: {alias: size/6}  | GAP               | var(--dh-space-6)    | 间距 6px                    |
| `space/8`    | FLOAT | base: {alias: size/8}  | GAP               | var(--dh-space-8)    | 间距 8px                    |
| `space/10`   | FLOAT | base: {alias: size/10} | GAP               | var(--dh-space-10)   | 间距 10px                   |
| `space/12`   | FLOAT | base: {alias: size/12} | GAP               | var(--dh-space-12)   | 间距 12px                   |
| `space/16`   | FLOAT | base: {alias: size/16} | GAP               | var(--dh-space-16)   | 间距 16px                   |
| `space/20`   | FLOAT | base: {alias: size/20} | GAP               | var(--dh-space-20)   | 间距 20px                   |
| `space/24`   | FLOAT | base: {alias: size/24} | GAP               | var(--dh-space-24)   | 间距 24px                   |
| `space/32`   | FLOAT | base: {alias: size/32} | GAP               | var(--dh-space-32)   | 间距 32px                   |
| `space/40`   | FLOAT | base: {alias: size/40} | GAP               | var(--dh-space-40)   | 间距 40px                   |
| `space/48`   | FLOAT | base: {alias: size/48} | GAP               | var(--dh-space-48)   | 间距 48px                   |
| `icon/12`    | FLOAT | base: {alias: size/12} | WIDTH_HEIGHT      | var(--dh-icon-12)    | 图标尺寸 12px               |
| `icon/14`    | FLOAT | base: {alias: size/14} | WIDTH_HEIGHT      | var(--dh-icon-14)    | 图标尺寸 14px               |
| `icon/16`    | FLOAT | base: {alias: size/16} | WIDTH_HEIGHT      | var(--dh-icon-16)    | 图标尺寸 16px               |
| `icon/18`    | FLOAT | base: {alias: size/18} | WIDTH_HEIGHT      | var(--dh-icon-18)    | 图标尺寸 18px               |
| `icon/20`    | FLOAT | base: {alias: size/20} | WIDTH_HEIGHT      | var(--dh-icon-20)    | 图标尺寸 20px               |
| `icon/24`    | FLOAT | base: {alias: size/24} | WIDTH_HEIGHT      | var(--dh-icon-24)    | 图标尺寸 24px               |
| `control/28` | FLOAT | base: {alias: size/28} | WIDTH_HEIGHT      | var(--dh-control-28) | 控件高度 28px               |
| `control/30` | FLOAT | base: {alias: size/30} | WIDTH_HEIGHT      | var(--dh-control-30) | 控件高度 30px；选中节点使用 |
| `control/32` | FLOAT | base: {alias: size/32} | WIDTH_HEIGHT      | var(--dh-control-32) | 控件高度 32px               |
| `control/36` | FLOAT | base: {alias: size/36} | WIDTH_HEIGHT      | var(--dh-control-36) | 控件高度 36px               |
| `control/38` | FLOAT | base: {alias: size/38} | WIDTH_HEIGHT      | var(--dh-control-38) | 控件高度 38px；现有兼容尺寸 |
| `control/40` | FLOAT | base: {alias: size/40} | WIDTH_HEIGHT      | var(--dh-control-40) | 控件高度 40px               |
| `control/46` | FLOAT | base: {alias: size/46} | WIDTH_HEIGHT      | var(--dh-control-46) | 控件高度 46px；现有兼容尺寸 |
| `control/48` | FLOAT | base: {alias: size/48} | WIDTH_HEIGHT      | var(--dh-control-48) | 控件高度 48px               |
| `control/56` | FLOAT | base: {alias: size/56} | WIDTH_HEIGHT      | var(--dh-control-56) | 控件高度 56px               |

## Styles

### Paint Styles

| Style            | Variable references                          |
| ---------------- | -------------------------------------------- |
| `主题色/主题色1` | `基础颜色拓展/brand/brand-color`             |
| `主题色/主题色2` | `基础颜色拓展/brand/brand-color-hover`       |
| `主题色/主题色3` | `基础颜色拓展/brand/brand-color-disabled`    |
| `主题色/主题色4` | `基础颜色拓展/brand/brand-color-light-hover` |
| `主题色/主题色5` | `基础颜色拓展/brand/brand-color-light`       |
| `辅助色/辅助色1` | `辅助色/辅助色1`                             |
| `辅助色/辅助色2` | `辅助色/辅助色2`                             |
| `辅助色/辅助色3` | `辅助色/辅助色3`                             |
| `灰度色/灰度色1` | `灰度色/灰度色1`                             |
| `灰度色/灰度色2` | `灰度色/灰度色2`                             |
| `灰度色/灰度色3` | `灰度色/灰度色3`                             |
| `灰度色/灰度色4` | `灰度色/灰度色4`                             |
| `灰度色/灰度色5` | `灰度色/灰度色5`                             |
| `灰度色/灰度色6` | `灰度色/灰度色6`                             |
| `灰度色/灰度色7` | `灰度色/灰度色7`                             |
| `功能色/功能色1` | `基础颜色拓展/success/success-color`         |
| `功能色/功能色2` | `基础颜色拓展/error/error-color`             |
| `功能色/功能色3` | `基础颜色拓展/warning/warning-color`         |
| `功能色/功能色4` | `基础颜色拓展/caution/caution-color`         |
| `功能色/功能色5` | `基础颜色拓展/info/info-color`               |
| `功能色/功能色6` | `基础颜色拓展/accent/accent-color`           |

### Shadow Styles

| Style       | Color                    | Offset X                    | Offset Y                    | Blur                    | Spread                    | Effects |
| ----------- | ------------------------ | --------------------------- | --------------------------- | ----------------------- | ------------------------- | ------- |
| `基础投影1` | 基础投影/基础投影1/color | 基础投影/基础投影1/offset-x | 基础投影/基础投影1/offset-y | 基础投影/基础投影1/blur | 基础投影/基础投影1/spread | 1       |
| `基础投影2` | 基础投影/基础投影2/color | 基础投影/基础投影2/offset-x | 基础投影/基础投影2/offset-y | 基础投影/基础投影2/blur | 基础投影/基础投影2/spread | 1       |
| `中层投影`  | 基础投影/中层投影/color  | 基础投影/中层投影/offset-x  | 基础投影/中层投影/offset-y  | 基础投影/中层投影/blur  | 基础投影/中层投影/spread  | 1       |
| `高亮投影`  | 基础投影/高亮投影/color  | 基础投影/高亮投影/offset-x  | 基础投影/高亮投影/offset-y  | 基础投影/高亮投影/blur  | 基础投影/高亮投影/spread  | 1       |

## Naming Notes

- Existing Figma names are preserved for compatibility with current bindings.
- New agent-facing Web names are exposed through each token’s `WEB` syntax, for example `var(--dh-color-brand-1)`.
- Prefer semantic aliases such as `基础颜色拓展/brand/brand-color`, `文本颜色/text-color-primary`, and `背景色/bg-color-page` over raw primitive values.
- `基础投影/*` variables are component parts of the composite shadow styles above.

## Validation Snapshot

- Collections: 5
- Variables: 180
- Paint styles: 21
- Shadow styles: 4
- Alias integrity: no unresolved aliases
- Web syntax coverage: 100%
- Description coverage: 100%
- Shadow duplicate layers: none after cleanup
