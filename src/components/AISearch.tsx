import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Search, Filter, Sparkles, Star, DollarSign, Gamepad2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SearchFilters {
  category?: string;
  platform?: string;
  priceRange?: { min: number; max: number };
  condition?: string;
  rarity?: string;
}

interface SearchResult {
  id: string;
  type: 'digital_item' | 'physical_game' | 'game_skin';
  title: string;
  description?: string;
  price: number;
  platform?: string;
  condition?: string;
  rarity?: string;
  image_url?: string;
  seller_username: string;
  relevance_score: number;
  match_reasons: string[];
}

interface AISearchProps {
  onResultSelect?: (result: SearchResult) => void;
  placeholder?: string;
  showFilters?: boolean;
  className?: string;
}

export const AISearch = ({
  onResultSelect,
  placeholder = "Search for games, skins, items...",
  showFilters = true,
  className = ""
}: AISearchProps) => {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const { data: searchResults, isLoading, refetch, isError } = useQuery({
    queryKey: ['ai-search', query, filters, priceRange],
    queryFn: async () => {
      if (!query.trim()) return null;

      const searchFilters = {
        ...filters,
        priceRange: { min: priceRange[0], max: priceRange[1] }
      };

      const { data, error } = await supabase.functions.invoke('ai-search', {
        body: {
          query: query.trim(),
          filters: searchFilters,
          limit: 20
        }
      });

      if (error) throw error;
      return data;
    },
    enabled: false, // Only run when manually triggered
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleSearch = () => {
    if (query.trim()) {
      refetch();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'digital_item': return '🎮';
      case 'physical_game': return '💿';
      case 'game_skin': return '🎨';
      default: return '📦';
    }
  };

  const getRarityColor = (rarity?: string) => {
    switch (rarity) {
      case 'legendary': return 'border-yellow-500 bg-yellow-500/10';
      case 'epic': return 'border-purple-500 bg-purple-500/10';
      case 'rare': return 'border-blue-500 bg-blue-500/10';
      default: return 'border-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} disabled={isLoading || !query.trim()}>
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          Search
        </Button>
        {showFilters && (
          <Button
            variant="outline"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            <Filter className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {showFilters && showAdvancedFilters && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select value={filters.category} onValueChange={(value) =>
                  setFilters(prev => ({ ...prev, category: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="digital">Digital Items</SelectItem>
                    <SelectItem value="physical">Physical Games</SelectItem>
                    <SelectItem value="skins">Game Skins</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Platform</label>
                <Select value={filters.platform} onValueChange={(value) =>
                  setFilters(prev => ({ ...prev, platform: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ps5">PS5</SelectItem>
                    <SelectItem value="ps4">PS4</SelectItem>
                    <SelectItem value="xbox_series">Xbox Series</SelectItem>
                    <SelectItem value="xbox_one">Xbox One</SelectItem>
                    <SelectItem value="switch">Nintendo Switch</SelectItem>
                    <SelectItem value="pc">PC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Condition</label>
                <Select value={filters.condition} onValueChange={(value) =>
                  setFilters(prev => ({ ...prev, condition: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mint">Mint</SelectItem>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Rarity</label>
                <Select value={filters.rarity} onValueChange={(value) =>
                  setFilters(prev => ({ ...prev, rarity: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="common">Common</SelectItem>
                    <SelectItem value="uncommon">Uncommon</SelectItem>
                    <SelectItem value="rare">Rare</SelectItem>
                    <SelectItem value="epic">Epic</SelectItem>
                    <SelectItem value="legendary">Legendary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Price Range: ${priceRange[0]} - ${priceRange[1]}
              </label>
              <Slider
                value={priceRange}
                onValueChange={setPriceRange}
                max={2000}
                min={0}
                step={10}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {searchResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">
              Search Results for "{query}"
            </h3>
            <Badge variant="secondary">
              {searchResults.results?.length || 0} results
            </Badge>
          </div>

          {searchResults.results?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.results.map((result: SearchResult) => (
                <Card
                  key={result.id}
                  className={`cursor-pointer hover:shadow-lg transition-shadow ${getRarityColor(result.rarity)}`}
                  onClick={() => onResultSelect?.(result)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{getTypeIcon(result.type)}</span>
                        <div className="flex-1">
                          <h4 className="font-medium line-clamp-2">{result.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            by {result.seller_username}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-bold">${result.price}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs">{result.relevance_score}% match</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {result.platform && (
                          <Badge variant="outline" className="text-xs">
                            <Gamepad2 className="w-3 h-3 mr-1" />
                            {result.platform}
                          </Badge>
                        )}
                        {result.condition && (
                          <Badge variant="outline" className="text-xs">
                            {result.condition}
                          </Badge>
                        )}
                        {result.rarity && (
                          <Badge variant="outline" className="text-xs">
                            {result.rarity}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1">
                        {result.match_reasons.slice(0, 2).map((reason, index) => (
                          <div key={index} className="text-xs text-green-600 flex items-center gap-1">
                            <div className="w-1 h-1 bg-green-500 rounded-full" />
                            {reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No results found for "{query}"</p>
              <p className="text-sm mt-1">Try adjusting your search terms or filters</p>
            </div>
          )}
        </div>
      )}

      {isError && (
        <div className="text-center py-4">
          <p className="text-red-600">Search failed. Please try again.</p>
        </div>
      )}
    </div>
  );
};