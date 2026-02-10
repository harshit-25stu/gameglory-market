import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Gamepad2, User, ShoppingCart, Bell, Package, Wallet, ArrowLeft } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isInnerPage = location.pathname !== "/dashboard";

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 glass-strong">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Back + Logo */}
          <div className="flex items-center gap-2">
            {isInnerPage && (
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-1 click-scale">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <Link to="/dashboard" className="flex items-center gap-2 group">
              <div className="relative icon-hover">
                <Gamepad2 className="h-8 w-8 text-primary" />
                <div className="absolute inset-0 blur-xl bg-primary/30 group-hover:bg-primary/50 transition-all animate-glow-pulse" />
              </div>
              <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent text-glow-primary">
                PlayHub
              </span>
            </Link>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative click-scale icon-hover">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-accent rounded-full animate-pulse-glow" />
            </Button>
            
            <Button variant="ghost" size="icon" className="click-scale icon-hover">
              <ShoppingCart className="h-5 w-5" />
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="click-scale icon-hover">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-strong">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <User className="h-4 w-4 mr-2" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <Wallet className="h-4 w-4 mr-2" />
                    Wallet
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/orders" className="cursor-pointer">
                    <Package className="h-4 w-4 mr-2" />
                    My Orders
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/auth" className="cursor-pointer">
                    Sign In / Sign Up
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Link to="/games">
              <Button className="bg-gradient-primary hover:opacity-90 transition-opacity btn-glow btn-pulse click-scale">
                Sell Skins
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
