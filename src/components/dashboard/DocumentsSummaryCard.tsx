import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Minus } from "lucide-react";
import { Link } from "react-router-dom";

interface CertificationStatus {
  name: string;
  label: string;
  hasIt: boolean;
  validity: string | null;
  isIndeterminate?: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

interface DocumentsSummaryCardProps {
  certifications: CertificationStatus[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
}

function StatusBadge({ cert }: { cert: CertificationStatus }) {
  if (cert.isExpired) {
    return (
      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-1">
        <XCircle className="h-3 w-3" />
        Vencida
      </Badge>
    );
  }
  if (cert.isExpiringSoon) {
    return (
      <Badge className="text-[10px] px-1.5 py-0 gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
        <AlertTriangle className="h-3 w-3" />
        Vencendo
      </Badge>
    );
  }
  if (cert.isIndeterminate) {
    return (
      <Badge className="text-[10px] px-1.5 py-0 gap-1 bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200">
        <Minus className="h-3 w-3" />
        OK
      </Badge>
    );
  }
  return (
    <Badge className="text-[10px] px-1.5 py-0 gap-1 bg-green-50 text-green-700 hover:bg-green-50 border-green-200">
      <CheckCircle2 className="h-3 w-3" />
      Válida
    </Badge>
  );
}

export function DocumentsSummaryCard({ certifications }: DocumentsSummaryCardProps) {
  const owned = certifications.filter(c => c.hasIt);
  const valid = owned.filter(c => !c.isExpired && !c.isExpiringSoon).length;
  const expiring = owned.filter(c => c.isExpiringSoon).length;
  const expired = owned.filter(c => c.isExpired).length;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Certificações
          </CardTitle>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
              {valid} válidos
            </Badge>
            {expiring > 0 && (
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                {expiring} vencendo
              </Badge>
            )}
            {expired > 0 && (
              <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                {expired} vencidos
              </Badge>
            )}
            <Link to="/profile" className="text-[11px] text-muted-foreground hover:text-foreground font-medium ml-1">
              Gerenciar →
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 sm:px-6">
        {owned.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            Nenhuma certificação registrada.{" "}
            <Link to="/profile" className="text-primary hover:underline">Adicionar certificações</Link>
          </div>
        ) : (
          <>
            {/* Desktop: tabela */}
            <div className="hidden sm:block max-h-[320px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-[11px] font-semibold h-9">Certificação</TableHead>
                    <TableHead className="text-[11px] font-semibold h-9 text-center w-[110px]">Validade</TableHead>
                    <TableHead className="text-[11px] font-semibold h-9 text-center w-[90px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {owned.map(cert => (
                    <TableRow key={cert.name} className="hover:bg-muted/20">
                      <TableCell className="py-2 text-xs font-medium">{cert.label}</TableCell>
                      <TableCell className="py-2 text-xs text-center text-muted-foreground">
                        {cert.isIndeterminate ? "Indeterminada" : formatDate(cert.validity)}
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <StatusBadge cert={cert} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: cards empilhados */}
            <div className="sm:hidden max-h-[360px] overflow-y-auto overflow-x-hidden space-y-1.5">
              {owned.map(cert => (
                <div
                  key={cert.name}
                  className="flex items-start justify-between gap-1.5 p-2 rounded-lg border bg-card"
                >
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="text-[11px] font-medium leading-tight break-words">{cert.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {cert.isIndeterminate ? "Indet." : formatDate(cert.validity)}
                    </p>
                  </div>
                  <div className="flex-shrink-0 mt-0.5">
                    <StatusBadge cert={cert} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
