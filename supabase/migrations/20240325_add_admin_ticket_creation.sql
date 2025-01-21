-- Add policy for admins to create tickets
CREATE POLICY "Admins can create tickets"
  ON tickets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND role = 'admin'
    )
  ); 