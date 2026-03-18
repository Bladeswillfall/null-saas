export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Tables = {
  organizations: {
    Row: {
      id: string;
      name: string;
      slug: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      name: string;
      slug: string;
      created_at?: string;
    };
    Update: {
      id?: string;
      name?: string;
      slug?: string;
      created_at?: string;
    };
    Relationships: [];
  };
  organization_members: {
    Row: {
      organization_id: string;
      user_id: string;
      role: Database['public']['Enums']['member_role'];
      created_at: string;
    };
    Insert: {
      organization_id: string;
      user_id: string;
      role?: Database['public']['Enums']['member_role'];
      created_at?: string;
    };
    Update: {
      organization_id?: string;
      user_id?: string;
      role?: Database['public']['Enums']['member_role'];
      created_at?: string;
    };
    Relationships: [];
  };
  profiles: {
    Row: {
      id: string;
      email: string | null;
      display_name: string | null;
      created_at: string;
    };
    Insert: {
      id: string;
      email?: string | null;
      display_name?: string | null;
      created_at?: string;
    };
    Update: {
      id?: string;
      email?: string | null;
      display_name?: string | null;
      created_at?: string;
    };
    Relationships: [];
  };
  workspaces: {
    Row: {
      id: string;
      organization_id: string;
      name: string;
      slug: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      organization_id: string;
      name: string;
      slug: string;
      created_at?: string;
    };
    Update: {
      id?: string;
      organization_id?: string;
      name?: string;
      slug?: string;
      created_at?: string;
    };
    Relationships: [];
  };
  subsidiaries: {
    Row: {
      id: string;
      organization_id: string;
      name: string;
      description: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      organization_id: string;
      name: string;
      description?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      organization_id?: string;
      name?: string;
      description?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  ips: {
    Row: {
      id: string;
      subsidiary_id: string;
      organization_id: string;
      title: string;
      description: string | null;
      status: string;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      subsidiary_id: string;
      organization_id: string;
      title: string;
      description?: string | null;
      status?: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      subsidiary_id?: string;
      organization_id?: string;
      title?: string;
      description?: string | null;
      status?: string;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  creators: {
    Row: {
      id: string;
      organization_id: string;
      name: string;
      email: string | null;
      verified: boolean | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      organization_id: string;
      name: string;
      email?: string | null;
      verified?: boolean | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      organization_id?: string;
      name?: string;
      email?: string | null;
      verified?: boolean | null;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  ip_contributors: {
    Row: {
      id: string;
      ip_id: string;
      creator_id: string;
      role: string;
      contribution_percentage: string | null;
      created_at: string;
    };
    Insert: {
      id?: string;
      ip_id: string;
      creator_id: string;
      role?: string;
      contribution_percentage?: string | null;
      created_at?: string;
    };
    Update: {
      id?: string;
      ip_id?: string;
      creator_id?: string;
      role?: string;
      contribution_percentage?: string | null;
      created_at?: string;
    };
    Relationships: [];
  };
  creator_agreements: {
    Row: {
      id: string;
      organization_id: string;
      creator_id: string;
      title: string;
      terms: string | null;
      rate_percentage: string | null;
      effective_date: string | null;
      expires_date: string | null;
      status: string;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      organization_id: string;
      creator_id: string;
      title: string;
      terms?: string | null;
      rate_percentage?: string | null;
      effective_date?: string | null;
      expires_date?: string | null;
      status?: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      organization_id?: string;
      creator_id?: string;
      title?: string;
      terms?: string | null;
      rate_percentage?: string | null;
      effective_date?: string | null;
      expires_date?: string | null;
      status?: string;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  payout_periods: {
    Row: {
      id: string;
      organization_id: string;
      period_start: string;
      period_end: string;
      status: string;
      total_amount: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      organization_id: string;
      period_start: string;
      period_end: string;
      status?: string;
      total_amount?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      organization_id?: string;
      period_start?: string;
      period_end?: string;
      status?: string;
      total_amount?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  payout_ledger_entries: {
    Row: {
      id: string;
      payout_period_id: string;
      creator_id: string;
      ip_id: string | null;
      amount: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      payout_period_id: string;
      creator_id: string;
      ip_id?: string | null;
      amount: string;
      created_at?: string;
    };
    Update: {
      id?: string;
      payout_period_id?: string;
      creator_id?: string;
      ip_id?: string | null;
      amount?: string;
      created_at?: string;
    };
    Relationships: [];
  };
  franchises: {
    Row: {
      id: string;
      organization_id: string;
      name: string;
      slug: string;
      description: string | null;
      primary_category: Database['public']['Enums']['media_type_enum'] | null;
      status: string;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      organization_id: string;
      name: string;
      slug: string;
      description?: string | null;
      primary_category?: Database['public']['Enums']['media_type_enum'] | null;
      status?: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      organization_id?: string;
      name?: string;
      slug?: string;
      description?: string | null;
      primary_category?: Database['public']['Enums']['media_type_enum'] | null;
      status?: string;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  works: {
    Row: {
      id: string;
      organization_id: string;
      franchise_id: string | null;
      title: string;
      canonical_title: string | null;
      media_type: Database['public']['Enums']['media_type_enum'];
      series_name: string | null;
      volume_number: number | null;
      release_date: string | null;
      language: string | null;
      region: string | null;
      publisher: string | null;
      status: string;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      organization_id: string;
      franchise_id?: string | null;
      title: string;
      canonical_title?: string | null;
      media_type: Database['public']['Enums']['media_type_enum'];
      series_name?: string | null;
      volume_number?: number | null;
      release_date?: string | null;
      language?: string | null;
      region?: string | null;
      publisher?: string | null;
      status?: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      organization_id?: string;
      franchise_id?: string | null;
      title?: string;
      canonical_title?: string | null;
      media_type?: Database['public']['Enums']['media_type_enum'];
      series_name?: string | null;
      volume_number?: number | null;
      release_date?: string | null;
      language?: string | null;
      region?: string | null;
      publisher?: string | null;
      status?: string;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  source_providers: {
    Row: {
      id: string;
      slug: string;
      name: string;
      source_family: Database['public']['Enums']['source_family_enum'];
      access_type: Database['public']['Enums']['access_type_enum'];
      confidence_tier: Database['public']['Enums']['confidence_tier_enum'];
      is_active: boolean;
      created_at: string;
    };
    Insert: {
      id?: string;
      slug: string;
      name: string;
      source_family: Database['public']['Enums']['source_family_enum'];
      access_type?: Database['public']['Enums']['access_type_enum'];
      confidence_tier?: Database['public']['Enums']['confidence_tier_enum'];
      is_active?: boolean;
      created_at?: string;
    };
    Update: {
      id?: string;
      slug?: string;
      name?: string;
      source_family?: Database['public']['Enums']['source_family_enum'];
      access_type?: Database['public']['Enums']['access_type_enum'];
      confidence_tier?: Database['public']['Enums']['confidence_tier_enum'];
      is_active?: boolean;
      created_at?: string;
    };
    Relationships: [];
  };
  work_external_ids: {
    Row: {
      id: string;
      work_id: string;
      source_provider_id: string;
      external_id: string;
      external_url: string | null;
      match_type: Database['public']['Enums']['match_type_enum'];
      created_at: string;
    };
    Insert: {
      id?: string;
      work_id: string;
      source_provider_id: string;
      external_id: string;
      external_url?: string | null;
      match_type?: Database['public']['Enums']['match_type_enum'];
      created_at?: string;
    };
    Update: {
      id?: string;
      work_id?: string;
      source_provider_id?: string;
      external_id?: string;
      external_url?: string | null;
      match_type?: Database['public']['Enums']['match_type_enum'];
      created_at?: string;
    };
    Relationships: [];
  };
  import_batches: {
    Row: {
      id: string;
      organization_id: string;
      source_provider_id: string;
      import_type: string;
      uploaded_by: string | null;
      status: Database['public']['Enums']['import_status_enum'];
      row_count: number;
      error_count: number;
      started_at: string | null;
      completed_at: string | null;
      created_at: string;
    };
    Insert: {
      id?: string;
      organization_id: string;
      source_provider_id: string;
      import_type?: string;
      uploaded_by?: string | null;
      status?: Database['public']['Enums']['import_status_enum'];
      row_count?: number;
      error_count?: number;
      started_at?: string | null;
      completed_at?: string | null;
      created_at?: string;
    };
    Update: {
      id?: string;
      organization_id?: string;
      source_provider_id?: string;
      import_type?: string;
      uploaded_by?: string | null;
      status?: Database['public']['Enums']['import_status_enum'];
      row_count?: number;
      error_count?: number;
      started_at?: string | null;
      completed_at?: string | null;
      created_at?: string;
    };
    Relationships: [];
  };
  raw_observations: {
    Row: {
      id: string;
      import_batch_id: string;
      source_provider_id: string;
      raw_work_title: string | null;
      raw_ip_name: string | null;
      raw_author_or_creator: string | null;
      raw_category: string | null;
      raw_region: string | null;
      raw_language: string | null;
      observed_at: string;
      rank_value: number | null;
      rating_value: string | null;
      review_count: number | null;
      view_count: number | null;
      engagement_count: number | null;
      sales_value: string | null;
      sales_is_estimated: boolean | null;
      awards_value: string | null;
      metadata_json: Json | null;
      created_at: string;
    };
    Insert: {
      id?: string;
      import_batch_id: string;
      source_provider_id: string;
      raw_work_title?: string | null;
      raw_ip_name?: string | null;
      raw_author_or_creator?: string | null;
      raw_category?: string | null;
      raw_region?: string | null;
      raw_language?: string | null;
      observed_at: string;
      rank_value?: number | null;
      rating_value?: string | null;
      review_count?: number | null;
      view_count?: number | null;
      engagement_count?: number | null;
      sales_value?: string | null;
      sales_is_estimated?: boolean | null;
      awards_value?: string | null;
      metadata_json?: Json | null;
      created_at?: string;
    };
    Update: {
      id?: string;
      import_batch_id?: string;
      source_provider_id?: string;
      raw_work_title?: string | null;
      raw_ip_name?: string | null;
      raw_author_or_creator?: string | null;
      raw_category?: string | null;
      raw_region?: string | null;
      raw_language?: string | null;
      observed_at?: string;
      rank_value?: number | null;
      rating_value?: string | null;
      review_count?: number | null;
      view_count?: number | null;
      engagement_count?: number | null;
      sales_value?: string | null;
      sales_is_estimated?: boolean | null;
      awards_value?: string | null;
      metadata_json?: Json | null;
      created_at?: string;
    };
    Relationships: [];
  };
  normalized_observations: {
    Row: {
      id: string;
      raw_observation_id: string;
      work_id: string;
      source_provider_id: string;
      observed_at: string;
      metric_type: string;
      metric_value: string;
      metric_unit: string | null;
      window_hint: string | null;
      confidence_score: string | null;
      provenance_tag: Database['public']['Enums']['provenance_tag_enum'];
      created_at: string;
    };
    Insert: {
      id?: string;
      raw_observation_id: string;
      work_id: string;
      source_provider_id: string;
      observed_at: string;
      metric_type: string;
      metric_value: string;
      metric_unit?: string | null;
      window_hint?: string | null;
      confidence_score?: string | null;
      provenance_tag: Database['public']['Enums']['provenance_tag_enum'];
      created_at?: string;
    };
    Update: {
      id?: string;
      raw_observation_id?: string;
      work_id?: string;
      source_provider_id?: string;
      observed_at?: string;
      metric_type?: string;
      metric_value?: string;
      metric_unit?: string | null;
      window_hint?: string | null;
      confidence_score?: string | null;
      provenance_tag?: Database['public']['Enums']['provenance_tag_enum'];
      created_at?: string;
    };
    Relationships: [];
  };
  quality_flags: {
    Row: {
      id: string;
      raw_observation_id: string | null;
      work_id: string | null;
      flag_type: Database['public']['Enums']['flag_type_enum'];
      severity: Database['public']['Enums']['flag_severity_enum'];
      notes: string | null;
      resolved_at: string | null;
      resolved_by: string | null;
      created_at: string;
    };
    Insert: {
      id?: string;
      raw_observation_id?: string | null;
      work_id?: string | null;
      flag_type: Database['public']['Enums']['flag_type_enum'];
      severity?: Database['public']['Enums']['flag_severity_enum'];
      notes?: string | null;
      resolved_at?: string | null;
      resolved_by?: string | null;
      created_at?: string;
    };
    Update: {
      id?: string;
      raw_observation_id?: string | null;
      work_id?: string | null;
      flag_type?: Database['public']['Enums']['flag_type_enum'];
      severity?: Database['public']['Enums']['flag_severity_enum'];
      notes?: string | null;
      resolved_at?: string | null;
      resolved_by?: string | null;
      created_at?: string;
    };
    Relationships: [];
  };
  score_components: {
    Row: {
      id: string;
      work_id: string;
      score_date: string;
      time_window: Database['public']['Enums']['time_window_enum'];
      component_type: string;
      component_score: string;
      weight_used: string | null;
      provenance_summary: string | null;
      created_at: string;
    };
    Insert: {
      id?: string;
      work_id: string;
      score_date: string;
      time_window: Database['public']['Enums']['time_window_enum'];
      component_type: string;
      component_score: string;
      weight_used?: string | null;
      provenance_summary?: string | null;
      created_at?: string;
    };
    Update: {
      id?: string;
      work_id?: string;
      score_date?: string;
      time_window?: Database['public']['Enums']['time_window_enum'];
      component_type?: string;
      component_score?: string;
      weight_used?: string | null;
      provenance_summary?: string | null;
      created_at?: string;
    };
    Relationships: [];
  };
  work_scores: {
    Row: {
      id: string;
      work_id: string;
      score_date: string;
      time_window: Database['public']['Enums']['time_window_enum'];
      composite_score: string;
      momentum_score: string | null;
      confidence_score: string | null;
      rank_overall: number | null;
      rank_in_category: number | null;
      rank_delta: number | null;
      created_at: string;
    };
    Insert: {
      id?: string;
      work_id: string;
      score_date: string;
      time_window: Database['public']['Enums']['time_window_enum'];
      composite_score?: string;
      momentum_score?: string | null;
      confidence_score?: string | null;
      rank_overall?: number | null;
      rank_in_category?: number | null;
      rank_delta?: number | null;
      created_at?: string;
    };
    Update: {
      id?: string;
      work_id?: string;
      score_date?: string;
      time_window?: Database['public']['Enums']['time_window_enum'];
      composite_score?: string;
      momentum_score?: string | null;
      confidence_score?: string | null;
      rank_overall?: number | null;
      rank_in_category?: number | null;
      rank_delta?: number | null;
      created_at?: string;
    };
    Relationships: [];
  };
  ip_scores: {
    Row: {
      id: string;
      franchise_id: string;
      score_date: string;
      time_window: Database['public']['Enums']['time_window_enum'];
      composite_score: string;
      momentum_score: string | null;
      confidence_score: string | null;
      rank_overall: number | null;
      rank_delta: number | null;
      active_work_count: number;
      created_at: string;
    };
    Insert: {
      id?: string;
      franchise_id: string;
      score_date: string;
      time_window: Database['public']['Enums']['time_window_enum'];
      composite_score?: string;
      momentum_score?: string | null;
      confidence_score?: string | null;
      rank_overall?: number | null;
      rank_delta?: number | null;
      active_work_count?: number;
      created_at?: string;
    };
    Update: {
      id?: string;
      franchise_id?: string;
      score_date?: string;
      time_window?: Database['public']['Enums']['time_window_enum'];
      composite_score?: string;
      momentum_score?: string | null;
      confidence_score?: string | null;
      rank_overall?: number | null;
      rank_delta?: number | null;
      active_work_count?: number;
      created_at?: string;
    };
    Relationships: [];
  };
  leaderboard_snapshots: {
    Row: {
      id: string;
      snapshot_date: string;
      time_window: Database['public']['Enums']['time_window_enum'];
      scope_type: Database['public']['Enums']['scope_type_enum'];
      scope_value: string;
      generated_at: string;
    };
    Insert: {
      id?: string;
      snapshot_date: string;
      time_window: Database['public']['Enums']['time_window_enum'];
      scope_type: Database['public']['Enums']['scope_type_enum'];
      scope_value?: string;
      generated_at?: string;
    };
    Update: {
      id?: string;
      snapshot_date?: string;
      time_window?: Database['public']['Enums']['time_window_enum'];
      scope_type?: Database['public']['Enums']['scope_type_enum'];
      scope_value?: string;
      generated_at?: string;
    };
    Relationships: [];
  };
};

type Enums = {
  member_role: 'owner' | 'admin' | 'member';
  media_type_enum: 'book' | 'manga' | 'manhwa' | 'manhua' | 'web_comic' | 'comic';
  source_family_enum:
    | 'ranking'
    | 'reviews'
    | 'awards'
    | 'search'
    | 'social'
    | 'sales_estimated'
    | 'sales_direct'
    | 'metadata';
  access_type_enum: 'csv' | 'api' | 'scrape' | 'manual';
  confidence_tier_enum: 'gold' | 'silver' | 'bronze' | 'community';
  match_type_enum: 'exact' | 'probable' | 'manual';
  import_status_enum: 'pending' | 'processing' | 'complete' | 'failed' | 'partial';
  provenance_tag_enum: 'direct' | 'estimated' | 'engagement' | 'awards' | 'metadata';
  flag_type_enum: 'duplicate' | 'outlier' | 'missing_id' | 'suspect_spike' | 'low_sample' | 'manual_review';
  flag_severity_enum: 'info' | 'warning' | 'critical';
  time_window_enum: 'all_time' | '5y' | '1y' | '6m' | '3m' | '1m' | '2w' | '1w';
  scope_type_enum: 'global' | 'category' | 'ip';
};

export type Database = {
  public: {
    Tables: Tables;
    Views: Record<string, never>;
    Functions: {
      is_org_member: {
        Args: { lookup_org_id: string };
        Returns: boolean;
      };
    };
    Enums: Enums;
    CompositeTypes: Record<string, never>;
  };
};
