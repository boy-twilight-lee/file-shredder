import { describe, expect, it } from 'vitest';
import {
  formatFileSize,
  resolveFileDirectory,
  resolveFileKind,
  resolveFileName,
} from './file';
// 验证按扩展名识别文件类型。
describe('resolveFileKind', () => {
  it('识别常见文档与媒体扩展名', () => {
    expect(resolveFileKind('D:/审计资料/年度审计报告.PDF')).toBe('pdf');
    expect(resolveFileKind('C:/a/b/项目验收材料.docx')).toBe('word');
    expect(resolveFileKind('客户名单.xlsx')).toBe('excel');
    expect(resolveFileKind('汇报.pptx')).toBe('ppt');
    expect(resolveFileKind('设计源文件汇编.psd')).toBe('image');
    expect(resolveFileKind('产品发布会剪辑.MP4')).toBe('video');
    expect(resolveFileKind('资料归档.zip')).toBe('archive');
  });
  it('目录与无扩展名文件分别归入文件夹与文本类型', () => {
    expect(resolveFileKind('D:/项目/构建产物', 'directory')).toBe('folder');
    expect(resolveFileKind('D:/项目/构建产物/')).toBe('folder');
    expect(resolveFileKind('README')).toBe('text');
  });
  it('未知扩展名回退到文本类型且不抛错', () => {
    expect(resolveFileKind('unknown.zzz')).toBe('text');
    expect(resolveFileKind('')).toBe('text');
  });
});
// 验证文件名称与所在目录的提取逻辑。
describe('resolveFileName and resolveFileDirectory', () => {
  it('从正斜杠与反斜杠路径中提取文件名称', () => {
    expect(resolveFileName('D:/审计资料/2024 年度/年度审计报告.pdf')).toBe(
      '年度审计报告.pdf',
    );
    expect(resolveFileName('D:\\审计资料\\报告.pdf')).toBe('报告.pdf');
  });
  it('提取文件所在目录并兼容磁盘根目录', () => {
    expect(resolveFileDirectory('D:/审计资料/年度审计报告.pdf')).toBe(
      'D:/审计资料',
    );
    expect(resolveFileDirectory('D:\\审计资料\\报告.pdf')).toBe('D:\\审计资料');
    expect(resolveFileDirectory('/报告.pdf')).toBe('');
  });
});
// 验证文件大小格式化。
describe('formatFileSize', () => {
  it('按档位格式化大小并保留一位小数', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(864 * 1024)).toBe('864.0 KB');
    expect(formatFileSize(4.2 * 1024 ** 2)).toBe('4.2 MB');
    expect(formatFileSize(2.1 * 1024 ** 3)).toBe('2.1 GB');
  });
  it('缺失或非法大小统一返回占位文案', () => {
    expect(formatFileSize(null)).toBe('—');
    expect(formatFileSize(undefined)).toBe('—');
    expect(formatFileSize(-1)).toBe('—');
    expect(formatFileSize(Number.NaN)).toBe('—');
  });
});
