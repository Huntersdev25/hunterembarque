import { useState } from "react";
import { TILayout } from "@/components/ti/TILayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Search, Filter, Eye, Users, MoreHorizontal, Ship } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function TIClients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: clients, isLoading } = useQuery({
    queryKey: ['ti-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          client_candidates(count)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: clientStats } = useQuery({
    queryKey: ['ti-client-stats'],
    queryFn: async () => {
      const [
        { count: total },
        { count: active },
        { count: laborSupply },
        { count: hunting }
      ] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('client_type', 'labor_supply'),
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('client_type', 'hunting'),
      ]);
      return { total, active, laborSupply, hunting };
    }
  });

  const filteredClients = clients?.filter(client => {
    const matchesSearch = client.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || client.client_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <TILayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-zinc-100 flex items-center gap-2">
              <Building2 className="h-6 w-6 text-emerald-400" />
              Gestão de Clientes
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Visualize e gerencie todos os clientes do sistema
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-100">{clientStats?.total || 0}</p>
                  <p className="text-xs text-zinc-500">Total Clientes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-100">{clientStats?.active || 0}</p>
                  <p className="text-xs text-zinc-500">Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Ship className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-100">{clientStats?.laborSupply || 0}</p>
                  <p className="text-xs text-zinc-500">Labor Supply</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-100">{clientStats?.hunting || 0}</p>
                  <p className="text-xs text-zinc-500">Hunting</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Buscar por empresa, contato ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-zinc-800 border-zinc-700 text-zinc-100">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="labor_supply">Labor Supply</SelectItem>
                  <SelectItem value="hunting">Hunting</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Clients Table */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">Lista de Clientes</CardTitle>
            <CardDescription className="text-zinc-400">
              {filteredClients?.length || 0} clientes encontrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-zinc-400">Empresa</TableHead>
                      <TableHead className="text-zinc-400 hidden md:table-cell">Contato</TableHead>
                      <TableHead className="text-zinc-400">Tipo</TableHead>
                      <TableHead className="text-zinc-400 hidden lg:table-cell">Profissionais</TableHead>
                      <TableHead className="text-zinc-400">Status</TableHead>
                      <TableHead className="text-zinc-400 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients?.map((client) => (
                      <TableRow key={client.id} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell>
                          <div>
                            <p className="font-medium text-zinc-200">{client.company_name}</p>
                            <p className="text-xs text-zinc-500">{client.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div>
                            <p className="text-zinc-300">{client.contact_name}</p>
                            <p className="text-xs text-zinc-500">{client.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            client.client_type === 'hunting' 
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                              : "bg-purple-500/20 text-purple-400 border-purple-500/30"
                          }>
                            {client.client_type === 'hunting' ? 'Hunting' : 'Labor Supply'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-zinc-300">
                            {client.client_candidates?.[0]?.count || 0}
                          </span>
                        </TableCell>
                        <TableCell>
                          {client.is_active ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">
                              Inativo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-zinc-400">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-zinc-800 border-zinc-700" align="end">
                              <DropdownMenuItem className="text-zinc-300">
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-zinc-300">
                                <Users className="h-4 w-4 mr-2" />
                                Ver Profissionais
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TILayout>
  );
}
