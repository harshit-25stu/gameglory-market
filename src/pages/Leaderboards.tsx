import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  Star,
  Crown,
  Zap,
  Users,
  Gamepad2,
  Target,
  Flame
} from "lucide-react";

interface LeaderboardEntry {
  id: string;
  leaderboard_id: string;
  user_id: string;
  score: number;
  rank: number;
  profiles: {
    username: string;
    avatar_url?: string;
    trader_level?: number;
  };
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  points: number;
  completed: boolean;
  progress: number;
  requirement_value: number;
}

const Leaderboards = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = '/auth';
      } else {
        setUserId(session.user.id);
      }
    });
  }, []);

  // Fetch leaderboards data
  const { data: leaderboardsData, isLoading: leaderboardsLoading } = useQuery({
    queryKey: ['leaderboards'],
    queryFn: async () => {
      const [leaderboardsRes, entriesRes] = await Promise.all([
        supabase.from('leaderboards').select('*').eq('is_active', true),
        supabase.from('leaderboard_entries')
          .select(`
            *,
            profiles:user_id (
              username,
              avatar_url,
              trader_level
            )
          `)
          .order('rank', { ascending: true })
          .limit(50)
      ]);

      return {
        leaderboards: leaderboardsRes.data || [],
        entries: entriesRes.data || []
      };
    },
  });

  // Fetch user achievements
  const { data: achievementsData, isLoading: achievementsLoading } = useQuery({
    queryKey: ['user-achievements', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase.rpc('check_achievement_progress', {
        p_user_id: userId
      });

      return data as Achievement[];
    },
    enabled: !!userId,
  });

  // Fetch user level data
  const { data: userLevel } = useQuery({
    queryKey: ['user-level', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data } = await supabase
        .from('user_levels')
        .select('*')
        .eq('user_id', userId)
        .single();

      return data;
    },
    enabled: !!userId,
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Award className="w-6 h-6 text-amber-600" />;
      default: return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'border-yellow-500 bg-yellow-500/10';
      case 'epic': return 'border-purple-500 bg-purple-500/10';
      case 'rare': return 'border-blue-500 bg-blue-500/10';
      default: return 'border-gray-500 bg-gray-500/10';
    }
  };

  const getLeaderboardIcon = (category: string) => {
    switch (category) {
      case 'trading': return <TrendingUp className="w-5 h-5" />;
      case 'activity': return <Zap className="w-5 h-5" />;
      case 'growth': return <Flame className="w-5 h-5" />;
      case 'social': return <Users className="w-5 h-5" />;
      case 'streaming': return <Gamepad2 className="w-5 h-5" />;
      case 'reputation': return <Star className="w-5 h-5" />;
      default: return <Target className="w-5 h-5" />;
    }
  };

  if (!userId || leaderboardsLoading || achievementsLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background pt-20 flex items-center justify-center">
          <div className="text-center">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse" />
            <p className="text-lg">Loading leaderboards...</p>
          </div>
        </div>
      </>
    );
  }

  const userRankings = leaderboardsData?.entries?.filter(entry => entry.user_id === userId) || [];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Leaderboards & Achievements
              </h1>
              <p className="text-muted-foreground mt-2">
                Compete with other traders and unlock achievements
              </p>
            </div>
            {userLevel && (
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">Level {userLevel.current_level}</div>
                    <div className="text-sm text-muted-foreground">{userLevel.total_xp} XP</div>
                  </div>
                  <div className="flex-1 max-w-32">
                    <Progress
                      value={(userLevel.current_xp / (userLevel.current_level * 1000)) * 100}
                      className="h-2"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      {userLevel.current_xp}/{userLevel.current_level * 1000} XP to next level
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <Tabs defaultValue="leaderboards" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="leaderboards">Leaderboards</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
            </TabsList>

            <TabsContent value="leaderboards" className="space-y-6">
              {/* User's Rankings */}
              {userRankings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      Your Rankings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {userRankings.slice(0, 6).map((ranking: any) => {
                        const leaderboard = leaderboardsData?.leaderboards?.find(l => l.id === ranking.leaderboard_id);
                        return (
                          <div key={ranking.id} className="flex items-center gap-3 p-3 border rounded-lg">
                            {getRankIcon(ranking.rank)}
                            <div className="flex-1">
                              <div className="font-medium">{leaderboard?.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {ranking.score} {leaderboard?.metric.replace('_', ' ')}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Leaderboard Categories */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {leaderboardsData?.leaderboards?.map((leaderboard: any) => {
                  const entries = leaderboardsData.entries.filter(e => e.leaderboard_id === leaderboard.id);

                  return (
                    <Card key={leaderboard.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          {getLeaderboardIcon(leaderboard.category)}
                          {leaderboard.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{leaderboard.description}</p>
                        <Badge variant="outline" className="w-fit">
                          {leaderboard.period.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {entries.slice(0, 10).map((entry: any) => (
                            <div
                              key={entry.id}
                              className={`flex items-center gap-3 p-3 rounded-lg ${
                                entry.user_id === userId ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-12">
                                {getRankIcon(entry.rank)}
                              </div>

                              <Avatar className="w-8 h-8">
                                <AvatarImage src={entry.profiles?.avatar_url} />
                                <AvatarFallback>
                                  {entry.profiles?.username?.charAt(0)?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>

                              <div className="flex-1">
                                <div className="font-medium flex items-center gap-2">
                                  {entry.profiles?.username}
                                  {entry.user_id === userId && (
                                    <Badge variant="secondary" className="text-xs">You</Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Level {entry.profiles?.trader_level || 1}
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="font-bold text-primary">
                                  {Math.round(entry.score * 100) / 100}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {leaderboard.metric.replace('_', ' ')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="achievements" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {achievementsData?.map((achievement: Achievement) => (
                  <Card
                    key={achievement.id}
                    className={`relative overflow-hidden ${getRarityColor(achievement.rarity)} ${
                      achievement.completed ? 'ring-2 ring-primary/50' : ''
                    }`}
                  >
                    {achievement.completed && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-green-500 hover:bg-green-600">
                          <Award className="w-3 h-3 mr-1" />
                          Unlocked
                        </Badge>
                      </div>
                    )}

                    <CardContent className="p-6">
                      <div className="text-center space-y-4">
                        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                          achievement.completed ? 'bg-primary/20' : 'bg-muted'
                        }`}>
                          <Award className={`w-8 h-8 ${
                            achievement.completed ? 'text-primary' : 'text-muted-foreground'
                          }`} />
                        </div>

                        <div>
                          <h3 className="font-bold text-lg">{achievement.name}</h3>
                          <p className="text-sm text-muted-foreground">{achievement.description}</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{achievement.progress}/{achievement.requirement_value}</span>
                          </div>
                          <Progress
                            value={(achievement.progress / achievement.requirement_value) * 100}
                            className="h-2"
                          />
                        </div>

                        <div className="flex items-center justify-center gap-2">
                          <Badge variant="outline">{achievement.category}</Badge>
                          <Badge variant="outline">{achievement.rarity}</Badge>
                          <Badge variant="outline">{achievement.points} XP</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Achievement Categories */}
              <Card>
                <CardHeader>
                  <CardTitle>Achievement Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                      <div className="font-medium">Trading</div>
                      <div className="text-sm text-muted-foreground">
                        {achievementsData?.filter(a => a.category === 'trading' && a.completed).length || 0} unlocked
                      </div>
                    </div>

                    <div className="text-center p-4 border rounded-lg">
                      <Users className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <div className="font-medium">Social</div>
                      <div className="text-sm text-muted-foreground">
                        {achievementsData?.filter(a => a.category === 'social' && a.completed).length || 0} unlocked
                      </div>
                    </div>

                    <div className="text-center p-4 border rounded-lg">
                      <Star className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                      <div className="font-medium">Reputation</div>
                      <div className="text-sm text-muted-foreground">
                        {achievementsData?.filter(a => a.category === 'reputation' && a.completed).length || 0} unlocked
                      </div>
                    </div>

                    <div className="text-center p-4 border rounded-lg">
                      <Zap className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                      <div className="font-medium">Special</div>
                      <div className="text-sm text-muted-foreground">
                        {achievementsData?.filter(a => a.category === 'special' && a.completed).length || 0} unlocked
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default Leaderboards;