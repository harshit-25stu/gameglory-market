import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Filter,
  Sparkles,
  TrendingUp,
  Star,
  MapPin,
  DollarSign,
  Gamepad2,
  Package,
  Zap,
  Loader2
} from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  game: string;
  platform: string;
  condition?: string;
  price: number;
  image_url?: string;
  seller_rating?: number;
  item_type: string;
  created_at: string;
}

interface SearchFilters {
  platforms: string[];
  conditions: string[];
  priceRange: [number, number];
  categories: string[];
  location?: string;
  sortBy: string;
}

export const AdvancedSearch = () => {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({
    platforms: [],
    conditions: [],
    priceRange: [0, 1000],
    categories: [],
    sortBy: "relevance"
  });
  const [searchMode, setSearchMode] = useState<'basic' | 'advanced' | 'ai'>('basic');

  const searchMutation = useQuery({
    queryKey: ['search', query, filters, searchMode],
    queryFn: async () => {
      if (!query.trim() && searchMode !== 'advanced') return { results: [], facets: {} };

      if (searchMode === 'ai') {
        // AI-powered search
        const { data, error } = await supabase.functions.invoke('ai-search', {
          body: {
            query,
            filters,
            limit: 50
          }
        });

        if (error) throw error;
        return data;
      } else {
        // Traditional search with filters
        let searchQuery = supabase
          .from('digital_items')
          .select(`
            *,
            seller:seller_id (
              username,
              trader_level
            )
          `)
          .eq('is_available', true);

        // Apply text search
        if (query.trim()) {
          searchQuery = searchQuery.or(`title.ilike.%${query}%,game_title.ilike.%${query}%`);
        }

        // Apply filters
        if (filters.platforms.length > 0) {
          searchQuery = searchQuery.in('platform', filters.platforms);
        }

        if (filters.priceRange[0] > 0 || filters.priceRange[1] < 1000) {
          searchQuery = searchQuery
            .gte('price', filters.priceRange[0])
            .lte('price', filters.priceRange[1]);
        }

        // Apply sorting
        switch (filters.sortBy) {
          case 'price_asc':
            searchQuery = searchQuery.order('price', { ascending: true });
            break;
          case 'price_desc':
            searchQuery = searchQuery.order('price', { ascending: false });
            break;
          case 'newest':
            searchQuery = searchQuery.order('created_at', { ascending: false });
            break;
          default:
            // For relevance, we'd implement a more complex ranking
            searchQuery = searchQuery.order('views_count', { ascending: false });
        }

        const { data, error } = await searchQuery.limit(50);

        if (error) throw error;

        return {
          results: data || [],
          facets: {
            platforms: ['ps5', 'ps4', 'xbox_series', 'switch', 'pc'],
            conditions: ['mint', 'excellent', 'good', 'fair'],
            priceRanges: [
              { label: 'Under $25', min: 0, max: 25 },
              { label: '$25-$50', min: 25, max: 50 },
              { label: '$50-$100', min: 50, max: 100 },
              { label: 'Over $100', min: 100, max: 1000 }
            ]
          }
        };
      }
    },
    enabled: false, // Only run when triggered
  });

  const handleSearch = () => {
    if (!query.trim() && searchMode === 'basic') {
      toast({
        title: "Enter a search query",
        description: "Please enter what you're looking for.",
        variant: "destructive",
      });
      return;
    }
    searchMutation.refetch();
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const toggleArrayFilter = (key: 'platforms' | 'conditions' | 'categories', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(item => item !== value)
        : [...prev[key], value]
    }));
  };

  const clearFilters = () => {
    setFilters({
      platforms: [],
      conditions: [],
      priceRange: [0, 1000],
      categories: [],
      sortBy: "relevance"
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Search Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Advanced Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={searchMode} onValueChange={(value: any) => setSearchMode(value)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Search</TabsTrigger>
              <TabsTrigger value="advanced">Advanced Filters</TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI Search
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search for games, skins, items..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={searchMutation.isLoading}>
                  {searchMutation.isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Platforms */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Platforms</label>
                  <div className="space-y-2">
                    {['ps5', 'ps4', 'xbox_series', 'xbox_one', 'switch', 'pc'].map(platform => (
                      <div key={platform} className="flex items-center space-x-2">
                        <Checkbox
                          id={platform}
                          checked={filters.platforms.includes(platform)}
                          onCheckedChange={() => toggleArrayFilter('platforms', platform)}
                        />
                        <label htmlFor={platform} className="text-sm capitalize">
                          {platform.replace('_', ' ')}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conditions */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Condition</label>
                  <div className="space-y-2">
                    {['mint', 'excellent', 'good', 'fair', 'poor'].map(condition => (
                      <div key={condition} className="flex items-center space-x-2">
                        <Checkbox
                          id={condition}
                          checked={filters.conditions.includes(condition)}
                          onCheckedChange={() => toggleArrayFilter('conditions', condition)}
                        />
                        <label htmlFor={condition} className="text-sm capitalize">
                          {condition}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price Range</label>
                  <div className="px-2">
                    <Slider
                      value={filters.priceRange}
                      onValueChange={(value) => handleFilterChange('priceRange', value)}
                      max={1000}
                      min={0}
                      step={10}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>${filters.priceRange[0]}</span>
                      <span>${filters.priceRange[1]}</span>
                    </div>
                  </div>
                </div>

                {/* Sort By */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sort By</label>
                  <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="price_asc">Price: Low to High</SelectItem>
                      <SelectItem value="price_desc">Price: High to Low</SelectItem>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="rating">Highest Rated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Search query..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
                <Button onClick={handleSearch} disabled={searchMutation.isLoading}>
                  {searchMutation.isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="ai" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">AI-Powered Search</label>
                  <p className="text-sm text-muted-foreground">
                    Describe what you're looking for in natural language. Our AI will understand your intent and find the best matches.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., 'Looking for a mint condition Zelda game for Switch under $50'"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1"
                  />
                  <Button onClick={handleSearch} disabled={searchMutation.isLoading}>
                    {searchMutation.isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        AI Search
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchMutation.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Search Results</span>
              <Badge variant="secondary">
                {searchMutation.data.results?.length || 0} results
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {searchMutation.data.results?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchMutation.data.results.map((item: any) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-medium line-clamp-2">{item.title}</h3>
                          <p className="text-sm text-muted-foreground">{item.game_title}</p>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {item.platform?.replace('_', ' ').toUpperCase()}
                            </Badge>
                            {item.condition && (
                              <Badge variant="secondary" className="text-xs">
                                {item.condition}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">${item.price}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Seller: {item.seller?.username}</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span>4.8</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No results found</p>
                <p className="text-sm">Try adjusting your search terms or filters</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      {searchMode === 'ai' && searchMutation.data?.parsedParams && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              AI Search Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Detected Intent</h4>
                <Badge variant="secondary">
                  {searchMutation.data.parsedParams.intent}
                </Badge>
              </div>

              {searchMutation.data.parsedParams.searchTerms?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Search Terms</h4>
                  <div className="flex flex-wrap gap-1">
                    {searchMutation.data.parsedParams.searchTerms.map((term: string, i: number) => (
                      <Badge key={i} variant="outline">{term}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {searchMutation.data.parsedParams.platforms?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Platforms</h4>
                  <div className="flex flex-wrap gap-1">
                    {searchMutation.data.parsedParams.platforms.map((platform: string, i: number) => (
                      <Badge key={i} variant="outline">{platform}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-2">Confidence</h4>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full">
                    <div
                      className="h-2 bg-primary rounded-full"
                      style={{ width: `${(searchMutation.data.parsedParams.confidence || 0) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm">
                    {Math.round((searchMutation.data.parsedParams.confidence || 0) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};