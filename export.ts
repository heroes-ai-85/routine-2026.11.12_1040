import { LogEntry, RoutineItem } from '../types';
import { formatKoreanDate } from './formatters';

export interface FullBackupPayload {
  version: number;
  exportedAt: string;
  dailyLogs: Record<string, LogEntry[]>;
  routines?: RoutineItem[];
}

export function generateExportTextReport(scopeTitle: string, logs: LogEntry[]): string {
  const divider = '='.repeat(48);
  const subDivider = '-'.repeat(48);

  let output = `${divider}\n`;
  output += `  [일상 루틴 및 소요 시간 기록 리포트]\n`;
  output += `  대상 범위: ${scopeTitle}\n`;
  output += `  총 기록 수: ${logs.length}건\n`;
  output += `${divider}\n\n`;

  if (logs.length === 0) {
    output += `선택된 기간에 기록된 일상이 없습니다.\n`;
    return output;
  }

  let currentDate = '';
  logs.forEach((log, index) => {
    if (log.dateStr !== currentDate) {
      currentDate = log.dateStr;
      output += `\n▶ [${formatKoreanDate(currentDate)}]\n`;
    }

    const num = String(index + 1).padStart(2, '0');
    const sleepTag = log.isSleepDuration ? ' [수면 시간]' : '';
    const durationText = log.durationFormatted ? ` (소요: ${log.durationFormatted}${sleepTag})` : ' (첫 시작)';
    output += `  ${num}. [${log.timeFormatted}] ${log.action}${durationText}\n`;
    if (log.note) {
      output += `      메모: ${log.note}\n`;
    }
  });

  output += `\n${subDivider}\n`;
  output += `생성 시각: ${new Date().toLocaleString('ko-KR')}\n`;
  output += `원터치 일상 기록기\n`;

  return output;
}

export function downloadTextFile(fileNamePrefix: string, scopeTitle: string, logs: LogEntry[]): void {
  const content = generateExportTextReport(scopeTitle, logs);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `일상기록_${fileNamePrefix}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCsvFile(fileNamePrefix: string, logs: LogEntry[]): void {
  let csv = '\uFEFF';
  csv += '순번,날짜,기록시간,행위내용,소요시간,수면여부,메모\n';

  logs.forEach((log, idx) => {
    const num = idx + 1;
    const date = log.dateStr;
    const time = `"${log.timeFormatted}"`;
    const action = `"${(log.action || '').replace(/"/g, '""')}"`;
    const duration = `"${(log.durationFormatted || '첫 시작').replace(/"/g, '""')}"`;
    const isSleep = log.isSleepDuration ? '수면' : '일반';
    const note = `"${(log.note || '').replace(/"/g, '""')}"`;

    csv += `${num},${date},${time},${action},${duration},${isSleep},${note}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `일상기록_${fileNamePrefix}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadExcelXml(fileNamePrefix: string, scopeTitle: string, logs: LogEntry[]): void {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="맑은 고딕" x:CharSet="129" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
   </Borders>
   <Font ss:FontName="맑은 고딕" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#3B82F6" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Title">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="맑은 고딕" ss:Size="14" ss:Color="#1E293B" ss:Bold="1"/>
  </Style>
  <Style ss:ID="CellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellSleep">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="맑은 고딕" ss:Color="#4338CA" ss:Bold="1"/>
   <Interior ss:Color="#EEF2FF" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="일상기록">
  <Table ss:DefaultRowHeight="22">
   <Column ss:Width="50"/>
   <Column ss:Width="95"/>
   <Column ss:Width="80"/>
   <Column ss:Width="140"/>
   <Column ss:Width="130"/>
   <Column ss:Width="160"/>
   <Row ss:Height="30">
    <Cell ss:MergeAcross="5" ss:StyleID="Title"><Data ss:Type="String">일상 루틴 기록 - ${escapeXml(scopeTitle)}</Data></Cell>
   </Row>
   <Row ss:Height="25">
    <Cell ss:StyleID="Header"><Data ss:Type="String">순번</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">날짜</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">시간</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">행위 내용</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">소요 시간</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">비고 / 메모</Data></Cell>
   </Row>`;

  logs.forEach((log, idx) => {
    const isSleep = log.isSleepDuration;
    const style = isSleep ? 'CellSleep' : 'CellLeft';
    const durationText = log.durationFormatted ? (isSleep ? `[수면] ${log.durationFormatted}` : log.durationFormatted) : '첫 시작';

    xml += `
   <Row ss:Height="22">
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${log.dateStr}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${log.timeFormatted}</Data></Cell>
    <Cell ss:StyleID="${style}"><Data ss:Type="String">${escapeXml(log.action)}</Data></Cell>
    <Cell ss:StyleID="${style}"><Data ss:Type="String">${escapeXml(durationText)}</Data></Cell>
    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${escapeXml(log.note || '')}</Data></Cell>
   </Row>`;
  });

  xml += `
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `일상기록_${fileNamePrefix}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadJsonBackup(dailyLogs: Record<string, LogEntry[]>, routines: RoutineItem[]): void {
  const payload: FullBackupPayload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    dailyLogs,
    routines,
  };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const today = new Date().toISOString().substring(0, 10);
  a.download = `일상기록_전체백업_${today}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function createMailtoLink(scopeTitle: string, logs: LogEntry[], targetEmail: string = ''): string {
  const subject = encodeURIComponent(`[일상 기록] ${scopeTitle} 리포트 (${logs.length}건)`);
  const bodyText = generateExportTextReport(scopeTitle, logs);
  const encodedBody = encodeURIComponent(bodyText);
  return `mailto:${encodeURIComponent(targetEmail)}?subject=${subject}&body=${encodedBody}`;
}
