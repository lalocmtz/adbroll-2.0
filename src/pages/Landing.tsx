import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Video, Zap, TrendingUp, Check } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Landing = () => {
  const features = [
    {
      icon: Video,
      title: "1. Sube tu b-roll o pega el link del video viral",
      description:
        "La IA define el guion, detecta estructuras y convierte tu link en archivo reutilizable.",
    },
    {
      icon: Zap,
      title: "2. Elige plantilla o deja que la IA decida por ti",
      description:
        "Hook, problema, prueba social… todo organizado en plantillas optimizadas para conversión.",
    },
    {
      icon: TrendingUp,
      title: "3. Obtén 3, 5 o 10 variantes listas para escalar",
      description:
        "Exporta la IA registro, optimizada y ready. Subirlas por Instagram, TikTok, Meta Ads.",
    },
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "19",
      features: [
        "3 Variantes",
        "1 AI creación",
        "1 Brand unlimited",
        "B-roll + guiones B-roll",
        "b-roll + guiones B-Roll B-oll",
        "Plantillas básicas",
      ],
    },
    {
      name: "Growth",
      price: "49",
      popular: true,
      features: [
        "Todas",
        "Ilimitadas variantes",
        "B-roll ilimitado",
        "Clonar video con IA",
        "Plantillas con datos",
        "Optimizador de scripts",
        "Guardar 1-5 video sources",
        "Variantes en serie",
      ],
    },
    {
      name: "Scale",
      price: "99",
      features: [
        "30 CTA",
        "30 CTA generados",
        "B-roll ilimitado",
        "5-10 videos o más B-rolls largos",
        "Custom B-roll con A1 ticket data, que sabe",
        "Comercio directo",
        "Smart peronias",
      ],
    },
  ];

  const faqs = [
    "¿Necesito grabar contenido nuevo para usar AdBroll?",
    "¿Qué pasa si no tengo suficiente B-Roll?",
    "¿Cómo funciona cuando pego el link de un video viral?",
    "¿Qué tan diferentes son las variantes entre sí?",
    "¿Puedo usar esto para TikTok, Meta Ads y Reels?",
    "¿Qué pasa si me quedo sin créditos del plan?",
    "¿Puedo usar una sola cuenta para varias marcas?",
    "¿Los videos llevan marca de agua?",
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-extrabold text-xl">adbroll</span>
          <nav className="flex items-center gap-6">
            <Link to="/login" className="text-sm font-medium hover:text-foreground transition-smooth">
              Iniciar
            </Link>
            <Link to="/login" className="text-sm font-medium hover:text-foreground transition-smooth">
              Precio
            </Link>
            <Link to="/login" className="text-sm font-medium hover:text-foreground transition-smooth">
              Log in
            </Link>
            <Button className="btn-primary">Empezar gratis</Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h1 className="mb-6">
          El B-Roll que ya tienes{" "}
          <span className="text-gradient">es oro</span>
          <br />
          Nosotros te ayudamos a{" "}
          <span className="text-gradient">exprimirlo</span>.
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Usa nuestras plantillas ganadoras o pega el link de tu video viral y la
          inteligencia IA estructura todo para crear tus variantes en minutos.
        </p>
        <Button className="btn-primary text-lg px-8 py-6">
          Crear tus primeros variantes
        </Button>
        <p className="text-sm text-muted-foreground mt-4">
          No necesitas tarjeta. Todo menor cada minuto lo que es batidos.
        </p>

        {/* Color Palette */}
        <div className="flex justify-center gap-4 mt-12">
          {["#C9A27B", "#E8946F", "#F4BB44", "#88B17F", "#F4A9B8", "#B4B4B4"].map((color) => (
            <div
              key={color}
              className="w-20 h-20 rounded-2xl shadow-lg"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-center mb-4">
          Generar anuncios ganadores es así de{" "}
          <span className="text-gradient">simple</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-8 mt-12">
          {features.map((feature, index) => (
            <Card key={index} className="p-8 text-center hover-lift">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-bold mb-3">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Target Audience Section */}
      <section className="bg-secondary/30 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-center mb-12">
            Hecho para quienes necesitan{" "}
            <span className="text-gradient">volumen creativo</span>
            <br />
            sin grabar más contenido
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "🛍️",
                title: "Marcas de e-commerce",
                description:
                  "Convierte tus clips de producto, tu video de ventas en múltiples ads listos para TikTok y Meta Ads.",
              },
              {
                icon: "🚀",
                title: "Agencias de ads",
                description:
                  "Entrega más tests, más rápido a tus clientes sin depender de la cámara o del calendario.",
              },
              {
                icon: "🎨",
                title: "Creadores y TikTok Sellers",
                description:
                  "Multiplica tu contenido sin comprometer identidad. 10 variantes de 1 TikTok en minutos.",
              },
            ].map((item, index) => (
              <Card key={index} className="p-8 text-center">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="font-bold mb-3">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          {pricingPlans.map((plan, index) => (
            <Card
              key={index}
              className={`p-8 ${plan.popular ? "border-2 border-accent shadow-xl" : ""}`}
            >
              {plan.popular && (
                <div className="bg-accent text-white text-xs font-semibold px-3 py-1 rounded-full inline-block mb-4">
                  Más popular
                </div>
              )}
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-5xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground"> €/ mes</span>
              </div>
              <Button
                className={`w-full mb-6 ${
                  plan.popular ? "btn-primary" : "btn-secondary"
                }`}
              >
                Suscribirse
              </Button>
              <ul className="space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <h2 className="text-center mb-12">Preguntas frecuentes</h2>
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                {faq}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Esta es una respuesta placeholder para la pregunta.
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Video Demo Section */}
      <section className="bg-secondary/30 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mx-auto mb-6">
            <Video className="w-10 h-10 text-primary-foreground" />
          </div>
          <h2 className="mb-4">
            Mira cómo 1 video se convierte en{" "}
            <span className="text-gradient">10 anuncios</span> listos para vender
          </h2>
          <p className="text-muted-foreground mb-8">
            Esta no es una plantilla con vista y música. Son variantes rápidas, con
            cortes, subtítulos, voces y estructura optimizada.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-secondary/20">
        <div className="max-w-7xl mx-auto px-6 py-12 text-center text-sm text-muted-foreground">
          <p>© 2025 adbroll. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
