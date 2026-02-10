CREATE TABLE IF NOT EXISTS "quickbooks_config" (
	"quickbooks_config_id" serial PRIMARY KEY NOT NULL,
	"qb_username" varchar(40) NOT NULL,
	"module" varchar(40) NOT NULL,
	"cfgkey" varchar(40) NOT NULL,
	"cfgval" varchar(255) NOT NULL,
	"cfgtype" varchar(40),
	"cfgopts" text,
	"write_datetime" timestamp DEFAULT now() NOT NULL,
	"mod_datetime" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quickbooks_log" (
	"quickbooks_log_id" serial PRIMARY KEY NOT NULL,
	"quickbooks_ticket_id" integer,
	"batch" integer DEFAULT 0 NOT NULL,
	"msg" text NOT NULL,
	"log_datetime" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quickbooks_queue" (
	"quickbooks_queue_id" serial PRIMARY KEY NOT NULL,
	"quickbooks_ticket_id" integer,
	"qb_username" varchar(40) NOT NULL,
	"qb_action" varchar(32) NOT NULL,
	"ident" varchar(40) NOT NULL,
	"extra" text,
	"qbxml" text,
	"priority" integer DEFAULT 0 NOT NULL,
	"qb_status" varchar(1) DEFAULT 'q' NOT NULL,
	"msg" text,
	"enqueue_datetime" timestamp DEFAULT now() NOT NULL,
	"dequeue_datetime" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quickbooks_recur" (
	"quickbooks_recur_id" serial PRIMARY KEY NOT NULL,
	"qb_username" varchar(40) NOT NULL,
	"qb_action" varchar(32) NOT NULL,
	"ident" varchar(40) NOT NULL,
	"extra" text,
	"qbxml" text,
	"priority" integer DEFAULT 0 NOT NULL,
	"run_every" integer NOT NULL,
	"recur_lasttime" integer NOT NULL,
	"enqueue_datetime" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quickbooks_ticket" (
	"quickbooks_ticket_id" serial PRIMARY KEY NOT NULL,
	"qb_username" varchar(40) NOT NULL,
	"ticket" varchar(36) NOT NULL,
	"processed" integer DEFAULT 0,
	"lasterror_num" varchar(32),
	"lasterror_msg" varchar(255),
	"ipaddr" varchar(45),
	"write_datetime" timestamp DEFAULT now() NOT NULL,
	"touch_datetime" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quickbooks_user" (
	"qb_username" varchar(40) PRIMARY KEY NOT NULL,
	"qb_password" varchar(255) NOT NULL,
	"qb_company_file" varchar(255),
	"qbwc_wait_before_next_update" integer DEFAULT 0,
	"qbwc_min_run_every_n_seconds" integer DEFAULT 0,
	"status" varchar(1) DEFAULT 'e',
	"write_datetime" timestamp DEFAULT now() NOT NULL,
	"touch_datetime" timestamp DEFAULT now() NOT NULL
);
