import { hasAllowedExtension } from './files.constants';

describe('hasAllowedExtension', () => {
  it('accepts csv, xls and xlsx files regardless of case', () => {
    expect(hasAllowedExtension('report.csv')).toBe(true);
    expect(hasAllowedExtension('report.XLS')).toBe(true);
    expect(hasAllowedExtension('report.xlsx')).toBe(true);
  });

  it('rejects any other extension', () => {
    expect(hasAllowedExtension('report.pdf')).toBe(false);
    expect(hasAllowedExtension('report.docx')).toBe(false);
    expect(hasAllowedExtension('report')).toBe(false);
  });
});
