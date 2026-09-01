import { isNumber, isString } from 'lodash-es';
// 将无单位数值转换为像素尺寸，并保留已有 CSS 单位。
export const valueToPx = (value: string | number | undefined) => {
  // 数字及纯数字字符串默认按像素解释。
  if (isNumber(value) || (isString(value) && /^-?\d+(\.\d+)?$/.test(value))) {
    return value + 'px';
  }
  return value as string;
};
