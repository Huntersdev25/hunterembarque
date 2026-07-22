/**
 * Componente para seleção de certificações obrigatórias em vagas
 * Permite aos administradores escolher quais certificações são necessárias
 */
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CertificationRequirement {
  name: string;
  label: string;
  description?: string;
}

interface CertificationRequirementsProps {
  selectedCertifications: string[];
  onChange: (certifications: string[]) => void;
}

// Lista de todas as certificações disponíveis
const AVAILABLE_CERTIFICATIONS: CertificationRequirement[] = [
  { name: 'stcw', label: 'STCW', description: 'Standards of Training, Certification and Watchkeeping' },
  { name: 'cir', label: 'CIR', description: 'Carteira de Inscrição e Registro' },
  { name: 'tbs1', label: 'TBSI', description: 'Treinamento Básico de Segurança e Instrução' },
  { name: 'cbsp', label: 'CBSP', description: 'Curso Básico de Segurança de Plataforma' },
  { name: 'thuet', label: 'THUET', description: 'Treinamento em Escape de Helicópteros Submersos em Águas Tropicais' },
  { name: 'espe', label: 'ESPE', description: 'Especial básico de sobrevivência Pessoal' },
  { name: 'esrs', label: 'ESRS', description: 'Especial básico de Responsabilidade Social' },
  { name: 'ebps', label: 'EBPS', description: 'Especial básico de primeiro socorros' },
  { name: 'ecin', label: 'ECIN', description: 'Especial basico de Combate a Incêndio' },
  { name: 'ecia_caci', label: 'ECIA/CACI', description: 'Especial Avançado de Combate a Incêndio' },
  { name: 'ebcp', label: 'EBCP', description: 'Especial Básico de Conscientização Sobre Proteção de Navio ' },
  { name: 'eopn', label: 'EOPN', description: 'Especial para oficiais de Proteção de navio' },
  { name: 'epsm', label: 'EPSM', description: 'Especial Avançado Primeiros socorros' },
  { name: 'cess', label: 'CESS', description: 'Curso Especial de Embarcações de Sobrevivência e Salvamento' },
  { name: 'cerr', label: 'CERR', description: 'Curso Especial de Embarcação Rápida de Resgate' },
  { name: 'efnt', label: 'EFNT', description: 'Especial de Familiarização de Navios Tanques' },
  { name: 'ebpq', label: 'EBPQ', description: 'Especial Básico de Navios tanques Petroleiro e para produtos Químicos' },
  { name: 'ebgl', label: 'EBGL', description: 'Especial Básico de Navio tanque para Gás Liquefeito' },
  { name: 'esop', label: 'ESOP', description: 'Espsecial de segurança em operações de carga' },
  { name: 'alph', label: 'ALPH', description: 'Curso de Manobra e Combate a Incêndio de Aviação' },
  { name: 'cns014', label: 'CNS014', description: 'Radio Operador' },
  { name: 'lpn', label: 'LPN', description: 'Licença de Prático de Navegação' },
  { name: 'gmdss', label: 'GMDSS', description: 'Radio Comunicação' },
  { name: 'cft', label: 'CFT', description: 'Certificado de Formação Técnica' },
  { name: 'caaq', label: 'CAAQ', description: 'Curso de Adaptação para Aquaviários' },
  { name: 'dp', label: 'DP', description: 'Dynamic Positioning' }
];

export function CertificationRequirements({ selectedCertifications, onChange }: CertificationRequirementsProps) {
  /**
   * Gerencia a seleção/deseleção de certificações
   */
  const handleCertificationChange = (certificationName: string, checked: boolean) => {
    if (checked) {
      // Adiciona a certificação se não estiver na lista
      if (!selectedCertifications.includes(certificationName)) {
        onChange([...selectedCertifications, certificationName]);
      }
    } else {
      // Remove a certificação da lista
      onChange(selectedCertifications.filter(cert => cert !== certificationName));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Certificações Obrigatórias</CardTitle>
        <CardDescription>
          Selecione as certificações que são obrigatórias para esta vaga. 
          Candidatos sem essas certificações não poderão se candidatar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AVAILABLE_CERTIFICATIONS.map((certification) => (
            <div key={certification.name} className="flex items-start space-x-2">
              <Checkbox
                id={certification.name}
                checked={selectedCertifications.includes(certification.name)}
                onCheckedChange={(checked) => 
                  handleCertificationChange(certification.name, checked as boolean)
                }
              />
              <div className="grid gap-1.5 leading-none">
                <Label 
                  htmlFor={certification.name}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {certification.label}
                </Label>
                {certification.description && (
                  <p className="text-xs text-muted-foreground">
                    {certification.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {selectedCertifications.length > 0 && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-2">Certificações selecionadas:</h4>
            <div className="flex flex-wrap gap-2">
              {selectedCertifications.map((certName) => {
                const cert = AVAILABLE_CERTIFICATIONS.find(c => c.name === certName);
                return cert ? (
                  <span key={certName} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                    {cert.label}
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}