-- Add images column to campaign_content
ALTER TABLE campaign_content
ADD COLUMN images text[] DEFAULT '{}';

-- Add resources column to campaigns
ALTER TABLE campaigns
ADD COLUMN resources text;

-- Add comments
COMMENT ON COLUMN campaign_content.images IS 'Array of Supabase Storage URLs for uploaded images';
COMMENT ON COLUMN campaigns.resources IS 'User-provided resources: conference talks, scriptures, quotes';
