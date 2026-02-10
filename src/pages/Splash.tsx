import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Gamepad2, ShoppingCart, Users, Trophy, Sparkles, ChevronRight, ChevronLeft } from "lucide-react";

const steps = [
  {
    icon: Gamepad2,
    title: "Welcome to PlayHub",
    description: "The ultimate gaming marketplace where players trade skins, connect with communities, and level up their collections.",
    gradient: "from-primary/30 to-secondary/30",
  },
  {
    icon: ShoppingCart,
    title: "Buy & Sell Game Skins",
    description: "Browse thousands of skins across CS:GO, Valorant, Fortnite, FIFA and more. Trade safely with our verified marketplace.",
    gradient: "from-accent/30 to-primary/30",
  },
  {
    icon: Users,
    title: "Join Game Communities",
    description: "Find your tribe in Game Hubs, watch parties, voice hangouts, and live streams. Connect with gamers worldwide.",
    gradient: "from-secondary/30 to-accent/30",
  },
  {
    icon: Trophy,
    title: "Compete & Earn",
    description: "Participate in esports tournaments, earn XP, climb trader levels, and unlock rewards as you trade and engage.",
    gradient: "from-primary/30 to-success/30",
  },
];

const Splash = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const isLast = currentStep === steps.length - 1;
  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] rounded-full bg-secondary/5 blur-[100px]" />
      </div>

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-2 mb-12">
        <Gamepad2 className="h-8 w-8 text-primary" />
        <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          PlayHub
        </span>
      </div>

      {/* Step card */}
      <div className="relative z-10 w-full max-w-md">
        <div className={`bg-gradient-to-br ${step.gradient} rounded-2xl p-8 border border-border backdrop-blur-sm text-center space-y-6 transition-all duration-500`}>
          <div className="mx-auto w-20 h-20 rounded-2xl bg-background/50 flex items-center justify-center border border-border">
            <Icon className="h-10 w-10 text-primary" />
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-foreground">{step.title}</h1>
            <p className="text-muted-foreground leading-relaxed">{step.description}</p>
          </div>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-6">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentStep ? "w-8 bg-primary" : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          {currentStep > 0 ? (
            <Button
              variant="ghost"
              onClick={() => setCurrentStep((s) => s - 1)}
              className="text-muted-foreground"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          ) : (
            <div />
          )}

          {isLast ? (
            <Button
              onClick={() => navigate("/auth")}
              className="bg-gradient-primary px-8"
            >
              Get Started <Sparkles className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentStep((s) => s + 1)}
              className="bg-gradient-primary"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Skip */}
        {!isLast && (
          <div className="text-center mt-4">
            <Button
              variant="link"
              onClick={() => navigate("/auth")}
              className="text-muted-foreground text-sm"
            >
              Skip to Sign In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Splash;
