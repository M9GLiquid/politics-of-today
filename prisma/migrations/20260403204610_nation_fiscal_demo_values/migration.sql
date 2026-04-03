-- Demo fiscal profiles (reference model = 1.0 on each axis).
UPDATE "Nation" SET "fiscalTaxMultiplier" = 1, "fiscalExportMultiplier" = 1, "fiscalImportMultiplier" = 1 WHERE "slug" = 'orion';
UPDATE "Nation" SET "fiscalTaxMultiplier" = 1.06, "fiscalExportMultiplier" = 0.92, "fiscalImportMultiplier" = 1.08 WHERE "slug" = 'celeste';
UPDATE "Nation" SET "fiscalTaxMultiplier" = 0.94, "fiscalExportMultiplier" = 1.12, "fiscalImportMultiplier" = 0.98 WHERE "slug" = 'andosian';
UPDATE "Nation" SET "fiscalTaxMultiplier" = 1.03, "fiscalExportMultiplier" = 1.05, "fiscalImportMultiplier" = 1.15 WHERE "slug" = 'veydris';
UPDATE "Nation" SET "fiscalTaxMultiplier" = 0.98, "fiscalExportMultiplier" = 1.08, "fiscalImportMultiplier" = 1.02 WHERE "slug" = 'kethara';
