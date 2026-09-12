-- 0018 · copilot_messages INSERT must own the parent session (PBI-025 IDOR/RLS)
-- Append-only. Do not edit 0017. Do not wrap in BEGIN/COMMIT.

DROP POLICY IF EXISTS copilot_messages_insert_own ON public.copilot_messages;
CREATE POLICY copilot_messages_insert_own ON public.copilot_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.copilot_sessions s
      WHERE s.id = session_id
        AND s.user_id = (SELECT auth.uid())
    )
  );
