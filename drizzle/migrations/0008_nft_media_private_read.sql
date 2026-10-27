DROP POLICY "Public read NFT media" ON storage.objects;
CREATE POLICY "Members read NFT media" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'nft-media');