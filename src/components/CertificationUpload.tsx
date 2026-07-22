import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Upload, Calendar, AlertCircle, CheckCircle2, Download, Trash2, Eye } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { STCWRules } from "@/components/STCWRules";

// Lista de certificações disponíveis
const AVAILABLE_CERTIFICATIONS = [
  { id: 'stcw', name: 'STCW', description: 'International Convention on Standards of Training, Certification and Watchkeeping for Seafarers' },
  { id: 'cerr', name: 'CERR', description: 'Curso Especial de Embarcação Rápida de Resgate' },
  { id: 'efnt', name: 'EFNT', description: 'Especial de Familiarização de Navios Tanques' },
  { id: 'ebpq', name: 'EBPQ', description: 'Especial Básico de Navios tanques Petroleiro e para produtos Químicos' },
  { id: 'ebgl', name: 'EBGL', description: 'Especial Básico de Navio tanque para Gás Liquefeito' },
  { id: 'esop', name: 'ESOP', description: 'Especial de segurança em operações de carga' },
  { id: 'cns014', name: 'CNS-014', description: 'Radio Operador' },
  { id: 'lpn', name: 'LPN', description: 'Licença de pessoal de navegação aérea' },
  { id: 'gmdss', name: 'GMDSS', description: 'Radio Comunicação.' },
  { id: 'cft', name: 'CFT', description: 'Certificado de Formação Técnica' },
  { id: 'caaq', name: 'CAAQ', description: 'Curso de Adaptação para Aquaviários' },
  { id: 'cbsp', name: 'CBSP', description: 'Curso Básico de Segurança de Plataforma' },
  { id: 'tbs1', name: 'TBS-1', description: 'Treinamento Básico de Segurança e Instrução' },
  { id: 'cir', name: 'CIR', description: 'Carteira de Inscrição e Registro' },
  { id: 'thuet', name: 'THUET', description: 'Treinamento em Escape de Helicópteros Submersos em Águas Tropicais' },
  { id: 'alph', name: 'ALPH', description: 'Curso de Manobra e Combate a Incêndio de Aviação' },
  { id: 'espe', name: 'ESPE', description: 'Especial básico de sobrevivência Pessoal' },
  { id: 'esrs', name: 'ESRS', description: 'Especial básico de Responsabilidade Social' },
  { id: 'ebps', name: 'EBPS', description: 'Especial básico de primeiro socorros' },
  { id: 'ecin', name: 'ECIN', description: 'Especial basico de Combate a Incêndio' },
  { id: 'ecia_caci', name: 'ECIA/CACI', description: 'Especial Avançado de Combate a Incêndio' },
  { id: 'ebcp', name: 'EBCP', description: 'Especial Básico de Conscientização Sobre Proteção de Navio ' },
  { id: 'eopn', name: 'EOPN', description: 'Especial para oficiais de Proteção de navio' },
  { id: 'epsm', name: 'EPSM', description: 'Especial Avançado Primeiros socorros' },
  { id: 'cess', name: 'CESS', description: 'Curso Especial de Embarcações de Sobrevivência e Salvamento' },
  { id: 'dp', name: 'DP', description: 'Dynamic Positioning' }
];

interface CertificationData {
  [key: string]: {
    checked: boolean;
    issueDate: string;
    validityDate: string;
    isIndeterminate?: boolean;
    file?: File;
    dpBasico?: boolean;
    dpAvancado?: boolean;
    dpIlimitado?: boolean;
  };
}

interface CertificationUploadProps {
  certifications: any;
  onCertificationsChange: React.Dispatch<React.SetStateAction<any>>;
  onSave: (payload: any) => Promise<any>;
  userId: string;
}

export function CertificationUpload({ 
  certifications, 
  onCertificationsChange, 
  onSave, 
  userId 
}: CertificationUploadProps) {
  const [certificationData, setCertificationData] = useState<CertificationData>({});
  const [stcwRules, setStcwRules] = useState<any>({});
  const [uploading, setUploading] = useState(false);
  const [uploadAlertOpen, setUploadAlertOpen] = useState(false);
  const [lastUploadedCertName, setLastUploadedCertName] = useState("");

  // Convert ISO date (YYYY-MM-DD) to BR format (DD/MM/YYYY)
  const isoToBR = (isoDate: string | null | undefined): string => {
    if (!isoDate) return '';
    const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    return isoDate;
  };

  // Convert BR date (DD/MM/YYYY) to ISO format (YYYY-MM-DD)
  const brToISO = (brDate: string | null | undefined): string | null => {
    if (!brDate) return null;
    const match = brDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) return `${match[3]}-${match[2]}-${match[1]}`;
    return brDate;
  };

  // Parse a date string that may be BR (DD/MM/YYYY) or ISO (YYYY-MM-DD) into a Date object
  const parseDateAny = (dateStr: string): Date => {
    if (!dateStr) return new Date(NaN);
    const brMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brMatch) return new Date(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1]));
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return new Date(dateStr);
  };

  // Initialize certification data from props
  useEffect(() => {
    const initialData: CertificationData = {};
    
    AVAILABLE_CERTIFICATIONS.forEach(cert => {
      initialData[cert.id] = {
        checked: certifications?.[cert.id] || false,
        issueDate: isoToBR(certifications?.[`${cert.id}_issue_date`]),
        validityDate: isoToBR(certifications?.[`${cert.id}_validity`]),
        isIndeterminate: certifications?.[`${cert.id}_indeterminate`] || false,
        dpBasico: certifications?.[`${cert.id}_dp_basico`] || false,
        dpAvancado: certifications?.[`${cert.id}_dp_avancado`] || false,
        dpIlimitado: certifications?.[`${cert.id}_dp_ilimitado`] || false
      };
    });
    
    setCertificationData(initialData);
    setStcwRules(certifications?.stcw_rules || {});
  }, [certifications]);

  const handleSTCWRulesChange = (rules: any) => {
    setStcwRules(rules);
    onCertificationsChange((prev: any) => ({
      ...prev,
      stcw_rules: rules,
    }));
  };

  const handleCertificationChange = (certId: string, field: string, value: any) => {
    setCertificationData(prev => ({
      ...prev,
      [certId]: {
        ...prev[certId],
        [field]: value
      }
    }));

    onCertificationsChange((prev: any) => {
      const updatedCertifications = { ...prev };

      if (field === 'checked') {
        updatedCertifications[certId] = value;

        if (!value) {
          updatedCertifications[`${certId}_issue_date`] = null;
          updatedCertifications[`${certId}_validity`] = null;
          updatedCertifications[`${certId}_file_path`] = null;
          updatedCertifications[`${certId}_file_name`] = null;
          updatedCertifications[`${certId}_dp_basico`] = null;
          updatedCertifications[`${certId}_dp_avancado`] = null;
          updatedCertifications[`${certId}_dp_ilimitado`] = null;
        }
      } else if (field === 'issueDate') {
        updatedCertifications[`${certId}_issue_date`] = value?.length === 10 ? brToISO(value) : (value || null);
      } else if (field === 'validityDate') {
        if (updatedCertifications[certId]) {
          updatedCertifications[`${certId}_validity`] = value?.length === 10 ? brToISO(value) : (value || null);
        }
      } else if (field === 'isIndeterminate') {
        updatedCertifications[`${certId}_indeterminate`] = value;
        if (value) {
          updatedCertifications[`${certId}_validity`] = null;
        }
      } else if (field === 'dpBasico') {
        updatedCertifications[`${certId}_dp_basico`] = value;
      } else if (field === 'dpAvancado') {
        updatedCertifications[`${certId}_dp_avancado`] = value;
      } else if (field === 'dpIlimitado') {
        updatedCertifications[`${certId}_dp_ilimitado`] = value;
      }

      return updatedCertifications;
    });
  };

  const handleDateChange = (certId: string, field: string, value: string) => {
    // Permitir digitação livre, validar apenas quando campo perde foco ou está completo
    if (value.length === 10 && !validateDateFormat(value)) {
      toast.error("Formato de data inválido. Use DD/MM/YYYY");
      return;
    }
    
    // Validação adicional para datas de validade não serem anteriores às de emissão
    if (field === 'validityDate' && value.length === 10) {
      const issueDate = certificationData[certId]?.issueDate;
      if (issueDate && issueDate.length === 10 && !validateDateRange(issueDate, value)) {
        toast.error("A data de validade não pode ser anterior à data de emissão");
        return;
      }
    }
    
    handleCertificationChange(certId, field, value);
  };

  const validateDateFormat = (dateString: string): boolean => {
    if (!dateString) return true; // Empty is valid
    
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dateString.match(regex);
    
    if (!match) return false;
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    // Verificar se é uma data válida
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && 
           date.getMonth() === month - 1 && 
           date.getDate() === day &&
           day >= 1 && day <= 31 &&
           month >= 1 && month <= 12;
  };

  const validateDateRange = (issueDateStr: string, validityDateStr: string): boolean => {
    if (!issueDateStr || !validityDateStr) return true;
    
    // Se não tem 10 caracteres (DD/MM/YYYY), não validar ainda
    if (issueDateStr.length !== 10 || validityDateStr.length !== 10) return true;
    
    const parseDate = (dateStr: string) => {
      const [day, month, year] = dateStr.split('/').map(Number);
      return new Date(year, month - 1, day);
    };
    
    const issueDate = parseDate(issueDateStr);
    const validityDate = parseDate(validityDateStr);
    
    return validityDate >= issueDate;
  };

  const validateDates = (issueDate: string, validityDate: string): boolean => {
    if (!issueDate || !validityDate) return true; // Allow empty dates
    
    const issue = new Date(issueDate);
    const validity = new Date(validityDate);
    
    if (validity <= issue) {
      toast.error("Data de validade deve ser posterior à data de emissão");
      return false;
    }
    
    return true;
  };

  const handleFileUpload = async (certId: string, file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Apenas arquivos PDF, JPEG ou PNG são aceitos");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo deve ter no máximo 5MB");
      return;
    }

    setUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${certId}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('feed-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Salvar informações do arquivo no banco
      onCertificationsChange((prev: any) => ({
        ...prev,
        [`${certId}_file_path`]: fileName,
        [`${certId}_file_name`]: file.name,
      }));

      handleCertificationChange(certId, 'file', file);
      const certName = AVAILABLE_CERTIFICATIONS.find(c => c.id === certId)?.name || certId;
      setLastUploadedCertName(certName);
      setUploadAlertOpen(true);
      
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error("Erro ao enviar documento: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  /**
   * Visualiza o arquivo de certificação em nova aba
   */
  const handleViewFile = async (certId: string) => {
    try {
      const filePath = certifications[`${certId}_file_path`];
      if (!filePath) {
        toast.error("Arquivo não encontrado");
        return;
      }

      const { data, error } = await supabase.storage
        .from('feed-documents')
        .createSignedUrl(filePath, 3600);

      if (error) throw error;
      if (!data?.signedUrl) throw new Error('URL assinada não foi gerada');

      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      console.error('View error:', error);
      toast.error("Erro ao visualizar documento: " + error.message);
    }
  };

  /**
   * Faz download do arquivo de certificação
   */
  const handleDownloadFile = async (certId: string) => {
    try {
      const filePath = certifications[`${certId}_file_path`];
      const fileName = certifications[`${certId}_file_name`];
      
      if (!filePath) {
        toast.error("Arquivo não encontrado");
        return;
      }

      const { data, error } = await supabase.storage
        .from('feed-documents')
        .download(filePath);

      if (error) throw error;

      // Determinar extensão do arquivo baseada no nome original ou tipo MIME
      const fileExtension = fileName ? fileName.split('.').pop() : 'pdf';
      const downloadName = fileName || `${certId}_certificate.${fileExtension}`;

      // Criar URL do blob e fazer download com extensão correta
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Download concluído com sucesso");
      
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error("Erro ao baixar documento: " + error.message);
    }
  };

  /**
   * Exclui o arquivo de certificação
   */
  const handleDeleteFile = async (certId: string) => {
    if (!confirm('Tem certeza que deseja excluir este arquivo?')) return;

    try {
      const filePath = certifications[`${certId}_file_path`];
      
      if (!filePath) {
        toast.error("Arquivo não encontrado");
        return;
      }

      // Remove do storage
      const { error } = await supabase.storage
        .from('feed-documents')
        .remove([filePath]);

      if (error) throw error;

      // Atualiza o estado local e no banco
      onCertificationsChange((prev: any) => ({
        ...prev,
        [`${certId}_file_path`]: null,
        [`${certId}_file_name`]: null,
      }));

      // Limpa o arquivo temporário do estado local
      setCertificationData(prev => ({
        ...prev,
        [certId]: {
          ...prev[certId],
          file: undefined
        }
      }));

      toast.success("Arquivo excluído com sucesso");
      
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error("Erro ao excluir documento: " + error.message);
    }
  };

  const isValidityExpired = (validityDate: string): boolean => {
    if (!validityDate) return false;
    const d = parseDateAny(validityDate);
    return !isNaN(d.getTime()) && d < new Date();
  };

  const isValidityExpiringSoon = (validityDate: string): boolean => {
    if (!validityDate) return false;
    const validity = parseDateAny(validityDate);
    if (isNaN(validity.getTime())) return false;
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return validity <= thirtyDaysFromNow && validity >= new Date();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Certificações Marítimas</CardTitle>
        <CardDescription>
          Selecione suas certificações e informe as datas de emissão e validade
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {AVAILABLE_CERTIFICATIONS.map((cert) => {
          const data = certificationData[cert.id] || { checked: false, issueDate: '', validityDate: '' };
          const isExpired = isValidityExpired(data.validityDate);
          const isExpiringSoon = isValidityExpiringSoon(data.validityDate);
          
          return (
            <div key={cert.id} className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id={cert.id}
                  checked={data.checked}
                  onCheckedChange={(checked) => 
                    handleCertificationChange(cert.id, 'checked', checked)
                  }
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={cert.id} className="font-medium">
                      {cert.name}
                    </Label>
                    {data.checked && isExpired && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Vencida
                      </Badge>
                    )}
                    {data.checked && isExpiringSoon && !isExpired && (
                      <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Vence em breve
                      </Badge>
                    )}
                    {data.checked && !isExpired && !isExpiringSoon && data.validityDate && (
                      <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Válida
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {cert.description}
                  </p>
                </div>
              </div>

               {data.checked && (
                 <div className="ml-6 space-y-4">
                    {/* Regras STCW para a certificação STCW */}
                    {cert.id === 'stcw' && (
                      <STCWRules 
                        rules={stcwRules}
                        onChange={handleSTCWRulesChange}
                      />
                    )}

                    {/* Níveis DP para certificação Dynamic Positioning */}
                    {cert.id === 'dp' && (
                      <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                        <Label className="text-sm font-medium">Níveis de DP (Dynamic Positioning)</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`${cert.id}_dp_basico`}
                              checked={data.dpBasico || false}
                              onCheckedChange={(checked) => 
                                handleCertificationChange(cert.id, 'dpBasico', checked)
                              }
                            />
                            <Label htmlFor={`${cert.id}_dp_basico`} className="text-sm">
                              Nível Básico
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`${cert.id}_dp_avancado`}
                              checked={data.dpAvancado || false}
                              onCheckedChange={(checked) => 
                                handleCertificationChange(cert.id, 'dpAvancado', checked)
                              }
                            />
                            <Label htmlFor={`${cert.id}_dp_avancado`} className="text-sm">
                              Nível Avançado
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`${cert.id}_dp_ilimitado`}
                              checked={data.dpIlimitado || false}
                              onCheckedChange={(checked) => 
                                handleCertificationChange(cert.id, 'dpIlimitado', checked)
                              }
                            />
                            <Label htmlFor={`${cert.id}_dp_ilimitado`} className="text-sm">
                              Ilimitado
                            </Label>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label htmlFor={`${cert.id}_issue`}>
                         <Calendar className="h-4 w-4 inline mr-1" />
                         Data de Emissão (DD/MM/YYYY)
                       </Label>
                        <Input
                          id={`${cert.id}_issue`}
                          type="text"
                          value={data.issueDate}
                          onChange={(e) => {
                            let value = e.target.value.replace(/\D/g, ''); // Remove não-dígitos
                            if (value.length >= 3 && value.length <= 4) {
                              value = value.slice(0, 2) + '/' + value.slice(2);
                            } else if (value.length > 4) {
                              value = value.slice(0, 2) + '/' + value.slice(2, 4) + '/' + value.slice(4, 8);
                            }
                            handleDateChange(cert.id, 'issueDate', value);
                          }}
                          placeholder="DD/MM/YYYY"
                          maxLength={10}
                        />
                     </div>
                     
                      <div className="space-y-2">
                         <Label htmlFor={`${cert.id}_validity`}>
                           <Calendar className="h-4 w-4 inline mr-1" />
                           Data de Validade {!data.isIndeterminate ? '(DD/MM/YYYY) *' : ''}
                         </Label>
                         <Input
                           id={`${cert.id}_validity`}
                           type="text"
                           value={data.validityDate}
                           onChange={(e) => {
                             let value = e.target.value.replace(/\D/g, ''); // Remove não-dígitos
                             if (value.length >= 3 && value.length <= 4) {
                               value = value.slice(0, 2) + '/' + value.slice(2);
                             } else if (value.length > 4) {
                               value = value.slice(0, 2) + '/' + value.slice(2, 4) + '/' + value.slice(4, 8);
                             }
                             handleDateChange(cert.id, 'validityDate', value);
                           }}
                            disabled={data.isIndeterminate}
                            placeholder={data.isIndeterminate ? "Validade indeterminada" : "DD/MM/YYYY"}
                           maxLength={10}
                         />
                      </div>
                     </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${cert.id}_indeterminate`}
                        checked={data.isIndeterminate || false}
                        onCheckedChange={(checked) => 
                          handleCertificationChange(cert.id, 'isIndeterminate', checked)
                        }
                      />
                      <Label htmlFor={`${cert.id}_indeterminate`} className="text-sm text-muted-foreground">
                        Certificação com validade indeterminada
                      </Label>
                    </div>
                   

                   <div className="space-y-2">
                    <Label htmlFor={`${cert.id}_file`}>
                      <Upload className="h-4 w-4 inline mr-1" />
                      Documento da Certificação (PDF, JPG, PNG - máx 5MB)
                    </Label>
                    {/* Mostrar arquivo anexado existente */}
                    {certifications[`${cert.id}_file_path`] ? (
                      <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm text-green-800 dark:text-green-300 flex-1 truncate">
                          Documento anexado: {certifications[`${cert.id}_file_name`] || `${cert.name} Certificate`}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewFile(cert.id)}
                            title="Visualizar arquivo"
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadFile(cert.id)}
                            title="Baixar arquivo"
                            className="text-green-600 hover:text-green-700 dark:text-green-400"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteFile(cert.id)}
                            title="Excluir arquivo"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Input
                          id={`${cert.id}_file`}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(cert.id, file);
                            }
                          }}
                          disabled={uploading}
                        />
                        {/* Arquivo temporário (recém enviado) */}
                        {data.file && (
                          <p className="text-sm text-green-600">
                            <CheckCircle2 className="h-4 w-4 inline mr-1" />
                            Documento enviado: {data.file.name}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        
        {/* Alert Dialog de confirmação de upload */}
        <AlertDialog open={uploadAlertOpen} onOpenChange={setUploadAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Arquivo Anexado com Sucesso!
              </AlertDialogTitle>
              <AlertDialogDescription>
                O documento da certificação <strong>{lastUploadedCertName}</strong> foi anexado com sucesso. 
                Você pode visualizar, baixar ou excluir o arquivo a qualquer momento.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction>Entendido</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button 
          type="button"
          onClick={async () => {
            const invalidCerts: string[] = [];
            const dateValidationErrors: string[] = [];
            const payload: Record<string, any> = {
              stcw_rules: stcwRules,
            };

            for (const cert of AVAILABLE_CERTIFICATIONS) {
              const data = certificationData[cert.id];
              payload[cert.id] = Boolean(data?.checked);
              payload[`${cert.id}_issue_date`] = data?.issueDate?.length === 10 ? brToISO(data.issueDate) : null;
              payload[`${cert.id}_validity`] = data?.isIndeterminate ? null : (data?.validityDate?.length === 10 ? brToISO(data.validityDate) : null);
              payload[`${cert.id}_indeterminate`] = Boolean(data?.isIndeterminate);

              // DP levels only for the 'dp' certification
              if (cert.id === 'dp') {
                payload[`${cert.id}_dp_basico`] = Boolean(data?.dpBasico);
                payload[`${cert.id}_dp_avancado`] = Boolean(data?.dpAvancado);
                payload[`${cert.id}_dp_ilimitado`] = Boolean(data?.dpIlimitado);
              }

              if (data?.checked) {
                if (!data.issueDate || (!data.validityDate && !data.isIndeterminate)) {
                  invalidCerts.push(cert.name);
                } else if (data.issueDate && data.validityDate && !data.isIndeterminate && !validateDateRange(data.issueDate, data.validityDate)) {
                  dateValidationErrors.push(`A data de validade não pode ser anterior à data de emissão para ${cert.name}`);
                }
              }
            }

            // Preserve file paths from parent state
            Object.keys(certifications || {}).forEach((key) => {
              if (key.endsWith('_file_path') || key.endsWith('_file_name')) {
                payload[key] = certifications[key];
              }
            });

            if (invalidCerts.length > 0) {
              toast.error(`Preencha as datas de emissão e validade para: ${invalidCerts.join(', ')}`);
              return;
            }

            if (dateValidationErrors.length > 0) {
              toast.error(dateValidationErrors.join('. '));
              return;
            }

            await onSave(payload);
          }} 
          disabled={uploading}
          className="w-full"
        >
          {uploading ? "Enviando..." : "Salvar Certificações"}
        </Button>
      </CardContent>
    </Card>
  );
}