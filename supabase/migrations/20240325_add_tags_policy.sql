-- Add policy allowing all authenticated users to view tags
CREATE POLICY "Anyone can view ticket tags"
  ON ticket_tags FOR SELECT
  USING (auth.role() = 'authenticated'); 