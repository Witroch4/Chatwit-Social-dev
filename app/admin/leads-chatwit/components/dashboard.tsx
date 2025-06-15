"use client"

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent
} from "@/components/ui/chart";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { Area, AreaChart, BarChart, CartesianGrid, XAxis, Bar, Pie, PieChart, Label, Tooltip } from "recharts";

export interface DashboardProps {
  isOpen: boolean;
  refreshCounter: number;
  period: string;
}

interface ChartData {
  leadsPorMes: Array<{
    month: string;
    leadsTotal: number;
    leadsConcluidos: number;
  }>;
  leadsPorCanal: Array<{
    channel: string;
    leads: number;
  }>;
}

const areaChartConfig = {
  leadsTotal: {
    label: "Total de Leads",
    color: "hsl(var(--chart-1))",
  },
  leadsConcluidos: {
    label: "Leads Concluídos",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function LeadsDashboard({ isOpen, refreshCounter, period }: DashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalUsuarios: 0,
    totalArquivos: 0,
    pendentes: 0
  });
  const [chartData, setChartData] = useState<ChartData>({
    leadsPorMes: [],
    leadsPorCanal: []
  });

  useEffect(() => {
    if (isOpen) {
      fetchDashboardData();
    }
  }, [isOpen, refreshCounter, period]);
  
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/leads-chatwit/stats");
      const data = await response.json();
      
      if (response.ok) {
        setStats(data.stats);
        setChartData(data.charts);
      } else {
        throw new Error(data.error || "Erro ao buscar estatísticas");
      }
    } catch (error: any) {
      console.error("Erro ao buscar dados do dashboard:", error);
      toast.error("Erro", {
        description: error.message || "Não foi possível carregar os dados do dashboard",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calcular o total de visitantes (para o gráfico de pizza)
  const totalLeadsCanais = chartData.leadsPorCanal.reduce(
    (total: number, item: any) => total + item.leads, 
    0
  );

  // Determinar se há um crescimento ou queda
  const calculaCrescimento = () => {
    if (chartData.leadsPorMes.length >= 2) {
      const mesAtual = chartData.leadsPorMes[chartData.leadsPorMes.length - 1].leadsTotal;
      const mesAnterior = chartData.leadsPorMes[chartData.leadsPorMes.length - 2].leadsTotal;
      
      if (mesAnterior === 0) return { percentual: 100, crescimento: true };
      
      const diff = mesAtual - mesAnterior;
      const percentual = Math.abs(Math.round((diff / mesAnterior) * 100));
      
      return {
        percentual,
        crescimento: diff >= 0
      };
    }
    
    return { percentual: 0, crescimento: true };
  };
  
  const { percentual, crescimento } = calculaCrescimento();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
      {/* Gráfico de Área - Leads por Mês */}
      <Card>
        <CardHeader>
          <CardTitle>Leads por Mês</CardTitle>
          <CardDescription>
            Comparativo entre leads totais e concluídos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="w-full h-[250px]" />
          ) : (
            <ChartContainer config={areaChartConfig}>
              <AreaChart
                accessibilityLayer
                data={chartData.leadsPorMes}
                margin={{
                  left: 12,
                  right: 12,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <Tooltip
                  labelFormatter={(value) => value.slice(0, 3)}
                />
                <Area
                  dataKey="leadsConcluidos"
                  type="natural"
                  fill="var(--color-leadsConcluidos)"
                  fillOpacity={0.4}
                  stroke="var(--color-leadsConcluidos)"
                  stackId="a"
                />
                <Area
                  dataKey="leadsTotal"
                  type="natural"
                  fill="var(--color-leadsTotal)"
                  fillOpacity={0.4}
                  stroke="var(--color-leadsTotal)"
                  stackId="a"
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
        <CardFooter>
          <div className="flex w-full items-start gap-2 text-sm">
            <div className="grid gap-2">
              <div className="flex items-center gap-2 font-medium leading-none">
                {crescimento ? (
                  <>Crescendo {percentual}% este mês <TrendingUp className="h-4 w-4 text-green-500" /></>
                ) : (
                  <>Queda de {percentual}% este mês <TrendingDown className="h-4 w-4 text-red-500" /></>
                )}
              </div>
              <div className="flex items-center gap-2 leading-none text-muted-foreground">
                Últimos 6 meses
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Gráfico de Pizza - Leads por Canal */}
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Leads por Canal</CardTitle>
          <CardDescription>Distribuição de leads por fonte</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          {isLoading ? (
            <Skeleton className="w-full h-[250px]" />
          ) : (
            <ChartContainer
              config={{
                leads: { label: "Leads" },
                ...chartData.leadsPorCanal.reduce((config: any, item: any) => {
                  config[item.channel] = {
                    label: item.channel,
                    color: `hsl(var(--chart-${(Object.keys(config).length % 5) + 1}))`
                  };
                  return config;
                }, {})
              }}
              className="mx-auto aspect-square max-h-[250px]"
            >
              <PieChart>
                <Tooltip
                  labelFormatter={(value) => value.slice(0, 3)}
                />
                <Pie
                  data={chartData.leadsPorCanal}
                  dataKey="leads"
                  nameKey="channel"
                  innerRadius={60}
                  strokeWidth={5}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-3xl font-bold"
                            >
                              {totalLeadsCanais.toLocaleString()}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 24}
                              className="fill-muted-foreground"
                            >
                              Leads
                            </tspan>
                          </text>
                        )
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 leading-none text-muted-foreground">
            {isLoading ? (
              <Skeleton className="w-40 h-4" />
            ) : (
              `Distribuição dos ${totalLeadsCanais} leads por canal`
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 