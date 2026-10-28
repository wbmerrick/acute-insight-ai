import type { Request, Response } from "express";

/** Liveness + which commit is serving (Vercel sets VERCEL_GIT_COMMIT_SHA at build time). */
export default async function handler(_req: Request, res: Response) {
	res.json({
		status: "ok",
		timestamp: new Date().toISOString(),
		commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_SHA ?? "unknown").slice(0, 7),
		env: process.env.VERCEL_ENV ?? "local",
	});
}
