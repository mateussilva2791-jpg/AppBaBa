export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  full_name: string;
};

export type League = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Player = {
  id: string;
  league_id: string;
  name: string;
  nickname: string | null;
  status: PlayerStatus;
  position: string | null;
  attack_rating: number;
  passing_rating: number;
  defense_rating: number;
  stamina_rating: number;
  ovr: number;
  relative_speed: number;
  relative_strength: number;
  skill_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SessionItem = {
  id: string;
  league_id: string;
  title: string;
  scheduled_at: string;
  location: string | null;
  team_count: number;
  team_size: number | null;
  flow_phase: string;
  current_staying_team_id: string | null;
  challenger_team_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type SessionPlayer = {
  id: string;
  league_id: string;
  session_id: string;
  player_id: string;
  is_confirmed: boolean;
  attendance_status: string;
  created_at: string;
  updated_at: string;
};

export type SessionTeam = {
  id: string;
  league_id: string;
  session_id: string;
  name: string;
  color: string | null;
  queue_order: number;
  created_at: string;
  updated_at: string;
};

export type SessionTeamPlayer = {
  id: string;
  league_id: string;
  team_id: string;
  player_id: string;
  is_captain: boolean;
  created_at: string;
  updated_at: string;
};

export type GeneratedTeamPlayer = {
  player_id: string;
  player_name: string;
  position: string | null;
  ovr: number;
  overall: number;
  balance_score: number;
  attack_rating: number;
  passing_rating: number;
  defense_rating: number;
  stamina_rating: number;
  relative_speed: number;
  relative_strength: number;
  skill_level: number;
};

export type TeamStrength = {
  total_strength: number;
  average_overall: number;
  attack_total: number;
  passing_total: number;
  defense_total: number;
  stamina_total: number;
};

export type GeneratedTeam = {
  team_id: string;
  name: string;
  color: string | null;
  total_skill: number;
  balance_delta: number;
  balance_state: string;
  strength: TeamStrength;
  players: GeneratedTeamPlayer[];
};

export type TeamComparison = {
  strongest_team_id: string | null;
  weakest_team_id: string | null;
  strength_gap: number;
  average_strength: number;
  balance_state: string;
};

export type TeamGenerationResponse = {
  session_id: string;
  mode: string;
  comparison: TeamComparison;
  teams: GeneratedTeam[];
};

export type SessionWorkflow = {
  session: SessionItem;
  confirmed_players: number;
  teams_created: number;
  matches_created: number;
  ready_for_draw: boolean;
  ready_for_matches: boolean;
  can_finalize: boolean;
  has_open_matches: boolean;
};

export type MatchItem = {
  id: string;
  league_id: string;
  session_id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number;
  away_score: number;
  status: string;
  stage: string;
  round_number: number;
  sequence: number;
  label: string | null;
  bracket_group: string | null;
  current_period: string;
  period_started_at: string | null;
  elapsed_seconds: number;
  is_clock_running: boolean;
  finished_at: string | null;
  winner_team_id: string | null;
  loser_team_id: string | null;
  home_team_source_match_id: string | null;
  away_team_source_match_id: string | null;
  home_team_source_outcome: string | null;
  away_team_source_outcome: string | null;
  created_at: string;
  updated_at: string;
};

export type SessionBracketMatch = {
  id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_name: string | null;
  away_team_name: string | null;
  stage: string;
  round_number: number;
  sequence: number;
  label: string | null;
  status: string;
  bracket_group: string | null;
  winner_team_id: string | null;
  loser_team_id: string | null;
  home_score: number;
  away_score: number;
  home_slot_label: string | null;
  away_slot_label: string | null;
  home_source: {
    match_id: string | null;
    label: string | null;
    outcome: string | null;
  } | null;
  away_source: {
    match_id: string | null;
    label: string | null;
    outcome: string | null;
  } | null;
};

export type SessionBracket = {
  session_id: string;
  flow_phase: string;
  current_staying_team_id: string | null;
  current_staying_team_name: string | null;
  challenger_team_id: string | null;
  challenger_team_name: string | null;
  current_match_id: string | null;
  next_match_id: string | null;
  queue: SessionTeam[];
  matches: SessionBracketMatch[];
};

export type SessionFinalizeSummary = {
  session: SessionItem;
  matches_finished: number;
  matches_locked: number;
  total_goals: number;
  champion_team_id: string | null;
  highlights: SessionHighlights | null;
  summary: SessionSummary | null;
};

export type MatchEventType =
  | "MATCH_STARTED"
  | "GOAL"
  | "ASSIST"
  | "FOUL"
  | "YELLOW_CARD"
  | "RED_CARD"
  | "SUBSTITUTION"
  | "HALF_TIME"
  | "SECOND_HALF_STARTED"
  | "MATCH_FINISHED"
  | "OWN_GOAL"
  | "CARD"
  | "CLEAN_SHEET";

export type MatchEvent = {
  id: string;
  league_id: string;
  match_id: string;
  team_id: string | null;
  event_type: MatchEventType;
  player_id: string | null;
  related_player_id: string | null;
  minute: number;
  second: number;
  notes: string | null;
  created_by: string | null;
  is_reverted: boolean;
  created_at: string;
  updated_at: string;
};

export type MatchEventDetail = MatchEvent & {
  team_name: string | null;
  player_name: string | null;
  related_player_name: string | null;
  created_by_name: string | null;
};

export type LiveTeamPlayer = {
  team_player_id: string;
  player_id: string;
  player_name: string;
  player_nickname: string | null;
  position: string | null;
  overall: number;
  attack_rating: number;
  passing_rating: number;
  defense_rating: number;
  stamina_rating: number;
  is_captain: boolean;
};

export type LiveTeam = {
  id: string;
  name: string;
  color: string | null;
  average_overall: number;
  total_strength: number;
  players: LiveTeamPlayer[];
};

export type LiveMatchCard = {
  match: MatchItem;
  home_team_name: string;
  away_team_name: string;
  home_team_color: string | null;
  away_team_color: string | null;
  last_event: MatchEventDetail | null;
};

export type SessionLiveState = {
  session: SessionItem;
  matches: LiveMatchCard[];
  queue: SessionTeam[];
  current_match_id: string | null;
  next_match_id: string | null;
  current_staying_team_name: string | null;
  challenger_team_name: string | null;
  recent_events: MatchEventDetail[];
  updated_at: string;
};

export type MatchLiveState = {
  session: SessionItem;
  match: LiveMatchCard;
  teams: LiveTeam[];
  events: MatchEventDetail[];
  updated_at: string;
};

export type LiveSocketEnvelope<T> = {
  type: string;
  payload: T;
};

export type RankingEntry = {
  id: string;
  league_id: string;
  player_id: string;
  player_name: string;
  player_nickname: string | null;
  matches_played: number;
  wins: number;
  losses: number;
  goals: number;
  assists: number;
  fouls: number;
  yellow_cards: number;
  red_cards: number;
  clean_sheets: number;
  attendances: number;
  participations: number;
  ranking_points: number;
  created_at: string;
  updated_at: string;
};

export type RankingSummaryItem = {
  player_id: string | null;
  player_name: string | null;
  value: number;
};

export type RankingSummary = {
  overall_leader: RankingSummaryItem;
  top_scorer: RankingSummaryItem;
  top_assist_provider: RankingSummaryItem;
  best_attendance: RankingSummaryItem;
  best_defense: RankingSummaryItem;
};

export type SessionPlayerScore = {
  id: string;
  league_id: string;
  session_id: string;
  player_id: string;
  player_name: string;
  player_nickname: string | null;
  goals: number;
  assists: number;
  fouls: number;
  yellow_cards: number;
  red_cards: number;
  wins: number;
  matches_played: number;
  total_score: number;
  average_score: number;
  rank_position: number;
  created_at: string;
  updated_at: string;
};

export type SessionHighlightPlayer = {
  player_id: string;
  player_name: string;
  player_nickname: string | null;
  goals: number;
  assists: number;
  fouls: number;
  yellow_cards: number;
  red_cards: number;
  wins: number;
  matches_played: number;
  total_score: number;
  average_score: number;
  rank_position: number;
};

export type SessionTeamOfTheWeekPlayer = {
  id: string;
  team_id: string;
  player_id: string;
  player_name: string;
  player_nickname: string | null;
  score: number;
  goals: number;
  assists: number;
  rank_position: number;
  created_at: string;
  updated_at: string;
};

export type SessionTeamOfTheWeek = {
  id: string;
  league_id: string;
  session_id: string;
  highlight_id: string | null;
  players: SessionTeamOfTheWeekPlayer[];
  created_at: string;
  updated_at: string;
};

export type SessionHighlights = {
  id: string;
  league_id: string;
  session_id: string;
  best_average_player_id: string | null;
  top_scorer_id: string | null;
  top_assist_player_id: string | null;
  best_player_id: string | null;
  best_average_player: SessionHighlightPlayer | null;
  top_scorer: SessionHighlightPlayer | null;
  top_assist_player: SessionHighlightPlayer | null;
  best_player: SessionHighlightPlayer | null;
  team_of_the_week: SessionTeamOfTheWeek | null;
  player_scores: SessionPlayerScore[];
  created_at: string;
  updated_at: string;
};

export type SessionSummaryHighlight = {
  id: string;
  created_at: string;
  updated_at: string;
  player_id: string | null;
  player_name: string | null;
  player_nickname: string | null;
  team_id: string | null;
  team_name: string | null;
  team_color: string | null;
  score: number | null;
  average_score: number | null;
  goals: number | null;
  assists: number | null;
  wins: number | null;
  goal_difference: number | null;
  points: number | null;
};

export type SessionSummaryPlayer = {
  id: string;
  created_at: string;
  updated_at: string;
  session_summary_id: string;
  player_id: string;
  player_name: string;
  player_nickname: string | null;
  score: number;
  average_score: number;
  goals: number;
  assists: number;
  fouls: number;
  yellow_cards: number;
  red_cards: number;
  wins: number;
  matches_played: number;
  rank_position: number;
};

export type SessionSummaryTeam = {
  id: string;
  created_at: string;
  updated_at: string;
  session_summary_id: string;
  team_id: string;
  team_name: string;
  team_color: string | null;
  wins: number;
  losses: number;
  draws: number;
  matches_played: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  team_score: number;
  points: number;
  rank_position: number;
};

export type SessionSummary = {
  id: string;
  created_at: string;
  updated_at: string;
  league_id: string;
  session_id: string;
  total_goals: number;
  top_scorer_player_id: string | null;
  best_player_id: string | null;
  best_team_id: string | null;
  most_wins_team_id: string | null;
  top_scorer: SessionSummaryHighlight | null;
  best_player: SessionSummaryHighlight | null;
  best_team: SessionSummaryHighlight | null;
  most_wins_team: SessionSummaryHighlight | null;
  players: SessionSummaryPlayer[];
  teams: SessionSummaryTeam[];
};

export type FeatureAccess = {
  plan: string;
  features: Record<string, boolean>;
  premium_enabled: boolean;
};

export type SubscriptionPlan = {
  id: string;
  code: string;
  name: string;
  price_monthly: number;
  max_players: number | null;
  max_sessions_per_month: number | null;
  features: Record<string, boolean>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ActiveLeagueResolution = {
  league: League | null;
  available_leagues: League[];
  fallback_reason: string | null;
};

export type PlayerStatus =
  | "ACTIVE"
  | "UNAVAILABLE"
  | "INJURED"
  | "SUSPENDED"
  | "PENDING"
  | "CONFIRMED";
