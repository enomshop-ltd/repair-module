import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260506000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "repair_ticket" add column if not exists "technician_id" text null;`);
    this.addSql(`alter table if exists "repair_ticket" add column if not exists "technician_name" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "repair_ticket" drop column if exists "technician_id";`);
    this.addSql(`alter table if exists "repair_ticket" drop column if exists "technician_name";`);
  }
}
