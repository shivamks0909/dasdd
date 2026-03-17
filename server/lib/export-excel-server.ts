import ExcelJS from 'exceljs';
import type { Respondent } from '@shared/schema';

const COUNTRY_NAMES: Record<string, string> = {
  'US': 'United States',
  'DE': 'Germany',
  'GB': 'United Kingdom',
  'FR': 'France',
  'IT': 'Italy',
  'IN': 'India',
  'AU': 'Australia',
  'CA': 'Canada',
  'ES': 'Spain',
  'JP': 'Japan',
  'CN': 'China',
  'BR': 'Brazil',
  'RU': 'Russia',
  'MX': 'Mexico',
  'ID': 'Indonesia',
  'NL': 'Netherlands',
  'BE': 'Belgium',
  'SE': 'Sweden',
  'NO': 'Norway',
  'CH': 'Switzerland',
  'AT': 'Austria',
  'PL': 'Poland',
  'KR': 'South Korea',
  'SG': 'Singapore',
  'MY': 'Malaysia',
  'VN': 'Vietnam',
  'TH': 'Thailand',
  'PH': 'Philippines',
  'TR': 'Turkey',
  'IL': 'Israel',
  'ZA': 'South Africa',
  'AE': 'United Arab Emirates',
  'SA': 'Saudi Arabia',
  'NZ': 'New Zealand',
  'IE': 'Ireland',
  'DK': 'Denmark',
  'FI': 'Finland',
  'GR': 'Greece',
  'PT': 'Portugal',
  'CZ': 'Czech Republic',
  'HU': 'Hungary',
  'RO': 'Romania',
  'UA': 'Ukraine',
  'CO': 'Colombia',
  'AR': 'Argentina',
  'CL': 'Chile',
  'PE': 'Peru',
  'EG': 'Egypt',
  'NG': 'Nigeria',
  'KE': 'Kenya',
};

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
};

const parseUserAgent = (ua: string) => {
  const info = { device: 'Desktop', browser: 'Other', os: 'Other' };
  if (!ua) return info;
  if (/mobile|android|iphone|ipad|phone/i.test(ua)) info.device = 'Mobile';
  else if (/tablet|ipad/i.test(ua)) info.device = 'Tablet';
  if (/windows/i.test(ua)) info.os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) info.os = 'macOS';
  else if (/android/i.test(ua)) info.os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) info.os = 'iOS';
  else if (/linux/i.test(ua)) info.os = 'Linux';
  if (/chrome|crios/i.test(ua) && !/edge|opr/i.test(ua)) info.browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) info.browser = 'Safari';
  else if (/firefox|fxios/i.test(ua)) info.browser = 'Firefox';
  else if (/edge|edg/i.test(ua)) info.browser = 'Edge';
  else if (/opr/i.test(ua)) info.browser = 'Opera';
  return info;
};

export async function generateExcelReport(params: {
  responses: Respondent[],
  s2sLogs: any[],
  projects: any[],
  suppliers: any[],
  filterSummary: string,
  projectFilter: string,
  supplierFilter: string,
  statusFilter: string,
  dateRange: string,
  exportedBy: string,
}): Promise<Buffer> {
  const { responses, s2sLogs, projects, suppliers, filterSummary, projectFilter, supplierFilter, statusFilter, dateRange, exportedBy } = params;

  const projectMap = new Map(projects.map(p => [p.projectCode, p.projectName]));
  const supplierMap = new Map(suppliers.map(s => [s.code, s.name]));
  const s2sIpMap = new Map(s2sLogs.filter(l => l.status === 'success' || l.status === 'verified').map(l => [l.oiSession, l.ipAddress]));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'OpinionInsights Platform';
  workbook.lastModifiedBy = exportedBy;
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.title = 'OpinionInsights Respondent Export';
  workbook.subject = 'Survey Routing Platform — Respondent Activity Report';
  workbook.company = 'OpinionInsights';
  workbook.keywords = 'survey, respondents, routing, analytics';

  // Statistics calculation
  const stats = {
    total: responses.length,
    complete: responses.filter(r => r.status === 'complete').length,
    terminate: responses.filter(r => r.status === 'terminate').length,
    quotafull: responses.filter(r => r.status === 'quotafull').length,
    security: responses.filter(r => r.status === 'security' || r.status === 'fraud' || r.status === 'security-terminate').length,
    fake: responses.filter(r => r.status === 'fraud').length,
    s2sVerified: responses.filter(r => r.s2sVerified).length,
  };

  // --- SHEET 1: COVER PAGE ---
  const coverSheet = workbook.addWorksheet('Cover Page', { views: [{ showGridLines: false }] });
  coverSheet.getColumn(1).width = 25;
  coverSheet.getColumn(2).width = 45;

  coverSheet.mergeCells('A4:I4');
  const companyName = coverSheet.getCell('A4');
  companyName.value = 'OPINIONINSIGHTS';
  companyName.font = { size: 28, bold: true, color: { argb: 'FF1E293B' }, name: 'Calibri' };
  companyName.alignment = { horizontal: 'center' };

  coverSheet.mergeCells('A5:I5');
  const tagline = coverSheet.getCell('A5');
  tagline.value = 'Survey Routing Platform';
  tagline.font = { size: 14, italic: true, color: { argb: 'FF64748B' }, name: 'Calibri' };
  tagline.alignment = { horizontal: 'center' };

  coverSheet.mergeCells('A9:I9');
  const reportTitle = coverSheet.getCell('A9');
  reportTitle.value = 'RESPONDENT ACTIVITY EXPORT REPORT';
  reportTitle.font = { size: 20, bold: true, color: { argb: 'FF1E40AF' }, name: 'Calibri' };
  reportTitle.alignment = { horizontal: 'center' };

  const metadata = [
    ['Generated On', new Date().toLocaleString()],
    ['Generated By', exportedBy],
    ['Report Type', filterSummary],
    ['Total Records', stats.total],
    ['Complete', stats.complete],
    ['S2S Verified', stats.s2sVerified],
    ['Completion Rate', stats.total > 0 ? `${((stats.complete / stats.total) * 100).toFixed(1)}%` : '0%'],
  ];

  metadata.forEach((item, idx) => {
    coverSheet.getCell(`B${13 + idx}`).value = item[0];
    coverSheet.getCell(`C${13 + idx}`).value = item[1];
    coverSheet.getCell(`B${13 + idx}`).font = { bold: true, color: { argb: 'FF334155' } };
  });

  // --- SHEET 2: EXECUTIVE SUMMARY ---
  const summarySheet = workbook.addWorksheet('Executive Summary');
  summarySheet.mergeCells('A1:F1');
  summarySheet.getCell('A1').value = 'EXECUTIVE SUMMARY REPORT';
  summarySheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  summarySheet.getCell('A1').font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 16 };
  summarySheet.getCell('A1').alignment = { horizontal: 'center' };

  const kpis = [
    { label: 'TOTAL', value: stats.total, color: 'FF3B82F6' },
    { label: 'COMPLETE', value: stats.complete, color: 'FF16A34A' },
    { label: 'TERMINATED', value: stats.terminate, color: 'FFDC2626' },
    { label: 'QUOTA FULL', value: stats.quotafull, color: 'FFD97706' },
    { label: 'SECURITY', value: stats.security, color: 'FF7C3AED' },
  ];

  kpis.forEach((kpi, idx) => {
    summarySheet.getCell(5, idx + 1).value = kpi.label;
    summarySheet.getCell(6, idx + 1).value = kpi.value;
    summarySheet.getCell(5, idx + 1).font = { bold: true, size: 10 };
    summarySheet.getCell(6, idx + 1).font = { bold: true, size: 20, color: { argb: kpi.color } };
  });

  // --- SHEET 3: FULL DATA ---
  const dataSheet = workbook.addWorksheet('Full Response Data', { views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }] });
  const headers = [
    '#', 
    'OI Session UUID', 
    'Project Code', 
    'Project Name', 
    'Supplier Code', 
    'Supplier Name', 
    'Supplier RID (SID)', 
    'Client RID (RID)', 
    'Country Code', 
    'Country Name', 
    'IP Address', 
    'Status', 
    'S2S Status', 
    'S2S Token/Hash', 
    'S2S Received At', 
    'Fraud Score', 
    'OS', 
    'Browser', 
    'Device', 
    'Started At', 
    'Completed At', 
    'Duration (LOI)', 
    'User Agent', 
    'Verified IP', 
    'S2S Payload',
    'Session ID (Numeric)',
    'Protocol Type'
  ];
  dataSheet.getRow(4).values = headers;
  dataSheet.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  dataSheet.getRow(4).eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } });

  const widths = [5, 36, 15, 25, 15, 20, 20, 20, 10, 20, 16, 14, 14, 40, 22, 12, 15, 15, 12, 22, 22, 15, 50, 20, 40, 15, 15];
  widths.forEach((w, i) => dataSheet.getColumn(i + 1).width = w);

  responses.forEach((r, idx) => {
    const row = dataSheet.getRow(idx + 5);
    const ua = parseUserAgent(r.userAgent || '');
    
    let duration = '—';
    if (r.startedAt && r.completedAt) {
      const diff = Math.floor((new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime()) / 1000);
      duration = formatDuration(diff);
    }

    const s2sLog = s2sLogs.find(l => l.oiSession === r.oiSession);

    row.values = [
      idx + 1, 
      r.oiSession, 
      r.projectCode, 
      projectMap.get(r.projectCode) || 'Unknown', 
      r.supplierCode, 
      supplierMap.get(r.supplierCode || '') || 'Unknown', 
      r.supplierRid, 
      r.clientRid, 
      r.countryCode || 'GLB', 
      COUNTRY_NAMES[r.countryCode || ''] || 'Global', 
      r.ipAddress || '0.0.0.0', 
      r.status?.toUpperCase() || 'STARTED', 
      r.s2sVerified ? 'VERIFIED' : 'UNVERIFIED', 
      r.s2sToken || '—',
      r.s2sReceivedAt ? new Date(r.s2sReceivedAt).toLocaleString() : '—',
      r.fraudScore || '0.00',
      ua.os, 
      ua.browser, 
      ua.device, 
      r.startedAt ? new Date(r.startedAt).toLocaleString() : '—', 
      r.completedAt ? new Date(r.completedAt).toLocaleString() : '—', 
      duration,
      r.userAgent || '—', 
      s2sIpMap.get(r.oiSession) || '—', 
      s2sLog?.payload ? JSON.stringify(s2sLog.payload) : '—',
      r.id,
      r.s2sToken ? 'SECURE' : 'LEGACY'
    ];
    
    // Status Coloring
    const statusCell = row.getCell(12);
    if (r.status === 'complete') statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
    else if (r.status === 'terminate') statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    else if (r.status === 'quotafull') statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    else if (r.status === 'security' || r.status === 'fraud') statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };

    if (r.s2sVerified) {
      const s2sCell = row.getCell(13);
      s2sCell.font = { color: { argb: 'FF059669' }, bold: true };
    }
  });

  // --- SHEET 4: SUPPLIER PERFORMANCE ---
  const supSheet = workbook.addWorksheet('Supplier Performance');
  supSheet.getRow(4).values = ['Rank', 'Supplier Name', 'Total', 'Complete', 'Terminate', 'Rate'];
  const supDataMap = new Map();
  responses.forEach(r => {
    const s = r.supplierCode || 'UNKNOWN';
    if (!supDataMap.has(s)) supDataMap.set(s, { total: 0, complete: 0, terminate: 0 });
    const data = supDataMap.get(s);
    data.total++;
    if (r.status === 'complete') data.complete++;
    if (r.status === 'terminate') data.terminate++;
  });
  Array.from(supDataMap.entries()).sort((a,b) => b[1].complete - a[1].complete).forEach(([code, d], i) => {
    supSheet.getRow(i + 5).values = [i+1, supplierMap.get(code) || code, d.total, d.complete, d.terminate, d.total > 0 ? (d.complete/d.total) : 0];
    supSheet.getRow(i + 5).getCell(6).numFmt = '0.0%';
  });

  // --- SHEET 5: COUNTRY ANALYSIS ---
  const countrySheet = workbook.addWorksheet('Country Analysis');
  countrySheet.getRow(4).values = ['Country', 'Total', 'Complete', 'Rate'];
  const countryDataMap = new Map();
  responses.forEach(r => {
    const c = r.countryCode || 'XX';
    if (!countryDataMap.has(c)) countryDataMap.set(c, { total: 0, complete: 0 });
    const data = countryDataMap.get(c);
    data.total++;
    if (r.status === 'complete') data.complete++;
  });
  Array.from(countryDataMap.entries()).sort((a,b) => b[1].total - a[1].total).forEach(([code, d], i) => {
    countrySheet.getRow(i + 5).values = [COUNTRY_NAMES[code] || code, d.total, d.complete, d.total > 0 ? (d.complete/d.total) : 0];
    countrySheet.getRow(i + 5).getCell(4).numFmt = '0.0%';
  });

  // --- SHEET 6: DAILY TRENDS ---
  const trendSheet = workbook.addWorksheet('Daily Trends');
  trendSheet.getRow(4).values = ['Date', 'Total', 'Complete', 'Rate'];
  const dailyDataMap = new Map();
  responses.forEach(r => {
    const date = r.startedAt ? new Date(r.startedAt).toISOString().split('T')[0] : 'Unknown';
    if (!dailyDataMap.has(date)) dailyDataMap.set(date, { total: 0, complete: 0 });
    const data = dailyDataMap.get(date);
    data.total++;
    if (r.status === 'complete') data.complete++;
  });
  Array.from(dailyDataMap.entries()).sort((a,b) => a[0].localeCompare(b[0])).forEach(([date, d], i) => {
    trendSheet.getRow(i + 5).values = [date, d.total, d.complete, d.total > 0 ? (d.complete/d.total) : 0];
    trendSheet.getRow(i + 5).getCell(4).numFmt = '0.0%';
  });

  // --- SHEET 7: SECURITY REPORT ---
  const secSheet = workbook.addWorksheet('Security Report');
  secSheet.getRow(4).values = ['Timestamp', 'Session', 'Project', 'Supplier', 'Status', 'IP Address', 'Alert Details'];
  s2sLogs.forEach((log, i) => {
    secSheet.getRow(i + 5).values = [
      new Date(log.createdAt).toLocaleString(),
      log.oiSession,
      log.projectCode,
      log.supplierCode,
      log.status,
      log.ipAddress,
      log.payload ? JSON.stringify(log.payload) : ''
    ];
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as any;
}
