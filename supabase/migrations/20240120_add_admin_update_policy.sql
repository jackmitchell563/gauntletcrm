-- Add policy for admins to update tickets
CREATE POLICY "Admins can update tickets"
  ON tickets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND role = 'admin'
    )
  );

-- Add policy for admins to update ticket history
CREATE POLICY "Admins can insert ticket history"
  ON ticket_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND role = 'admin'
    )
  ); 