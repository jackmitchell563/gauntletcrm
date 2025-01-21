-- Allow any authenticated user to read user profiles
CREATE POLICY "Anyone can view user profiles"
  ON user_profiles FOR SELECT
  USING (auth.role() = 'authenticated'); 