import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Download, Filter, Loader2, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import huntersLogoWatermark from '@/assets/hunters-logo-watermark.png';

export interface ReportColumn {
  key: string;
  label: string;
  format?: (value: any, row: any) => string;
  defaultVisible?: boolean;
}

export interface ReportFilter {
  key: string;
  label: string;
  type: 'select' | 'text' | 'date';
  options?: { value: string; label: string }[];
  filterFn?: (row: any, filterValue: string) => boolean;
}

interface GenericTableReportExportProps {
  title: string;
  subtitle?: string;
  data: any[];
  columns: ReportColumn[];
  filters?: ReportFilter[];
  fileName?: string;
  buttonLabel?: string;
  buttonVariant?: "default" | "outline" | "ghost";
}

export function GenericTableReportExport({
  title,
  subtitle,
  data,
  columns,
  filters = [],
  fileName = 'relatorio',
  buttonLabel = 'Gerar Relatório',
  buttonVariant = 'outline'
}: GenericTableReportExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');
  const { toast } = useToast();

  // Filter states
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    columns.forEach(col => {
      initial[col.key] = col.defaultVisible !== false;
    });
    return initial;
  });

  // Apply filters
  const filteredData = data.filter(row => {
    return filters.every(filter => {
      const filterValue = filterValues[filter.key];
      if (!filterValue || filterValue === 'all') return true;
      
      if (filter.filterFn) {
        return filter.filterFn(row, filterValue);
      }
      
      // Default text filter
      const rowValue = String(row[filter.key] || '').toLowerCase();
      return rowValue.includes(filterValue.toLowerCase());
    });
  });

  const resetFilters = () => {
    setFilterValues({});
  };

  const formatCellValue = (column: ReportColumn, row: any) => {
    const value = row[column.key];
    if (column.format) {
      return column.format(value, row);
    }
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (value instanceof Date) return value.toLocaleDateString('pt-BR');
    return String(value);
  };

  const generatePDF = async () => {
    if (filteredData.length === 0) {
      toast({
        variant: "destructive",
        title: "Nenhum dado",
        description: "Não há dados para gerar o relatório com os filtros aplicados."
      });
      return;
    }

    setGenerating(true);

    try {
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const primaryBlue = { r: 0, g: 112, b: 192 };
      const darkBlue = { r: 0, g: 70, b: 127 };

      // Header
      pdf.setFillColor(primaryBlue.r, primaryBlue.g, primaryBlue.b);
      pdf.rect(0, 0, pageWidth, 35, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('HUNTERS MANPOWER', 15, 15);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(subtitle || 'Relatório', 15, 23);

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, 15, 31);

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      const dataGeracao = `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;
      pdf.text(dataGeracao, pageWidth - 15, 15, { align: 'right' });
      pdf.text(`Total de registros: ${filteredData.length}`, pageWidth - 15, 31, { align: 'right' });

      // Table
      const activeColumns = columns.filter(col => visibleColumns[col.key]);
      const headers = activeColumns.map(col => col.label);
      const tableData = filteredData.map(row => 
        activeColumns.map(col => formatCellValue(col, row))
      );

      // Watermark function
      const addWatermark = () => {
        const totalPages = (pdf as any).internal.getNumberOfPages();
        
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          pdf.saveGraphicsState();
          pdf.setGState(new (pdf as any).GState({ opacity: 0.08 }));
          
          const wmWidth = 120;
          const wmHeight = 60;
          const wmX = (pageWidth - wmWidth) / 2;
          const wmY = (pageHeight - wmHeight) / 2;
          
          pdf.addImage(huntersLogoWatermark, 'PNG', wmX, wmY, wmWidth, wmHeight);
          pdf.restoreGraphicsState();
        }
      };

      autoTable(pdf, {
        startY: 42,
        head: [headers],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [darkBlue.r, darkBlue.g, darkBlue.b],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [60, 60, 60],
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        margin: { left: 10, right: 10 },
        didDrawPage: function(data) {
          const pageCount = (pdf as any).internal.getNumberOfPages();
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          pdf.text(
            `Página ${data.pageNumber} de ${pageCount}`,
            pageWidth / 2,
            pageHeight - 8,
            { align: 'center' }
          );
          
          pdf.setTextColor(0, 112, 192);
          pdf.setFont('helvetica', 'bold');
          pdf.text('HUNTERS MANPOWER', 10, pageHeight - 8);
        }
      });

      addWatermark();

      const dateStr = new Date().toISOString().split('T')[0];
      pdf.save(`${fileName}-${dateStr}.pdf`);

      toast({
        title: "Relatório gerado!",
        description: `${filteredData.length} registros exportados para PDF.`
      });

      setIsOpen(false);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao gerar o relatório PDF"
      });
    } finally {
      setGenerating(false);
    }
  };

  const generateExcel = async () => {
    if (filteredData.length === 0) {
      toast({
        variant: "destructive",
        title: "Nenhum dado",
        description: "Não há dados para gerar o relatório com os filtros aplicados."
      });
      return;
    }

    setGenerating(true);

    try {
      const activeColumns = columns.filter(col => visibleColumns[col.key]);
      
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Relatório');

      // Header row
      ws.addRow(activeColumns.map(col => col.label));

      // Style header
      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '004680' } };
      headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };

      // Data rows
      filteredData.forEach(row => {
        ws.addRow(activeColumns.map(col => formatCellValue(col, row)));
      });

      // Auto-size columns
      activeColumns.forEach((col, i) => {
        const maxLen = Math.max(
          col.label.length,
          ...filteredData.map(row => formatCellValue(col, row).length)
        );
        ws.getColumn(i + 1).width = Math.min(maxLen + 2, 50);
      });

      const dateStr = new Date().toISOString().split('T')[0];
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}-${dateStr}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Relatório gerado!",
        description: `${filteredData.length} registros exportados para Excel.`
      });

      setIsOpen(false);
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao gerar o relatório Excel"
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = () => {
    if (exportFormat === 'pdf') {
      generatePDF();
    } else {
      generateExcel();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant}>
          <FileText className="h-4 w-4 mr-2" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Aplique filtros e escolha as colunas para exportar o relatório.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Filters */}
          {filters.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Filter className="h-4 w-4" />
                Filtros
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {filters.map(filter => (
                  <div key={filter.key} className="space-y-2">
                    <Label>{filter.label}</Label>
                    {filter.type === 'select' && filter.options ? (
                      <Select 
                        value={filterValues[filter.key] || 'all'} 
                        onValueChange={(value) => setFilterValues(prev => ({ ...prev, [filter.key]: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {filter.options.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : filter.type === 'date' ? (
                      <Input 
                        type="date"
                        value={filterValues[filter.key] || ''}
                        onChange={(e) => setFilterValues(prev => ({ ...prev, [filter.key]: e.target.value }))}
                      />
                    ) : (
                      <Input 
                        placeholder={`Buscar por ${filter.label.toLowerCase()}...`}
                        value={filterValues[filter.key] || ''}
                        onChange={(e) => setFilterValues(prev => ({ ...prev, [filter.key]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
              </div>

              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Limpar Filtros
              </Button>
            </div>
          )}

          {/* Column Selection */}
          <div className="space-y-4">
            <Label className="text-sm font-medium text-muted-foreground">Colunas do Relatório</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {columns.map(col => (
                <div key={col.key} className="flex items-center space-x-2">
                  <Checkbox 
                    id={col.key}
                    checked={visibleColumns[col.key]}
                    onCheckedChange={(checked) => 
                      setVisibleColumns(prev => ({ ...prev, [col.key]: !!checked }))
                    }
                  />
                  <Label htmlFor={col.key} className="text-sm font-normal cursor-pointer">
                    {col.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Export Format */}
          <div className="space-y-4">
            <Label className="text-sm font-medium text-muted-foreground">Formato de Exportação</Label>
            <div className="flex gap-4">
              <Button
                variant={exportFormat === 'pdf' ? 'default' : 'outline'}
                onClick={() => setExportFormat('pdf')}
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button
                variant={exportFormat === 'excel' ? 'default' : 'outline'}
                onClick={() => setExportFormat('excel')}
                className="flex-1"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="text-sm text-muted-foreground">
              <strong>Preview:</strong> {filteredData.length} registro(s) serão incluídos no relatório
              {filteredData.length > 0 && filteredData.length <= 5 && (
                <ul className="mt-2 space-y-1">
                  {filteredData.map((row, idx) => (
                    <li key={idx} className="text-xs">
                      • {columns[0] ? formatCellValue(columns[0], row) : 'Registro'}
                    </li>
                  ))}
                </ul>
              )}
              {filteredData.length > 5 && (
                <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {filteredData.slice(0, 5).map((row, idx) => (
                    <li key={idx} className="text-xs">
                      • {columns[0] ? formatCellValue(columns[0], row) : 'Registro'}
                    </li>
                  ))}
                  <li className="text-xs text-primary">
                    ... e mais {filteredData.length - 5} registros
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={generating || filteredData.length === 0}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Baixar {exportFormat.toUpperCase()} ({filteredData.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
