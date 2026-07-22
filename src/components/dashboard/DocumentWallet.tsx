import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wallet, CheckCircle2, AlertTriangle, XCircle, FileText, ArrowRight, Shield } from "lucide-react";
import { Link } from "react-router-dom";

interface CertificationStatus {
  name: string;
  label: string;
  fullName?: string;
  hasIt: boolean;
  validity: string | null;
  isIndeterminate?: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  hasAttachment: boolean;
}

interface DocumentWalletProps {
  certifications: CertificationStatus[];
}

export function DocumentWallet({ certifications }: DocumentWalletProps) {
  const withDocs = certifications.filter(c => c.hasAttachment);
  const withoutDocs = certifications.filter(c => c.hasIt && !c.hasAttachment);
  const valid = certifications.filter(c => c.hasIt && !c.isExpired && !c.isExpiringSoon);
  const expiring = certifications.filter(c => c.isExpiringSoon);
  const expired = certifications.filter(c => c.isExpired);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Wallet className="h-4 w-4 text-violet-600" />
          </div>
          Carteira Digital
          <Badge variant="outline" className="ml-auto text-xs">
            {certifications.filter(c => c.hasIt).length} docs
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-800/30 text-center">
            <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-600">{valid.length}</p>
            <p className="text-[10px] text-green-600/80">Válidos</p>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 text-center">
            <AlertTriangle className="h-4 w-4 text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-amber-600">{expiring.length}</p>
            <p className="text-[10px] text-amber-600/80">Vencendo</p>
          </div>
          <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/30 text-center">
            <XCircle className="h-4 w-4 text-red-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-red-600">{expired.length}</p>
            <p className="text-[10px] text-red-600/80">Vencidos</p>
          </div>
        </div>

        {/* Document chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {certifications.filter(c => c.hasIt).slice(0, 12).map(cert => {
            let chipClass = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
            if (cert.isExpired) chipClass = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
            else if (cert.isExpiringSoon) chipClass = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
            
            return (
              <div key={cert.name} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium ${chipClass}`}>
                {cert.hasAttachment ? (
                  <FileText className="h-2.5 w-2.5" />
                ) : (
                  <Shield className="h-2.5 w-2.5 opacity-50" />
                )}
                {cert.label}
              </div>
            );
          })}
        </div>

        {/* Missing attachments warning */}
        {withoutDocs.length > 0 && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 mb-3">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              <strong>{withoutDocs.length}</strong> certificação{withoutDocs.length > 1 ? "ões" : ""} sem arquivo anexado. 
              Anexe para ter acesso offline.
            </p>
          </div>
        )}

        <Link to="/profile">
          <Button variant="outline" size="sm" className="w-full">
            <Wallet className="h-3.5 w-3.5 mr-2" />
            Gerenciar Documentos
            <ArrowRight className="h-3.5 w-3.5 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
