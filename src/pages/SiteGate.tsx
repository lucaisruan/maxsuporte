import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.jpeg";

const SITE_PASSWORD = "max@5699";

export default function SiteGate() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    // Simulate a small delay for UX
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (password === SITE_PASSWORD) {
      // Store access in sessionStorage (valid only for this session)
      sessionStorage.setItem("site_access_granted", "true");
      toast({
        title: "Acesso autorizado!",
        description: "Redirecionando para o login...",
      });
      navigate("/login");
    } else {
      setError(true);
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Senha incorreta. Tente novamente.",
      });
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-primary/10">
            <img
              src={logo}
              alt="MAX Implantações"
              className="h-full w-full object-contain"
            />
          </div>
          <CardTitle className="text-2xl">MAX IMPLANTAÇÕES</CardTitle>
          <CardDescription>
            Digite a senha de acesso ao sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Senha de Acesso</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite a senha do sistema"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(false);
                  }}
                  className={`pl-9 ${error ? "border-destructive" : ""}`}
                  required
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Senha incorreta
                </div>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Acessar Sistema"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
