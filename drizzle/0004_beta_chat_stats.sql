CREATE TABLE "beta_chat_stats" (
	"day" date PRIMARY KEY NOT NULL,
	"messages" integer DEFAULT 0 NOT NULL,
	"conversations" integer DEFAULT 0 NOT NULL
);
