import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NotificationProvider } from "@/contexts/NotificationContext";
import Index from "./pages/Index";
import Splash from "./pages/Splash";
import Auth from "./pages/Auth";
import Hubs from "./pages/Hubs";
import GameHub from "./pages/GameHub";
import PhysicalGames from "./pages/PhysicalGames";
import WatchParties from "./pages/WatchParties";
import WatchParty from "./pages/WatchParty";
import Hangouts from "./pages/Hangouts";
import HangoutRoom from "./pages/HangoutRoom";
import TradeIn from "./pages/TradeIn";
import Marketplace from "./pages/Marketplace";
import Orders from "./pages/Orders";
import LiveStreams from "./pages/LiveStreams";
import StreamRoom from "./pages/StreamRoom";
import EsportsEvents from "./pages/EsportsEvents";
import EsportsEventDetail from "./pages/EsportsEventDetail";
import Games from "./pages/Games";
import SkinMarketplace from "./pages/SkinMarketplace";
import Profile from "./pages/Profile";
import Analytics from "./pages/Analytics";
import Leaderboards from "./pages/Leaderboards";
import AdminDashboard from "./pages/AdminDashboard";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <NotificationProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Splash />} />
            <Route path="/home" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/hubs" element={<Hubs />} />
            <Route path="/hubs/:slug" element={<GameHub />} />
            <Route path="/physical-games" element={<PhysicalGames />} />
            <Route path="/watch-parties" element={<WatchParties />} />
            <Route path="/watch-party/:id" element={<WatchParty />} />
            <Route path="/hangouts" element={<Hangouts />} />
            <Route path="/hangout/:id" element={<HangoutRoom />} />
            <Route path="/trade-in" element={<TradeIn />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/streams" element={<LiveStreams />} />
            <Route path="/streams/:id" element={<StreamRoom />} />
            <Route path="/esports" element={<EsportsEvents />} />
            <Route path="/esports/:id" element={<EsportsEventDetail />} />
          <Route path="/games" element={<Games />} />
          <Route path="/skins" element={<SkinMarketplace />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/leaderboards" element={<Leaderboards />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </NotificationProvider>
  </QueryClientProvider>
);

export default App;
