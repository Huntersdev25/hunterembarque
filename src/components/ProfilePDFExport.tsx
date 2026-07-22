import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download } from "lucide-react";
import jsPDF from 'jspdf';
import { useState } from "react";
import huntersWatermark from "@/assets/hunters-watermark.png";

interface ProfilePDFExportProps {
  profileData: any;
  certifications?: any;
  isLoading?: boolean;
}

export function ProfilePDFExport({ profileData, certifications, isLoading }: ProfilePDFExportProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const formatLanguages = (languagesString?: string) => {
    if (!languagesString) return [];
    try {
      const languages = JSON.parse(languagesString);
      if (Array.isArray(languages) && languages.length > 0) {
        return languages.map(lang => {
          const name = lang.name || lang.language || "Idioma";
          const level = lang.level || "basic";
          const levelLabels: {[key: string]: string} = {
            basic: "Iniciante",
            intermediate: "Intermediário", 
            advanced: "Avançado",
            fluent: "Fluente",
            native: "Nativo"
          };
          return { name, level: levelLabels[level] || level };
        });
      }
    } catch (error) {
      console.error("Erro ao fazer parse dos idiomas:", error);
    }
    return [];
  };

  const getActiveCertifications = () => {
    if (!certifications) return [];
    
    const activeCerts: string[] = [];
    const certNames: {[key: string]: string} = {
      cir: "CIR",
      stcw: "STCW", 
      tbs1: "TBS-1",
      cbsp: "CBSP",
      thuet: "THUET",
      espe: "ESPE",
      esrs: "ESRS",
      ebps: "EBPS",
      ecin: "ECIN",
      ecia_caci: "ECIA/CACI",
      ebcp: "EBCP",
      eopn: "EOPN",
      epsm: "EPSM",
      cess: "CESS",
      cerr: "CERR",
      efnt: "EFNT",
      ebpq: "EBPQ",
      ebgl: "EBGL",
      esop: "ESOP",
      alph: "ALPH",
      cns014: "CNS-014",
      lpn: "LPN",
      gmdss: "GMDSS",
      cft: "CFT",
      caaq: "CAAQ",
      dp: "DP"
    };

    for (const [key, name] of Object.entries(certNames)) {
      if (certifications[key]) {
        activeCerts.push(name);
      }
    }

    return activeCerts;
  };

  const getCityLocation = () => {
    if (profileData.city && profileData.state) {
      return `${profileData.city} - ${profileData.state}`;
    } else if (profileData.city) {
      return profileData.city;
    } else if (profileData.residence_location) {
      return profileData.residence_location;
    }
    return "";
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return "";
    const cleaned = phone.replace(/[^\d]/g, '');
    if (cleaned.length >= 10) {
      const ddd = cleaned.slice(-11, -9) || cleaned.slice(0, 2);
      const firstPart = cleaned.slice(-9, -4);
      const secondPart = cleaned.slice(-4);
      return `(${ddd}) ${firstPart}-${secondPart}`;
    }
    return phone;
  };

  const generatePDF = async () => {
    if (!profileData) {
      toast({
        title: "Erro",
        description: "Dados do perfil não encontrados.",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
      
      // Cores
      const primaryBlue = { r: 0, g: 112, b: 192 }; // Azul do modelo
      const darkBlue = { r: 0, g: 70, b: 127 };
      const textBlue = { r: 0, g: 112, b: 192 };
      const textGray = { r: 80, g: 80, b: 80 };
      const lightGray = { r: 245, g: 245, b: 245 };

      // ========== HEADER AZUL ==========
      pdf.setFillColor(primaryBlue.r, primaryBlue.g, primaryBlue.b);
      pdf.rect(0, 0, pageWidth, 50, 'F');

      // ========== FOTO (canto direito do header) ==========
      const photoSize = 40;
      const photoX = pageWidth - photoSize - 15;
      const photoY = 5;

      // Nome do candidato
      const fullName = (profileData.full_name || 'NOME').toUpperCase();
      const maxNameWidth = photoX - 20;
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(32);
      pdf.setFont('helvetica', 'bold');
      
      let nameFontSize = 32;
      while (pdf.getTextWidth(fullName) > maxNameWidth && nameFontSize > 16) {
        nameFontSize -= 2;
        pdf.setFontSize(nameFontSize);
      }
      
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      pdf.setFont('helvetica', 'normal');
      pdf.text(firstName, 15, 25);
      
      if (lastName) {
        pdf.setFont('helvetica', 'bold');
        const combinedWidth = pdf.getTextWidth(firstName + ' ' + lastName);
        const lastNameText = combinedWidth > maxNameWidth
          ? lastName.substring(0, Math.floor(maxNameWidth / (pdf.getTextWidth('A')) * 0.6)) + '...'
          : lastName;
        pdf.text(lastNameText, 15 + pdf.getTextWidth(firstName + ' '), 25);
      }
      
      // Função/Título
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      const jobTitle = (profileData.desired_function || 'PROFISSIONAL MARITIMO').toUpperCase();
      pdf.text(jobTitle, 15, 38);
      
      // Borda azul escura
      pdf.setFillColor(darkBlue.r, darkBlue.g, darkBlue.b);
      pdf.circle(photoX + photoSize/2, photoY + photoSize/2, photoSize/2 + 3, 'F');
      
      // Círculo branco interno
      pdf.setFillColor(255, 255, 255);
      pdf.circle(photoX + photoSize/2, photoY + photoSize/2, photoSize/2, 'F');
      
      // Adicionar foto se disponível
      if (profileData.avatar_url) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          await new Promise((resolve) => {
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d')!;
              const size = 300;
              canvas.width = size;
              canvas.height = size;
              
              // Máscara circular
              ctx.beginPath();
              ctx.arc(size/2, size/2, size/2, 0, 2 * Math.PI);
              ctx.clip();
              
              // Calcular proporção da imagem
              const imgAspect = img.width / img.height;
              let drawWidth = size;
              let drawHeight = size;
              let drawX = 0;
              let drawY = 0;
              
              if (imgAspect > 1) {
                drawWidth = size * imgAspect;
                drawX = -(drawWidth - size) / 2;
              } else {
                drawHeight = size / imgAspect;
                drawY = -(drawHeight - size) / 2;
              }
              
              ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
              
              const imgData = canvas.toDataURL('image/png', 1.0);
              pdf.addImage(imgData, 'PNG', photoX, photoY, photoSize, photoSize);
              resolve(true);
            };
            img.onerror = () => resolve(false);
            img.src = profileData.avatar_url;
          });
        } catch (error) {
          console.log('Erro ao carregar foto:', error);
        }
      }

      // ========== ÁREA DE CONTEÚDO (fundo cinza claro) ==========
      pdf.setFillColor(lightGray.r, lightGray.g, lightGray.b);
      pdf.rect(0, 50, pageWidth, pageHeight - 50, 'F');

      // ========== LAYOUT DE DUAS COLUNAS ==========
      const leftColumnX = 15;
      const leftColumnWidth = 75;
      const rightColumnX = 100;
      const rightColumnWidth = 95;
      let leftY = 62;
      let rightY = 62;

      // ========== COLUNA ESQUERDA ==========
      
      // --- CONTATOS ---
      pdf.setTextColor(textBlue.r, textBlue.g, textBlue.b);
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CONTATOS', leftColumnX, leftY);
      leftY += 8;
      
      pdf.setTextColor(textGray.r, textGray.g, textGray.b);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      
      // Telefone
      const phone = formatPhone(profileData.phone);
      if (phone) {
        pdf.text(phone, leftColumnX, leftY);
        leftY += 5;
      }
      
      // Email
      if (profileData.email) {
        pdf.text(profileData.email, leftColumnX, leftY);
        leftY += 5;
      }
      
      // Localização
      const location = getCityLocation();
      if (location) {
        pdf.text(location, leftColumnX, leftY);
        leftY += 5;
      }
      
      leftY += 8;

      // --- SOBRE MIM ---
      pdf.setTextColor(textBlue.r, textBlue.g, textBlue.b);
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SOBRE MIM', leftColumnX, leftY);
      leftY += 2;
      
      // Linha vertical azul decorativa
      const sobreMimStartY = leftY;
      leftY += 6;
      
      pdf.setTextColor(textGray.r, textGray.g, textGray.b);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      
      const aboutText = profileData.professional_experience || 
        `Profissional da area maritima com experiencia. Objetivo: trabalhar como ${profileData.desired_function || 'profissional maritimo'}.`;
      const aboutLines = pdf.splitTextToSize(aboutText, leftColumnWidth - 10);
      const maxAboutLines = Math.min(aboutLines.length, 6);
      
      for (let i = 0; i < maxAboutLines; i++) {
        pdf.text(aboutLines[i], leftColumnX + 5, leftY);
        leftY += 4;
      }
      
      // Desenhar linha vertical azul
      pdf.setDrawColor(textBlue.r, textBlue.g, textBlue.b);
      pdf.setLineWidth(1.5);
      pdf.line(leftColumnX, sobreMimStartY + 2, leftColumnX, leftY - 2);
      
      leftY += 8;

      // --- HABILIDADES ---
      pdf.setTextColor(textBlue.r, textBlue.g, textBlue.b);
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.text('HABILIDADES', leftColumnX, leftY);
      leftY += 2;
      
      const habilidadesStartY = leftY;
      leftY += 6;
      
      pdf.setTextColor(textGray.r, textGray.g, textGray.b);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      
      const skills = [
        'Trabalho em equipe',
        'Comunicacao',
        'Organizacao e disciplina',
        'Seguranca maritima',
        'Adaptabilidade'
      ];
      
      skills.forEach((skill) => {
        pdf.text('- ' + skill, leftColumnX + 5, leftY);
        leftY += 4;
      });
      
      // Linha vertical azul
      pdf.setDrawColor(textBlue.r, textBlue.g, textBlue.b);
      pdf.setLineWidth(1.5);
      pdf.line(leftColumnX, habilidadesStartY + 2, leftColumnX, leftY - 2);
      
      leftY += 8;

      // --- IDIOMAS ---
      pdf.setTextColor(textBlue.r, textBlue.g, textBlue.b);
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.text('IDIOMAS', leftColumnX, leftY);
      leftY += 2;
      
      const idiomasStartY = leftY;
      leftY += 6;
      
      pdf.setTextColor(textGray.r, textGray.g, textGray.b);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      
      const languages = formatLanguages(profileData.languages);
      if (languages.length > 0) {
        languages.forEach((lang) => {
          pdf.text(`${lang.name} (${lang.level})`, leftColumnX + 5, leftY);
          leftY += 4;
        });
      } else {
        pdf.text('Portugues (Nativo)', leftColumnX + 5, leftY);
        leftY += 4;
      }
      
      // Linha vertical azul
      pdf.setDrawColor(textBlue.r, textBlue.g, textBlue.b);
      pdf.setLineWidth(1.5);
      pdf.line(leftColumnX, idiomasStartY + 2, leftColumnX, leftY - 2);
      
      leftY += 8;

      // (EXTRAS removido - certificados já exibidos na coluna direita)

      // ========== COLUNA DIREITA ==========

      // --- CERTIFICADOS E CURSOS ---
      pdf.setTextColor(textBlue.r, textBlue.g, textBlue.b);
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CERTIFICADOS E CURSOS', rightColumnX, rightY);
      rightY += 8;
      
      pdf.setTextColor(textGray.r, textGray.g, textGray.b);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      
      const certDetails: {key: string, name: string, fullName: string}[] = [
        { key: 'cir', name: 'CIR', fullName: 'Caderneta de Inscricao e Registro' },
        { key: 'stcw', name: 'STCW', fullName: 'Certificacao Internacional STCW' },
        { key: 'tbs1', name: 'TBS-1', fullName: 'Treinamento Basico de Seguranca' },
        { key: 'cbsp', name: 'CBSP', fullName: 'Curso Basico de Seguranca de Plataforma' },
        { key: 'thuet', name: 'THUET', fullName: 'Treinamento de Fuga de Helicoptero' },
        { key: 'espe', name: 'ESPE', fullName: 'Especializacao em Seguranca' },
        { key: 'esrs', name: 'ESRS', fullName: 'Embarcacoes de Salvamento' },
        { key: 'ebps', name: 'EBPS', fullName: 'Prevencao e Combate a Incendio' },
        { key: 'ecin', name: 'ECIN', fullName: 'Combate a Incendio' },
        { key: 'ecia_caci', name: 'ECIA/CACI', fullName: 'Controle Avancado de Incendio' },
        { key: 'ebcp', name: 'EBCP', fullName: 'Controle de Poluicao' },
        { key: 'eopn', name: 'EOPN', fullName: 'Operacao de Navio' },
        { key: 'epsm', name: 'EPSM', fullName: 'Primeiros Socorros Medicos' },
        { key: 'cess', name: 'CESS', fullName: 'Seguranca de Embarcacao' },
        { key: 'cerr', name: 'CERR', fullName: 'Registro e Regulamentacao' },
        { key: 'efnt', name: 'EFNT', fullName: 'Formacao Nautica' },
        { key: 'ebpq', name: 'EBPQ', fullName: 'Produtos Quimicos' },
        { key: 'ebgl', name: 'EBGL', fullName: 'Gas Liquefeito' },
        { key: 'esop', name: 'ESOP', fullName: 'Seguranca em Operacoes' },
        { key: 'alph', name: 'ALPH', fullName: 'Aquaviario de Longo Percurso' },
        { key: 'cns014', name: 'CNS-014', fullName: 'Norma de Seguranca CNS-014' },
        { key: 'lpn', name: 'LPN', fullName: 'Livro de Ponto Nautico' },
        { key: 'gmdss', name: 'GMDSS', fullName: 'Sistema Global de Socorro' },
        { key: 'cft', name: 'CFT', fullName: 'Certificado de Formacao Tecnica' },
        { key: 'caaq', name: 'CAAQ', fullName: 'Curso de Adaptacao Aquaviario' },
        { key: 'dp', name: 'DP', fullName: 'Posicionamento Dinamico' },
      ];
      
      const activeCertDetails = certDetails.filter(c => certifications?.[c.key]);
      
      if (activeCertDetails.length > 0) {
        const maxCertsToShow = Math.min(activeCertDetails.length, 12);
        for (let i = 0; i < maxCertsToShow; i++) {
          const cert = activeCertDetails[i];
          const validityKey = `${cert.key}_validity`;
          const validity = certifications?.[validityKey];
          
          pdf.setFont('helvetica', 'bold');
          pdf.text(cert.name, rightColumnX, rightY);
          pdf.setFont('helvetica', 'normal');
          const nameWidth = pdf.getTextWidth(cert.name + '  ');
          pdf.text('- ' + cert.fullName, rightColumnX + nameWidth, rightY);
          rightY += 4;
          
          if (validity) {
            const formattedDate = new Date(validity).toLocaleDateString('pt-BR');
            pdf.setFontSize(7);
            pdf.text(`Validade: ${formattedDate}`, rightColumnX + 3, rightY);
            pdf.setFontSize(8);
            rightY += 4;
          }
        }
        if (activeCertDetails.length > maxCertsToShow) {
          pdf.text(`+ ${activeCertDetails.length - maxCertsToShow} certificado(s) adicionais`, rightColumnX, rightY);
          rightY += 4;
        }
      } else {
        pdf.text('Nenhum certificado registrado', rightColumnX, rightY);
        rightY += 4;
      }
      
      rightY += 5;

      // --- EXPERIÊNCIA PROFISSIONAL ---
      pdf.setTextColor(textBlue.r, textBlue.g, textBlue.b);
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.text('EXPERIENCIA PROFISSIONAL', rightColumnX, rightY);
      rightY += 8;
      
      pdf.setTextColor(textGray.r, textGray.g, textGray.b);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      
      // Experiência profissional
      const experience = profileData.professional_experience;
      if (experience) {
        const expLines = pdf.splitTextToSize(experience, rightColumnWidth);
        expLines.slice(0, 8).forEach((line: string) => {
          pdf.text(line, rightColumnX, rightY);
          rightY += 4;
        });
      } else {
        pdf.text(`Funcao: ${(profileData.desired_function || 'MARITIMO').toUpperCase()}`, rightColumnX, rightY);
        rightY += 6;
      }
      
      rightY += 8;

      // --- TIPO DE EMBARCAÇÃO ---
      if (profileData.vessel_type) {
        pdf.setTextColor(textBlue.r, textBlue.g, textBlue.b);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Tipo de Embarcacao', rightColumnX, rightY);
        rightY += 5;
        
        pdf.setTextColor(textGray.r, textGray.g, textGray.b);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(profileData.vessel_type.toUpperCase(), rightColumnX, rightY);
      }

      // ========== MARCA D'ÁGUA (canto inferior direito) ==========
      try {
        const watermarkImg = new Image();
        watermarkImg.src = huntersWatermark;
        
        await new Promise((resolve) => {
          watermarkImg.onload = () => {
            const wmWidth = 35;
            const wmHeight = (watermarkImg.height / watermarkImg.width) * wmWidth;
            const wmX = pageWidth - wmWidth - 10;
            const wmY = pageHeight - wmHeight - 10;
            
            // Adicionar marca d'água com opacidade reduzida
            pdf.setGState(new (pdf as any).GState({ opacity: 0.3 }));
            pdf.addImage(huntersWatermark, 'PNG', wmX, wmY, wmWidth, wmHeight);
            pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
            
            resolve(true);
          };
          watermarkImg.onerror = () => resolve(false);
        });
      } catch (error) {
        console.log('Erro ao adicionar marca d\'água:', error);
      }

      // Salvar o PDF
      const fileName = profileData.full_name?.replace(/\s+/g, '-').toLowerCase() || 'curriculo';
      pdf.save(`curriculo-${fileName}.pdf`);
      
      toast({
        title: "Sucesso",
        description: "Curriculo gerado com sucesso!",
      });

    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        title: "Erro",
        description: "Erro ao gerar o curriculo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button 
      onClick={generatePDF}
      disabled={isLoading || generating}
      variant="outline"
      className="w-full"
    >
      <Download className="h-4 w-4 mr-2" />
      {generating ? "Gerando..." : "Gerar Curriculo"}
    </Button>
  );
}
