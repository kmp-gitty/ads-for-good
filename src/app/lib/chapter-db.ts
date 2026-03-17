export const chapterSchemas = {
    ingest: (db: any) => db.schema("chapter_ingest"),
    identity: (db: any) => db.schema("chapter_identity"),
    journey: (db: any) => db.schema("chapter_journey"),
    model: (db: any) => db.schema("chapter_model"),
    attribution: (db: any) => db.schema("chapter_attribution"),
    config: (db: any) => db.schema("chapter_config"),
  };
  
  export const coreSchemas = {
    crm: (db: any) => db.schema("crm"),
    tracking: (db: any) => db.schema("tracking_dm"),
    websiteOps: (db: any) => db.schema("website_ops"),
  };