import { isNumber, isString } from 'lodash-es';

// value转pc
export const valueToPx = (value: string | number | undefined) => {
  // 检查是否是数字类型，或者是可以转换为数字的字符串
  if (isNumber(value) || (isString(value) && /^-?\d+(\.\d+)?$/.test(value))) {
    return value + 'px';
  }
  return value as string;
};
