export type SnapshotRunRow = {
  run_id: string;
  label: string;
  target_table: string;
  status: "running" | "ok" | "failed";
  started_at: string;
  finished_at: string | null;
  snapshot_ts_hi: string;
  row_count: number | null;
  error_message: string | null;
};
