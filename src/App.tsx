import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Hubs from "./pages/Hubs";
import GameHub from "./pages/GameHub";
import PhysicalGames from "./pages/PhysicalGames";
import WatchParties from "./pages/WatchParties";
import WatchParty from "./pages/WatchParty";
import Hangouts from "./pages/Hangouts";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/hubs" element={<Hubs />} />
          <Route path="/hubs/:slug" element={<GameHub />} />
          <Route path="/physical-games" element={<PhysicalGames />} />
          <Route path="/watch-parties" element={<WatchParties />} />
          <Route path="/watch-party/:id" element={<WatchParty />} />
          <Route path="/hangouts" element={<Hangouts />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
