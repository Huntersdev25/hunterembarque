/**
 * Componente para seleção de regras STCW
 * Permite selecionar regras específicas dentro da certificação STCW
 */
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface STCWRulesProps {
  rules: {
    nautica_ii1?: boolean;
    nautica_ii2?: boolean;
    maquinas_iii1?: boolean;
    maquinas_iii2?: boolean;
  };
  onChange: (rules: any) => void;
}

export function STCWRules({ rules, onChange }: STCWRulesProps) {
  /**
   * Atualiza uma regra específica do STCW
   * Mantém as outras regras inalteradas
   */
  const handleRuleChange = (ruleName: string, checked: boolean) => {
    onChange({
      ...rules,
      [ruleName]: checked
    });
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Regras STCW</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Área com scroll para as regras STCW */}
        <ScrollArea className="h-32 w-full rounded border p-4">
          <div className="space-y-3">
            {/* Seção Náutica */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Náutica</Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="nautica_ii1"
                    checked={rules.nautica_ii1 || false}
                    onCheckedChange={(checked) => handleRuleChange('nautica_ii1', checked as boolean)}
                  />
                  <Label htmlFor="nautica_ii1" className="text-sm">II/1</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="nautica_ii2"
                    checked={rules.nautica_ii2 || false}
                    onCheckedChange={(checked) => handleRuleChange('nautica_ii2', checked as boolean)}
                  />
                  <Label htmlFor="nautica_ii2" className="text-sm">II/2</Label>
                </div>
              </div>
            </div>

            {/* Seção Máquinas */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Máquinas</Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="maquinas_iii1"
                    checked={rules.maquinas_iii1 || false}
                    onCheckedChange={(checked) => handleRuleChange('maquinas_iii1', checked as boolean)}
                  />
                  <Label htmlFor="maquinas_iii1" className="text-sm">III/1</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="maquinas_iii2"
                    checked={rules.maquinas_iii2 || false}
                    onCheckedChange={(checked) => handleRuleChange('maquinas_iii2', checked as boolean)}
                  />
                  <Label htmlFor="maquinas_iii2" className="text-sm">III/2</Label>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}