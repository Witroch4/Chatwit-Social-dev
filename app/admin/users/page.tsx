'use client';

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, UserCog, X, RefreshCw, UserCheck, ChevronDown, ChevronRight, Copy, Check, ExternalLink, ChevronLeft, CheckCircle, KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import NavbarAdmin from "@/components/admin/navbar-admin";
import Link from "next/link";

interface Account {
  id: string;
  provider: string;
  providerAccountId: string;
  type: string;
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: number | null;
  token_type?: string | null;
  scope?: string | null;
  id_token?: string | null;
  session_state?: string | null;
  igUserId?: string | null;
  igUsername?: string | null;
  isMain: boolean;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isTwoFactorAuthEnabled: boolean;
  createdAt: string;
  emailVerified: string | null;
  accounts?: Account[];
}

const UsersPage = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [copiedTokens, setCopiedTokens] = useState<Set<string>>(new Set());
  // Estado para armazenar a conta clonada
  const [clonedAccount, setClonedAccount] = useState<Account | null>(null);
  // Estado para controlar o diálogo de confirmação de clonagem
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  // Estado para armazenar o usuário de destino para colar a conta
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  // Estado para controlar o diálogo de confirmação de colagem
  const [isPasteDialogOpen, setIsPasteDialogOpen] = useState(false);
  // Estado para controlar o carregamento durante as operações
  const [isCloning, setIsCloning] = useState(false);
  // Estado para controlar o diálogo de redefinição de senha
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  // Estado para armazenar o usuário para redefinição de senha
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  // Estado para armazenar a nova senha
  const [newPassword, setNewPassword] = useState("");
  // Estado para controlar o carregamento durante a redefinição de senha
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  // Referência para controlar o estado do menu de contexto
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        throw new Error("Falha ao buscar usuários");
      }
      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditUser = (user: User) => {
    // Adicionar um pequeno atraso para garantir que qualquer menu aberto seja fechado primeiro
    setTimeout(() => {
      setEditingUser({ ...user });
      setIsDialogOpen(true);
    }, 100);
  };

  const handleCloseDialog = () => {
    setEditingUser(null);
    setIsDialogOpen(false);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editingUser.name,
          email: editingUser.email,
          role: editingUser.role,
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao atualizar usuário");
      }

      // Atualizar o usuário na lista
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === editingUser.id ? { ...user, ...editingUser } : user
        )
      );

      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso.",
      });

      handleCloseDialog();
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o usuário.",
        variant: "destructive",
      });
    }
  };

  const toggleUserExpand = (userId: string) => {
    setExpandedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleAccountExpand = (accountId: string) => {
    setExpandedAccounts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text: string, accountId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTokens((prev) => {
      const newSet = new Set(prev);
      newSet.add(accountId);
      return newSet;
    });

    setTimeout(() => {
      setCopiedTokens((prev) => {
        const newSet = new Set(prev);
        newSet.delete(accountId);
        return newSet;
      });
    }, 2000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR") + " " + date.toLocaleTimeString("pt-BR");
  };

  const formatExpiresAt = (expiresAt: number | null | undefined) => {
    if (!expiresAt) return "N/A";
    const date = new Date(expiresAt * 1000);
    return date.toLocaleDateString("pt-BR") + " " + date.toLocaleTimeString("pt-BR");
  };

  // Função para clonar uma conta
  const handleCloneAccount = (account: Account, setClonedAccount: React.Dispatch<React.SetStateAction<Account | null>>, setIsCloneDialogOpen: React.Dispatch<React.SetStateAction<boolean>>) => {
    // Importante: Adicionar um pequeno atraso para garantir que o menu de contexto seja fechado primeiro
    setTimeout(() => {
      setClonedAccount(account);
      setIsCloneDialogOpen(true);
    }, 100);
  };

  // Função para confirmar a clonagem
  const confirmClone = () => {
    setIsCloneDialogOpen(false);
    toast({
      title: "Conta clonada",
      description: "Agora você pode colar esta conta em outro usuário.",
    });
  };

  // Função para iniciar o processo de colagem
  const handlePasteAccount = (userId: string, clonedAccount: Account | null, setTargetUserId: React.Dispatch<React.SetStateAction<string | null>>, setIsPasteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>, toast: any) => {
    if (!clonedAccount) {
      toast({
        title: "Erro",
        description: "Nenhuma conta foi clonada para colar.",
        variant: "destructive",
      });
      return;
    }

    // Importante: Adicionar um pequeno atraso para garantir que o menu de contexto seja fechado primeiro
    setTimeout(() => {
      setTargetUserId(userId);
      setIsPasteDialogOpen(true);
    }, 100);
  };

  // Função para confirmar a colagem
  const confirmPaste = async () => {
    if (!clonedAccount || !targetUserId) return;

    try {
      setIsCloning(true);
      setIsPasteDialogOpen(false); // Fechar o diálogo antes de fazer a requisição

      toast({
        title: "Processando",
        description: "Clonando conta, por favor aguarde...",
      });

      const response = await fetch(`/api/admin/users/clone-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceAccountId: clonedAccount.id,
          targetUserId: targetUserId,
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao clonar conta");
      }

      const data = await response.json();

      toast({
        title: "Sucesso",
        description: (
          <div className="space-y-1">
            <p>Conta clonada com sucesso!</p>
            <p className="text-xs">
              Original: {clonedAccount.igUsername || clonedAccount.providerAccountId}
            </p>
            <p className="text-xs">
              Nova: {data.account.providerAccountId}
            </p>
          </div>
        ),
        duration: 5000,
      });

      // Atualizar a lista de usuários
      fetchUsers();
    } catch (error) {
      console.error("Erro ao clonar conta:", error);
      toast({
        title: "Erro",
        description: "Não foi possível clonar a conta.",
        variant: "destructive",
      });
    } finally {
      setIsCloning(false);
      setTargetUserId(null);
    }
  };

  // Função para validar o email de um usuário
  const handleValidateEmail = async (userId: string, userEmail: string) => {
    try {
      const response = await fetch(`/api/admin/users/validate-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          email: userEmail
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao validar email");
      }

      toast({
        title: "Sucesso",
        description: "Email validado com sucesso.",
      });

      // Atualizar a lista de usuários
      fetchUsers();
    } catch (error) {
      console.error("Erro ao validar email:", error);
      toast({
        title: "Erro",
        description: "Não foi possível validar o email do usuário.",
        variant: "destructive",
      });
    }
  };

  // Função para abrir o diálogo de redefinição de senha
  const handleSetPassword = (user: User) => {
    setPasswordUser(user);
    setNewPassword("");
    setIsPasswordDialogOpen(true);
  };

  // Função para definir uma nova senha para o usuário
  const confirmSetPassword = async () => {
    if (!passwordUser || !newPassword.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira uma senha válida.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSettingPassword(true);

      const response = await fetch(`/api/admin/users/set-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: passwordUser.id,
          password: newPassword
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao definir nova senha");
      }

      toast({
        title: "Sucesso",
        description: "Senha definida com sucesso.",
      });

      setIsPasswordDialogOpen(false);
      setPasswordUser(null);
      setNewPassword("");
    } catch (error) {
      console.error("Erro ao definir nova senha:", error);
      toast({
        title: "Erro",
        description: "Não foi possível definir a nova senha.",
        variant: "destructive",
      });
    } finally {
      setIsSettingPassword(false);
    }
  };

  // Função para formatar a data de validação do email
  const formatEmailVerified = (dateString: string | null) => {
    if (!dateString) return "Não validado";
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR") + " " + date.toLocaleTimeString("pt-BR");
  };

  return (
    <div>
      <NavbarAdmin />
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Gerenciamento de Usuários</h1>
            <div className="flex items-center gap-2 mt-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/admin">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Voltar ao Painel
                </Link>
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar usuários..."
                className="pl-8 w-[250px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchUsers}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Carregando usuários...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">Nenhum usuário encontrado.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <ContextMenu key={user.id}>
                <ContextMenuTrigger>
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-0 h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleUserExpand(user.id);
                              }}
                            >
                              {expandedUsers.has(user.id) ? (
                                <ChevronDown className="h-5 w-5" />
                              ) : (
                                <ChevronRight className="h-5 w-5" />
                              )}
                            </Button>
                            {user.name || "Sem nome"}
                            {user.emailVerified && (
                              <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400">
                                Verificado
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription>{user.email}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={user.role === "ADMIN" ? "default" : "outline"}>
                            {user.role}
                          </Badge>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditUser(user)}
                                >
                                  <UserCog className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Editar usuário</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </CardHeader>
                    <Collapsible open={expandedUsers.has(user.id)}>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">ID:</span>
                              <span className="font-mono">{user.id}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Criado em:</span>
                              <span>{formatDate(user.createdAt)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Email verificado:</span>
                              <span>{formatEmailVerified(user.emailVerified)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">2FA:</span>
                              <span>{user.isTwoFactorAuthEnabled ? "Ativado" : "Desativado"}</span>
                            </div>
                            {user.accounts && user.accounts.length > 0 && (
                              <div className="mt-4">
                                <h4 className="text-sm font-medium mb-2">Contas vinculadas:</h4>
                                <div className="space-y-3">
                                  {user.accounts.map((account) => (
                                    <ContextMenu key={account.id}>
                                      <ContextMenuTrigger>
                                        <Card className="border-dashed">
                                          <CardHeader className="py-2 px-4">
                                            <div className="flex justify-between items-center">
                                              <div className="flex items-center gap-2">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="p-0 h-6 w-6"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleAccountExpand(account.id);
                                                  }}
                                                >
                                                  {expandedAccounts.has(account.id) ? (
                                                    <ChevronDown className="h-4 w-4" />
                                                  ) : (
                                                    <ChevronRight className="h-4 w-4" />
                                                  )}
                                                </Button>
                                                <div>
                                                  <div className="font-medium">
                                                    {account.provider.charAt(0).toUpperCase() + account.provider.slice(1)}
                                                    {account.isMain && (
                                                      <Badge variant="secondary" className="ml-2">
                                                        Principal
                                                      </Badge>
                                                    )}
                                                  </div>
                                                  <div className="text-xs text-muted-foreground">
                                                    {account.igUsername ? `@${account.igUsername}` : account.providerAccountId}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </CardHeader>
                                          <Collapsible open={expandedAccounts.has(account.id)}>
                                            <CollapsibleContent>
                                              <CardContent className="py-2 px-4 text-xs">
                                                <div className="space-y-2">
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">ID:</span>
                                                    <span className="font-mono">{account.id}</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Provider ID:</span>
                                                    <span className="font-mono">{account.providerAccountId}</span>
                                                  </div>
                                                  {account.igUsername && (
                                                    <div className="flex justify-between">
                                                      <span className="text-muted-foreground">Username:</span>
                                                      <span>@{account.igUsername}</span>
                                                    </div>
                                                  )}
                                                  {account.expires_at && (
                                                    <div className="flex justify-between">
                                                      <span className="text-muted-foreground">Expira em:</span>
                                                      <span>{formatExpiresAt(account.expires_at)}</span>
                                                    </div>
                                                  )}
                                                  {account.access_token && (
                                                    <div className="flex justify-between items-center">
                                                      <span className="text-muted-foreground">Token:</span>
                                                      <div className="flex items-center gap-1">
                                                        <span className="font-mono truncate max-w-[150px]">
                                                          {account.access_token.substring(0, 10)}...
                                                        </span>
                                                        <Button
                                                          variant="ghost"
                                                          size="icon"
                                                          className="h-5 w-5"
                                                          onClick={() => copyToClipboard(account.access_token!, account.id)}
                                                        >
                                                          {copiedTokens.has(account.id) ? (
                                                            <Check className="h-3 w-3" />
                                                          ) : (
                                                            <Copy className="h-3 w-3" />
                                                          )}
                                                        </Button>
                                                      </div>
                                                    </div>
                                                  )}
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Criado em:</span>
                                                    <span>{formatDate(account.createdAt)}</span>
                                                  </div>
                                                </div>
                                              </CardContent>
                                            </CollapsibleContent>
                                          </Collapsible>
                                        </Card>
                                      </ContextMenuTrigger>
                                      <ContextMenuContent className="w-64">
                                        <ContextMenuItem
                                          onClick={() => handleCloneAccount(account, setClonedAccount, setIsCloneDialogOpen)}
                                        >
                                          <Copy className="mr-2 h-4 w-4" />
                                          Clonar conta
                                        </ContextMenuItem>
                                        <ContextMenuItem onClick={() => copyToClipboard(account.access_token!, account.id)}>
                                          <Copy className="mr-2 h-4 w-4" />
                                          Copiar token
                                        </ContextMenuItem>
                                        <ContextMenuSeparator />
                                        <ContextMenuItem>
                                          <ExternalLink className="mr-2 h-4 w-4" />
                                          Abrir no Instagram
                                        </ContextMenuItem>
                                        <ContextMenuSub>
                                          <ContextMenuSubTrigger>
                                            <RefreshCw className="mr-2 h-4 w-4" />
                                            Renovar token
                                          </ContextMenuSubTrigger>
                                          <ContextMenuSubContent className="w-48">
                                            <ContextMenuItem>
                                              Renovar manualmente
                                            </ContextMenuItem>
                                            <ContextMenuItem>
                                              Solicitar reautenticação
                                            </ContextMenuItem>
                                          </ContextMenuSubContent>
                                        </ContextMenuSub>
                                        <ContextMenuSeparator />
                                        <ContextMenuItem className="text-red-600">
                                          <X className="mr-2 h-4 w-4" />
                                          Desvincular conta
                                        </ContextMenuItem>
                                      </ContextMenuContent>
                                    </ContextMenu>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-64">
                  <ContextMenuItem onClick={() => handleEditUser(user)}>
                    <UserCog className="mr-2 h-4 w-4" />
                    Editar usuário
                  </ContextMenuItem>
                  {!user.emailVerified && (
                    <ContextMenuItem onClick={() => handleValidateEmail(user.id, user.email)}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Validar email
                    </ContextMenuItem>
                  )}
                  <ContextMenuItem onClick={() => handleSetPassword(user)}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Definir nova senha
                  </ContextMenuItem>
                  {clonedAccount && (
                    <ContextMenuItem
                      onClick={() => handlePasteAccount(user.id, clonedAccount, setTargetUserId, setIsPasteDialogOpen, toast)}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Colar conta clonada
                    </ContextMenuItem>
                  )}
                  <ContextMenuSeparator />
                  <ContextMenuItem className="text-red-600">
                    <X className="mr-2 h-4 w-4" />
                    Desativar usuário
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        )}

        {/* Diálogo de edição de usuário */}
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setEditingUser(null);
              setIsDialogOpen(false);
            }
          }}
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Faça alterações nos detalhes do usuário abaixo.
              </DialogDescription>
            </DialogHeader>
            {editingUser && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={editingUser.name || ""}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={editingUser.email}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Função</Label>
                  <Select
                    value={editingUser.role}
                    onValueChange={(value) =>
                      setEditingUser({ ...editingUser, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma função" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEFAULT">Usuário</SelectItem>
                      <SelectItem value="ADMIN">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveUser}>Salvar alterações</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Diálogo de confirmação de clonagem */}
        <Dialog
          open={isCloneDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsCloneDialogOpen(false);
            }
          }}
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Clonar Conta</DialogTitle>
              <DialogDescription>
                Você está prestes a clonar a seguinte conta:
              </DialogDescription>
            </DialogHeader>
            {clonedAccount && (
              <div className="py-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Provedor:</span>
                    <span>{clonedAccount.provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Usuário:</span>
                    <span>{clonedAccount.igUsername || clonedAccount.providerAccountId}</span>
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Esta conta será copiada para a área de transferência. Você poderá colá-la em outro usuário.
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCloneDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={confirmClone}>Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Diálogo de confirmação de colagem */}
        <Dialog
          open={isPasteDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsPasteDialogOpen(false);
            }
          }}
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Colar Conta</DialogTitle>
              <DialogDescription>
                Você está prestes a colar a conta clonada para o seguinte usuário:
              </DialogDescription>
            </DialogHeader>
            {targetUserId && clonedAccount && (
              <div className="py-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Usuário de destino:</span>
                    <span>{users.find(u => u.id === targetUserId)?.name || users.find(u => u.id === targetUserId)?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Conta a ser colada:</span>
                    <span>{clonedAccount.igUsername || clonedAccount.providerAccountId}</span>
                  </div>
                </div>
                <p className="mt-4 text-sm text-amber-600">
                  Atenção: Esta ação criará uma cópia da conta no usuário de destino. A conta original permanecerá intacta.
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPasteDialogOpen(false)} disabled={isCloning}>
                Cancelar
              </Button>
              <Button onClick={confirmPaste} disabled={isCloning}>
                {isCloning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Confirmar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Diálogo de definição de nova senha */}
        <Dialog
          open={isPasswordDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsPasswordDialogOpen(false);
              setPasswordUser(null);
              setNewPassword("");
            }
          }}
        >
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Definir Nova Senha</DialogTitle>
              <DialogDescription>
                {passwordUser && (
                  <>
                    Definir nova senha para o usuário <strong>{passwordUser.name || passwordUser.email}</strong>.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite a nova senha"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)} disabled={isSettingPassword}>
                Cancelar
              </Button>
              <Button onClick={confirmSetPassword} disabled={isSettingPassword || !newPassword.trim()}>
                {isSettingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Confirmar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default UsersPage;