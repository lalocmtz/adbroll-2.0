import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-4xl mb-3">adbroll</h1>
          <p className="text-muted-foreground">
            Tu video sabe más de ventas que tú
          </p>
        </div>

        {/* Login Card */}
        <Card className="p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Accede a tu cuenta</h2>
            <p className="text-muted-foreground">
              Crea variantes que venden en minutos
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-2 mb-6 bg-secondary rounded-lg p-1">
            <button
              className={`flex-1 py-2 rounded-md font-medium transition-smooth ${
                isLogin
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground"
              }`}
              onClick={() => setIsLogin(true)}
            >
              Iniciar sesión
            </button>
            <button
              className={`flex-1 py-2 rounded-md font-medium transition-smooth ${
                !isLogin
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground"
              }`}
              onClick={() => setIsLogin(false)}
            >
              Registrarse
            </button>
          </div>

          {/* Form */}
          <form className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="mt-1.5"
              />
            </div>
            <Button className="w-full btn-primary" size="lg">
              Iniciar sesión
            </Button>
          </form>
        </Card>

        {/* Back Link */}
        <Link
          to="/"
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-smooth"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>
      </div>
    </div>
  );
};

export default Login;
