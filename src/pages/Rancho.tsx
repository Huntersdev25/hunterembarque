import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Package, Plus, Trash2, Edit, Ship, Building2, Search, 
  TrendingUp, DollarSign, BarChart3, PieChart as PieChartIcon,
  ShoppingCart
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const UNIT_TYPES = ["Kg", "Und", "CX", "Pact", "L", "g"];
const CATEGORIES = ["Carnes", "Laticínios", "Bebidas", "Hortifruti", "Grãos", "Congelados", "Higiene", "Limpeza", "Descartáveis", "Geral"];
const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', '#8b5cf6', '#ec4899', '#14b8a6'];

interface RanchItem {
  id: string;
  vessel_id: string;
  item_name: string;
  unit_type: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  category: string;
  notes: string | null;
  created_at: string;
}

export default function Rancho() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedVesselId, setSelectedVesselId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RanchItem | null>(null);
  const [formData, setFormData] = useState({
    item_name: "",
    unit_type: "Und",
    quantity: 0,
    unit_price: 0,
    category: "Geral",
    notes: "",
  });

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ["clients-for-rancho"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, company_name")
        .eq("is_active", true)
        .order("company_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch vessels for selected client
  const { data: vessels } = useQuery({
    queryKey: ["vessels-for-rancho", selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      const { data, error } = await supabase
        .from("measurement_vessels")
        .select("id, name, description")
        .eq("client_id", selectedClientId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClientId,
  });

  // Fetch ranch items for selected vessel
  const { data: ranchItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ["ranch-items", selectedVesselId],
    queryFn: async () => {
      if (!selectedVesselId) return [];
      const { data, error } = await supabase
        .from("ranch_items")
        .select("*")
        .eq("vessel_id", selectedVesselId)
        .order("category", { ascending: true });
      if (error) throw error;
      return data as RanchItem[];
    },
    enabled: !!selectedVesselId,
  });

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async (item: typeof formData) => {
      const { error } = await supabase.from("ranch_items").insert({
        vessel_id: selectedVesselId,
        item_name: item.item_name,
        unit_type: item.unit_type,
        quantity: item.quantity,
        unit_price: item.unit_price,
        category: item.category,
        notes: item.notes || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ranch-items", selectedVesselId] });
      toast.success("Item adicionado com sucesso!");
      setIsAddItemOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Erro ao adicionar item: " + error.message);
    },
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, ...item }: { id: string } & typeof formData) => {
      const { error } = await supabase
        .from("ranch_items")
        .update({
          item_name: item.item_name,
          unit_type: item.unit_type,
          quantity: item.quantity,
          unit_price: item.unit_price,
          category: item.category,
          notes: item.notes || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ranch-items", selectedVesselId] });
      toast.success("Item atualizado com sucesso!");
      setEditingItem(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar item: " + error.message);
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ranch_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ranch-items", selectedVesselId] });
      toast.success("Item removido com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao remover item: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      item_name: "",
      unit_type: "Und",
      quantity: 0,
      unit_price: 0,
      category: "Geral",
      notes: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, ...formData });
    } else {
      addItemMutation.mutate(formData);
    }
  };

  const openEditDialog = (item: RanchItem) => {
    setEditingItem(item);
    setFormData({
      item_name: item.item_name,
      unit_type: item.unit_type,
      quantity: item.quantity,
      unit_price: item.unit_price,
      category: item.category || "Geral",
      notes: item.notes || "",
    });
  };

  // Filter items
  const filteredItems = useMemo(() => {
    if (!ranchItems) return [];
    return ranchItems.filter((item) => {
      const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [ranchItems, searchTerm, categoryFilter]);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!ranchItems) return { totalItems: 0, totalValue: 0, avgItemValue: 0, categoriesCount: 0 };
    const totalValue = ranchItems.reduce((sum, item) => sum + (item.total_value || 0), 0);
    const uniqueCategories = new Set(ranchItems.map((item) => item.category));
    return {
      totalItems: ranchItems.length,
      totalValue,
      avgItemValue: ranchItems.length > 0 ? totalValue / ranchItems.length : 0,
      categoriesCount: uniqueCategories.size,
    };
  }, [ranchItems]);

  // Chart data by category
  const categoryChartData = useMemo(() => {
    if (!ranchItems) return [];
    const categoryMap = new Map<string, number>();
    ranchItems.forEach((item) => {
      const cat = item.category || "Geral";
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + (item.total_value || 0));
    });
    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [ranchItems]);

  // Top items chart data
  const topItemsData = useMemo(() => {
    if (!ranchItems) return [];
    return [...ranchItems]
      .sort((a, b) => (b.total_value || 0) - (a.total_value || 0))
      .slice(0, 5)
      .map((item) => ({ name: item.item_name, value: item.total_value || 0 }));
  }, [ranchItems]);

  const chartConfig = {
    value: { label: "Valor", color: "hsl(var(--primary))" },
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  return (
    <DashboardLayout userType="admin">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShoppingCart className="h-7 w-7" />
            Controle de Rancho
          </h1>
          <p className="text-muted-foreground">Gerencie os itens de rancho por cliente e embarcação</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Selecionar Cliente e Embarcação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select
                  value={selectedClientId}
                  onValueChange={(value) => {
                    setSelectedClientId(value);
                    setSelectedVesselId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {client.company_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Embarcação</Label>
                <Select
                  value={selectedVesselId}
                  onValueChange={setSelectedVesselId}
                  disabled={!selectedClientId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedClientId ? "Selecione uma embarcação" : "Selecione um cliente primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {vessels?.map((vessel) => (
                      <SelectItem key={vessel.id} value={vessel.id}>
                        <div className="flex items-center gap-2">
                          <Ship className="h-4 w-4" />
                          {vessel.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedVesselId && (
          <>
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total de Itens</p>
                      <p className="text-xl font-bold">{metrics.totalItems}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Valor Total</p>
                      <p className="text-xl font-bold">{formatCurrency(metrics.totalValue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Média por Item</p>
                      <p className="text-xl font-bold">{formatCurrency(metrics.avgItemValue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Categorias</p>
                      <p className="text-xl font-bold">{metrics.categoriesCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            {ranchItems && ranchItems.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5" />
                      Distribuição por Categoria
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {categoryChartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Top 5 Itens por Valor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topItemsData} layout="vertical">
                          <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                          <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Items Table */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <CardTitle>Itens do Rancho</CardTitle>
                    <CardDescription>Lista de todos os itens cadastrados</CardDescription>
                  </div>
                  <Sheet open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                    <SheetTrigger asChild>
                      <Button onClick={() => { resetForm(); setEditingItem(null); }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Item
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>{editingItem ? "Editar Item" : "Novo Item"}</SheetTitle>
                        <SheetDescription>
                          {editingItem ? "Atualize as informações do item" : "Adicione um novo item ao rancho"}
                        </SheetDescription>
                      </SheetHeader>
                      <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                        <div className="space-y-2">
                          <Label htmlFor="item_name">Nome do Item</Label>
                          <Input
                            id="item_name"
                            value={formData.item_name}
                            onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                            placeholder="Ex: Arroz, Feijão, Carne..."
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="unit_type">Unidade</Label>
                            <Select
                              value={formData.unit_type}
                              onValueChange={(value) => setFormData({ ...formData, unit_type: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {UNIT_TYPES.map((unit) => (
                                  <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="quantity">Quantidade</Label>
                            <Input
                              id="quantity"
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.quantity}
                              onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="unit_price">Valor Unitário (R$)</Label>
                            <Input
                              id="unit_price"
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.unit_price}
                              onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Valor Total</Label>
                            <div className="h-10 px-3 py-2 bg-muted rounded-md text-sm font-medium flex items-center">
                              {formatCurrency(formData.quantity * formData.unit_price)}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="category">Categoria</Label>
                          <Select
                            value={formData.category}
                            onValueChange={(value) => setFormData({ ...formData, category: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="notes">Observações</Label>
                          <Input
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Observações opcionais..."
                          />
                        </div>

                        <Button type="submit" className="w-full" disabled={addItemMutation.isPending || updateItemMutation.isPending}>
                          {editingItem ? "Atualizar Item" : "Adicionar Item"}
                        </Button>
                      </form>
                    </SheetContent>
                  </Sheet>
                </div>

                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar item..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filtrar categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as categorias</SelectItem>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingItems ? (
                  <div className="text-center py-8">Carregando itens...</div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {ranchItems?.length === 0 
                      ? "Nenhum item cadastrado ainda. Adicione o primeiro item!"
                      : "Nenhum item encontrado com os filtros aplicados."
                    }
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead className="text-center">Unidade</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                          <TableHead className="text-right">Valor Uni.</TableHead>
                          <TableHead className="text-right">Valor Total</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.item_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.category}</Badge>
                            </TableCell>
                            <TableCell className="text-center">{item.unit_type}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(item.total_value)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    openEditDialog(item);
                                    setIsAddItemOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm("Tem certeza que deseja excluir este item?")) {
                                      deleteItemMutation.mutate(item.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Total Row */}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={5} className="text-right">TOTAL</TableCell>
                          <TableCell className="text-right text-primary">
                            {formatCurrency(filteredItems.reduce((sum, item) => sum + (item.total_value || 0), 0))}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!selectedVesselId && (
          <Card className="border-dashed">
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Ship className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Selecione um cliente e uma embarcação</p>
                <p className="text-sm">Para visualizar e gerenciar os itens do rancho</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}