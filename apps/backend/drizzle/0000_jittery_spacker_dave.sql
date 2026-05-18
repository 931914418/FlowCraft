CREATE TABLE "node_execution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" uuid NOT NULL,
	"node_id" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"input" jsonb,
	"output" jsonb,
	"tokens" integer DEFAULT 0,
	"duration_ms" integer DEFAULT 0,
	"error" text,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "workflow_definition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"definition" jsonb NOT NULL,
	"version" integer DEFAULT 1,
	"trigger_type" varchar(20) DEFAULT 'manual',
	"cron_expression" varchar(100),
	"webhook_path" varchar(50),
	"webhook_secret" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "workflow_definition_webhook_path_unique" UNIQUE("webhook_path")
);
--> statement-breakpoint
CREATE TABLE "workflow_execution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'running',
	"input" jsonb,
	"output" jsonb,
	"total_tokens" integer DEFAULT 0,
	"duration_ms" integer DEFAULT 0,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "node_execution" ADD CONSTRAINT "node_execution_execution_id_workflow_execution_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."workflow_execution"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_execution" ADD CONSTRAINT "workflow_execution_workflow_id_workflow_definition_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflow_definition"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "node_execution_execution_node_idx" ON "node_execution" USING btree ("execution_id","node_id");--> statement-breakpoint
CREATE INDEX "node_execution_execution_idx" ON "node_execution" USING btree ("execution_id");