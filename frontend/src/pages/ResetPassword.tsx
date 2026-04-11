import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AuthLayout from "../components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "../lib/api";

const schema = z
  .object({
    new_password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "As senhas não coincidem",
    path: ["confirm_password"],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  if (!token) {
    return (
      <AuthLayout title="Link inválido">
        <p className="text-muted-foreground text-center">
          Este link de redefinição é inválido ou expirou.
        </p>
        <div className="mt-4 text-center">
          <Link to="/forgot-password" className="text-primary hover:underline text-sm">
            Solicitar novo link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      await api.post("/auth/reset-password/confirm", {
        token,
        new_password: data.new_password,
      });
      navigate("/login");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao redefinir senha");
    }
  }

  return (
    <AuthLayout title="Nova senha">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new_password">Nova senha</Label>
          <Input id="new_password" type="password" {...register("new_password")} />
          {errors.new_password && (
            <p className="text-sm text-destructive">{errors.new_password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm_password">Confirmar senha</Label>
          <Input id="confirm_password" type="password" {...register("confirm_password")} />
          {errors.confirm_password && (
            <p className="text-sm text-destructive">{errors.confirm_password.message}</p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Redefinir senha"}
        </Button>
      </form>
    </AuthLayout>
  );
}
