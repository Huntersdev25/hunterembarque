
-- Rate limiting table for API governance
CREATE TABLE public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_rate_limits_user_endpoint ON public.api_rate_limits (user_id, endpoint, window_start);

-- Auto-cleanup old entries (older than 1 hour)
CREATE INDEX idx_rate_limits_cleanup ON public.api_rate_limits (window_start);

-- Enable RLS
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (edge functions use service role)
-- No public policies = no direct client access

-- Function to check and increment rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_max_requests integer DEFAULT 30,
  p_window_minutes integer DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamp with time zone;
  v_current_count integer;
BEGIN
  v_window_start := now() - (p_window_minutes || ' minutes')::interval;
  
  -- Count requests in the current window
  SELECT COALESCE(SUM(request_count), 0) INTO v_current_count
  FROM api_rate_limits
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start >= v_window_start;
  
  -- If over limit, deny
  IF v_current_count >= p_max_requests THEN
    RETURN false;
  END IF;
  
  -- Record this request
  INSERT INTO api_rate_limits (user_id, endpoint, window_start)
  VALUES (p_user_id, p_endpoint, now());
  
  -- Cleanup old entries (probabilistic, ~10% of requests)
  IF random() < 0.1 THEN
    DELETE FROM api_rate_limits WHERE window_start < now() - interval '1 hour';
  END IF;
  
  RETURN true;
END;
$$;
