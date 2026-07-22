import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Briefcase, Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface FunctionCount {
  name: string;
  count: number;
}

export function ProfessionalsByFunction() {
  const [data, setData] = useState<FunctionCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Paginate to bypass the 1000-row limit
    const pageSize = 1000;
    let from = 0;
    const all: { desired_function: string | null }[] = [];
    while (true) {
      const { data: page, error } = await supabase
        .from("profiles")
        .select("desired_function")
        .eq("role", "candidate")
        .range(from, from + pageSize - 1);
      if (error) break;
      all.push(...(page || []));
      if (!page || page.length < pageSize) break;
      from += pageSize;
    }

    const counts: Record<string, number> = {};
    all.forEach((p) => {
      const fn = (p.desired_function || "").trim() || "Não informada";
      counts[fn] = (counts[fn] || 0) + 1;
    });

    const arr = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    setData(arr);
    setTotal(all.length);
    setLoading(false);
  };

  const filtered = data.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const max = data[0]?.count || 1;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-maritime-blue" />
            Profissionais por Função
            <Badge variant="secondary" className="ml-2 font-normal">
              {data.length} funções • {total} profissionais
            </Badge>
          </CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar função..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Nenhuma função encontrada
          </div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-2">
            {filtered.map((item, idx) => {
              const pct = (item.count / max) * 100;
              return (
                <div
                  key={item.name}
                  className="group relative rounded-lg border border-border/40 hover:border-maritime-blue/40 transition-all p-3"
                >
                  <div className="flex items-center justify-between mb-1.5 gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-muted-foreground w-6 flex-shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="font-medium text-sm truncate">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Users className="h-3.5 w-3.5 text-maritime-blue" />
                      <span className="text-sm font-bold text-foreground">
                        {item.count}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({((item.count / total) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden ml-8">
                    <div
                      className="h-full bg-gradient-to-r from-maritime-blue to-maritime-blue/60 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
