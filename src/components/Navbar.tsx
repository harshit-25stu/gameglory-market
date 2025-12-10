import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Gamepad2, Search, User, ShoppingCart, Bell, Users, Package, Mic, Video } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <Gamepad2 className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 blur-xl bg-primary/30 group-hover:bg-primary/50 transition-all" />
            </div>
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              PlayHub
            </span>
          </Link>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search items, games, players..."
                className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Users className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/hubs" className="cursor-pointer">Game Hubs</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/physical-games" className="cursor-pointer">
                    <Package className="h-4 w-4 mr-2" />
                    Physical Games
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/watch-parties" className="cursor-pointer">
                    <Video className="h-4 w-4 mr-2" />
                    Watch Parties
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/hangouts" className="cursor-pointer">
                    <Mic className="h-4 w-4 mr-2" />
                    Player Hangouts
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-accent rounded-full animate-pulse-glow" />
            </Button>
            
            <Button variant="ghost" size="icon">
              <ShoppingCart className="h-5 w-5" />
            </Button>
            
            <Link to="/auth">
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </Link>
            
            <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
              Sell Items
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
