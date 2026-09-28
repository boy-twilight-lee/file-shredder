import { isNumber, isString } from 'lodash-es';

export const valueToPx = (value: string | number | undefined) => {
  const numberReg = /^-?\d+(\.\d+)?$/;
  // 检查是否是数字类型，或者是可以转换为数字的字符串
  if (isNumber(value) || (isString(value) && numberReg.test(value))) {
    return value + 'px';
  }
  return value as string;
};
// 触发浏览器下载指定文本内容为文件，用于记录导出等本地保存场景。
export function downloadTextFile(
  fileName: string,
  content: string,
  mimeType = 'text/plain;charset=utf-8',
): void {
  // 将文本包装为带 UTF-8 BOM 的二进制内容，保证表格软件正确识别中文编码。
  const blob = new Blob([`\uFEFF${content}`], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  // 下载已触发，立即释放对象地址避免内存常驻。
  URL.revokeObjectURL(url);
}
