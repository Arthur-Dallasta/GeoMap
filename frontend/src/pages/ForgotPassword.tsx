import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AuthLayout from "../components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "../lib/api";

const schema = z.object({
  email: z.string().email("Email inválido"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      await api.post("/auth/forgot-password", { email: data.email });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao solicitar redefinição");
    }
  }

  if (sent) {
    return (
      <AuthLayout title="Email enviado">
        <p className="text-muted-foreground text-center">
          Se o email estiver cadastrado, você receberá um link para redefinir sua senha em breve.
        </p>
        <div className="mt-4 text-center">
          <Link to="/login" className="text-primary hover:underline text-sm">
            Voltar ao login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Esqueci minha senha">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Informe seu email para receber o link de redefinição de senha.
        </p>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Enviando..." : "Enviar link"}
        </Button>

        <div className="text-center">
          <Link to="/login" className="text-sm text-primary hover:underline">
            Voltar ao login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
