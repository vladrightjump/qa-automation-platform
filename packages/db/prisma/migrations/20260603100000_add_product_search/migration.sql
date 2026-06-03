-- Phase 15a: full-text search support on Product.
--
-- Adds a tsvector column maintained by a BEFORE INSERT OR UPDATE trigger.
-- The vector concatenates name (weight A) + description (weight B) +
-- tags joined by space (weight C) so ranking favours name matches.
-- A GIN index makes ts_rank_cd queries fast on large catalogs (the
-- bulk-seed test seam will push the row count into the thousands).

ALTER TABLE "Product"
  ADD COLUMN "searchVector" tsvector;

CREATE OR REPLACE FUNCTION product_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('simple', coalesce(NEW.name, '')),        'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(NEW.tags, ARRAY[]::text[]), ' ')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_search_vector_trigger
  BEFORE INSERT OR UPDATE OF name, description, tags
  ON "Product"
  FOR EACH ROW EXECUTE FUNCTION product_search_vector_update();

-- Backfill existing rows. The trigger only fires on future writes.
UPDATE "Product"
SET "searchVector" =
  setweight(to_tsvector('simple', coalesce(name, '')),        'A') ||
  setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('simple', array_to_string(coalesce(tags, ARRAY[]::text[]), ' ')), 'C');

CREATE INDEX "Product_searchVector_idx" ON "Product" USING GIN ("searchVector");

-- Btree on lower(name) for the prefix autocomplete (sub-50ms p95 target).
CREATE INDEX "Product_name_lower_idx" ON "Product" (lower(name) text_pattern_ops);
