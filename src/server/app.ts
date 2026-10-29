import express, { type Express, type NextFunction, type Request, type Response } from "express";

// <api-imports>
import auth__action__get from "./api/auth/[action]/GET";
import auth__action__post from "./api/auth/[action]/POST";
import auth__action__detail__get from "./api/auth/[action]/[detail]/GET";
import auth__action__detail__post from "./api/auth/[action]/[detail]/POST";
import auth__reauth__post from "./api/auth/reauth/POST";
import health__get from "./api/health/GET";
import patient__intakes__get from "./api/patient/intakes/GET";
import patient__profile__get from "./api/patient/profile/GET";
import patient__profile__put from "./api/patient/profile/PUT";
import patient__export__get from "./api/patient/export/GET";
import patient__delete__post from "./api/patient/delete/POST";
import provider__intakes__get from "./api/provider/intakes/GET";
import intake__start__post from "./api/intake/start/POST";
import intake__id__complete__post from "./api/intake/[id]/complete/POST";
import intake__chat__post from "./api/intake/chat/POST";
import admin__users__get from "./api/admin/users/GET";
import admin__users__id__role__put from "./api/admin/users/[id]/role/PUT";
import access_request__post from "./api/access-request/POST";
import speak__post from "./api/speak/POST";
import admin__access_requests__get from "./api/admin/access-requests/GET";
import admin__audit__get from "./api/admin/audit/GET";
import admin__audit__export__get from "./api/admin/audit/export/GET";
import admin__assignments__get from "./api/admin/assignments/GET";
import admin__assignments__post from "./api/admin/assignments/POST";
import { rateLimit, byIp } from "./lib/rate-limit";
import dispatch__me__get from "./api/dispatch/me/GET";
import dispatch__me__put from "./api/dispatch/me/PUT";
import dispatch__queue__get from "./api/dispatch/queue/GET";
import dispatch__visits__post from "./api/dispatch/visits/POST";
import dispatch__visits__id__get from "./api/dispatch/visits/[id]/GET";
import dispatch__visits__id__accept__post from "./api/dispatch/visits/[id]/accept/POST";
import dispatch__visits__id__release__post from "./api/dispatch/visits/[id]/release/POST";
import dispatch__visits__id__complete__post from "./api/dispatch/visits/[id]/complete/POST";
import dispatch__visits__id__cancel__post from "./api/dispatch/visits/[id]/cancel/POST";
import dispatch__pricing__get from "./api/dispatch/pricing/GET";
import dispatch__sweep__get from "./api/dispatch/sweep/GET";
import dispatch__metrics__get from "./api/dispatch/metrics/GET";
import dispatch__earnings__get from "./api/dispatch/earnings/GET";
import dispatch__earnings__statement__get from "./api/dispatch/earnings/statement/GET";
import admin__accounting__get from "./api/admin/accounting/GET";
import dispatch__connect__onboard__post from "./api/dispatch/connect/onboard/POST";
import stripe__webhook__post from "./api/stripe/webhook/POST";
import companion__checkins__get from "./api/companion/checkins/GET";
import companion__checkins__id__answer__post from "./api/companion/checkins/[id]/answer/POST";
import companion__run__get from "./api/companion/run/GET";
import provider__checkins__get from "./api/provider/checkins/GET";
import provider__checkins__id__acknowledge__post from "./api/provider/checkins/[id]/acknowledge/POST";
// </api-imports>
import { seoRoutes } from "../lib/seo-routes";
import {
	resolveAdSenseTextFile,
	type AdSenseRuntimeConfig,
} from "./adsense-manifest";
import { isSystemHost } from "./seo-host";
import { llmsTxtHandler } from "./llms-txt";

export interface SsrRenderResult {
	html: string;
	head: string;
	status: number;
	redirect?: string;
}

/** Stands in for the route when the request failed before Express matched one. */
const UNROUTED: string = "(unrouted)";

/**
 * Names the route a request reached, never the target it asked for.
 *
 * A request target carries visitor data: a path segment can be an address
 * (`/signup/victim@example.com`) and a parameterized route holds a customer id, so
 * `req.baseUrl + req.path` logged both. `docs/privacy/pii.md` asks for the route
 * template instead — the string this app registered, which is fixed text.
 *
 * There is deliberately no fallback to `req.path` or `req.originalUrl`: a request
 * that matched no route has no template, and the placeholder is the honest answer.
 * The mount prefix is also omitted, because `req.baseUrl` is the resolved mount
 * rather than a template, so appending it would put request-derived text back.
 */
export function routeLabel(req: Request): string {
	const route: unknown = (req as { route?: unknown }).route;
	if (typeof route !== "object" || route === null) {
		return UNROUTED;
	}
	const template: unknown = (route as { path?: unknown }).path;
	if (typeof template === "string") {
		return template;
	}
	// The SSR catch-all route is registered with a RegExp path, so `path` is a RegExp.
	// The source is text this app wrote, so it is as fixed as a string template.
	if (template instanceof RegExp) {
		return template.source;
	}
	// A route registered with an array of paths has no single template.
	return UNROUTED;
}

/** Frames worth logging. Enough to name the throwing line and its caller. */
const MAX_LOGGED_FRAMES: number = 5;

/**
 * The call frames of an error, with its message removed.
 *
 * `stack` is the message with the frames appended, so the message has to come
 * off before any of it is logged. It is removed by its own length rather than by
 * looking for where the frames begin, because a message can contain anything:
 * body-parser puts a prefix of the request body into a parse failure's message,
 * and a visitor can put newlines and text shaped like a frame in that body.
 * Cutting an exact `name: message` prefix leaves only what the runtime wrote.
 *
 * Anything that does not have that exact prefix — a `stack` reassigned by a
 * library, or a `name` or `message` changed after the error was constructed —
 * reports no frames at all, so an unrecognised shape loses debuggability rather
 * than logging an unknown string.
 */
function loggedFrames(err: Error): string[] {
	if (typeof err.stack !== "string") {
		return [];
	}
	const headline: string = err.message ? `${err.name}: ${err.message}` : err.name;
	if (!err.stack.startsWith(headline)) {
		return [];
	}
	return err.stack
		.slice(headline.length)
		.split("\n")
		.filter((line: string): boolean => /^\s+at \S/.test(line))
		.slice(0, MAX_LOGGED_FRAMES)
		.map((line: string): string => line.trim());
}

/**
 * Reduces an error to fields that cannot carry request content.
 *
 * express.json() puts a prefix of the raw request body into a SyntaxError's
 * message, so the message is not safe to log on a request path: a form-encoded
 * body posted to a JSON route begins with the visitor's own field values. The
 * error class, plus body-parser's `type` and `status`, names the failure without
 * quoting what the client sent, and {@link loggedFrames} takes the frames out of
 * `stack` without the message that `stack` begins with.
 *
 * The message is dropped rather than gated on dev, because production is where a
 * customer app is actually debugged, so a dev-only escape hatch would not be
 * read. The frames are kept and the message is not: a frame names a file, a
 * function and a line the runtime itself recorded, while the message is the only
 * part an error carries that can quote what arrived in the request.
 */
export function toLogError(err: unknown): Record<string, unknown> {
	const shaped: Record<string, unknown> = {
		name: err instanceof Error ? err.name : typeof err,
	};
	const fields: Record<string, unknown> =
		typeof err === "object" && err !== null ? (err as Record<string, unknown>) : {};
	if (typeof fields.type === "string") {
		shaped.type = fields.type;
	}
	if (typeof fields.code === "string" || typeof fields.code === "number") {
		shaped.code = fields.code;
	}
	if (typeof fields.status === "number") {
		shaped.status = fields.status;
	}
	if (err instanceof Error) {
		const frames: string[] = loggedFrames(err);
		if (frames.length > 0) {
			shaped.frames = frames;
		}
	}
	return shaped;
}

/**
 * Error handler for /api routes. Exported so tests can mount it on their own app
 * in the order Express requires (error middleware after the routes it protects).
 */
export const apiErrorHandler = (
	err: unknown,
	req: Request,
	res: Response,
	_next: NextFunction,
): void => {
	// Always respond JSON on /api so clients parsing response.json() don't
	// receive Express's default HTML error page for non-Error throws.
	console.error("ssr.api.error", {
		route: routeLabel(req),
		error: toLogError(err),
	});
	res.status(500).json({ error: "Internal server error" });
};

/**
 * Last handler in the stack, for paths outside /api. Without it Express's default
 * handler runs, which writes err.stack to stderr and — whenever NODE_ENV is not
 * "production" — into the response body.
 */
export const finalErrorHandler = (
	err: unknown,
	req: Request,
	res: Response,
	// Unused, but Express identifies error middleware by arity: a 3-parameter
	// function is registered as an ordinary handler and never sees an error.
	_next: NextFunction,
): void => {
	console.error("ssr.request.failed", {
		route: routeLabel(req),
		error: toLogError(err),
	});
	if (res.headersSent) {
		// The response is already streaming, so there is no status left to set and no
		// body to replace. Forwarding to Express's default handler would hand it the
		// unsanitized error, which it writes to stderr as a raw stack — the leak this
		// handler exists to close. Destroying the socket instead aborts the partial
		// response, so the client sees a truncated transfer rather than a body that
		// looks complete. The log line above has already recorded the failure.
		res.destroy();
		return;
	}
	// Preserve the status Express's default handler would have chosen, so a
	// malformed body still answers 400 rather than 500.
	const rawStatus: unknown =
		typeof err === "object" && err !== null
			? ((err as { status?: unknown; statusCode?: unknown }).status ??
				(err as { statusCode?: unknown }).statusCode)
			: undefined;
	const status: number =
		typeof rawStatus === "number" && rawStatus >= 400 && rawStatus <= 599 ? rawStatus : 500;
	res.status(status).type("text/plain").send("Internal Server Error");
};

export function registerAdSenseTextRoutes(app: Express, config: AdSenseRuntimeConfig): void {
	app.get("/ads.txt", (_req, res) => {
		const content = resolveAdSenseTextFile(config, "adsTxt");
		if (content === null) {
			res
				.status(404)
				.type("text/plain")
				.set("Cache-Control", "no-cache")
				.send("Not found\n");
			return;
		}
		res.type("text/plain").set("Cache-Control", "no-cache").send(content);
	});

	app.get("/app-ads.txt", (_req, res) => {
		const content = resolveAdSenseTextFile(config, "appAdsTxt");
		if (content === null) {
			res
				.status(404)
				.type("text/plain")
				.set("Cache-Control", "no-cache")
				.send("Not found\n");
			return;
		}
		res.type("text/plain").set("Cache-Control", "no-cache").send(content);
	});
}

export function renderSsrDocument(
	template: string,
	result: Pick<SsrRenderResult, "head" | "html">,
	adSenseConfig: Pick<AdSenseRuntimeConfig, "scriptHtml">,
): string {
	const head = [result.head, adSenseConfig.scriptHtml].filter(Boolean).join("\n");
	return template
		.replace("<!--app-head-->", () => head)
		.replace("<!--app-html-->", () => result.html);
}

function normalizeCommerceApiBaseUrlEnv() {
	if (process.env.GODADDY_API_BASE_URL) return;
	const hostOnly = process.env.VITE_GODADDY_API_HOST;
	if (!hostOnly) return;
	const normalizedHost = hostOnly.replace(/^https?:\/\//, "").trim();
	if (!normalizedHost) return;
	process.env.GODADDY_API_BASE_URL = `https://${normalizedHost}`;
}

normalizeCommerceApiBaseUrlEnv();

const app = express();

// Honour x-forwarded-* from the load balancer so req.protocol/req.hostname
// reflect the public-facing values. Express-maintained parsing respects the
// existing trust-proxy config; direct header reads would let a client spoof
// the sitemap origin in robots.txt.
app.set("trust proxy", true);

// API responses can carry PHI: never cache them anywhere (browser, proxy, CDN).
// Vercel's edge adds the site-wide security headers from vercel.json; this keeps
// the no-store guarantee when the server runs outside Vercel (local, tests).
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});

// Cross-site request forgery: a state-changing API call from a browser must come
// from this site. Browsers send Origin on every cross-site POST (and Chrome on
// same-site too); a mismatch is rejected before any handler runs. Requests with
// no Origin (Stripe webhooks, cron, curl) pass — they carry no session cookie
// a forged form could borrow. SameSite=Lax cookies are the second layer.
app.use("/api", (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  const origin = req.headers.origin;
  if (!origin) return next();
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return res.status(403).json({ error: "Bad origin" });
  }
  const host = req.get("host") ?? "";
  const extra = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const ok =
    originHost === host ||
    originHost === "acuteinsight.ai" ||
    originHost === "www.acuteinsight.ai" ||
    extra.some((o) => { try { return new URL(o).host === originHost; } catch { return false; } });
  if (!ok) {
    console.warn(JSON.stringify({ event: "csrf.rejected", origin: originHost, host, path: req.path }));
    return res.status(403).json({ error: "Cross-site request rejected" });
  }
  next();
});

// Stripe signs the raw bytes — this route must see them before express.json() runs.
app.post("/api/stripe/webhook", express.raw({ type: "*/*" }), stripe__webhook__post);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// <api-registrations>
app.get("/api/auth/:action", auth__action__get);
// Rate limits — per session when signed in, else per IP. 429 with Retry-After.
const MIN = 60_000;
const rlAuth = rateLimit({ name: "auth", limit: 20, windowMs: 15 * MIN, key: byIp });
const rlChat = rateLimit({ name: "chat", limit: 60, windowMs: 10 * MIN });
const rlSpeak = rateLimit({ name: "speak", limit: 60, windowMs: 10 * MIN });
const rlRequest = rateLimit({ name: "visit-request", limit: 5, windowMs: 60 * MIN });
const rlIntake = rateLimit({ name: "intake", limit: 30, windowMs: 60 * MIN }); // start + complete: each complete is a model call
const rlAnswer = rateLimit({ name: "checkin-answer", limit: 20, windowMs: 60 * MIN });
const rlAccess = rateLimit({ name: "access-request", limit: 5, windowMs: 60 * MIN, key: byIp });

// Step-up password confirmation ("sudo mode") — registered before the
// better-auth catch-all so this path is ours; same brute-force limit as sign-in.
app.post("/api/auth/reauth", rlAuth, auth__reauth__post);
app.post("/api/auth/:action", rlAuth, auth__action__post);
app.get("/api/auth/:action/:detail", auth__action__detail__get);
app.post("/api/auth/:action/:detail", rlAuth, auth__action__detail__post);
app.get("/api/health", health__get);
app.get("/api/patient/intakes", patient__intakes__get);
app.get("/api/patient/profile", patient__profile__get);
app.put("/api/patient/profile", patient__profile__put);
app.get("/api/patient/export", patient__export__get);
app.post("/api/patient/delete", patient__delete__post);
app.get("/api/provider/intakes", provider__intakes__get);
app.post("/api/intake/start", rlIntake, intake__start__post);
app.post("/api/intake/:id/complete", rlIntake, intake__id__complete__post);
app.post("/api/intake/chat", rlChat, intake__chat__post);
app.get("/api/admin/users", admin__users__get);
app.put("/api/admin/users/:id/role", admin__users__id__role__put);
app.post("/api/access-request", rlAccess, access_request__post);
app.post("/api/speak", rlSpeak, speak__post);
app.get("/api/admin/access-requests", admin__access_requests__get);
app.get("/api/admin/audit/export", admin__audit__export__get);
app.get("/api/admin/audit", admin__audit__get);
app.get("/api/admin/assignments", admin__assignments__get);
app.post("/api/admin/assignments", admin__assignments__post);
app.get("/api/dispatch/me", dispatch__me__get);
app.put("/api/dispatch/me", dispatch__me__put);
app.get("/api/dispatch/queue", dispatch__queue__get);
app.post("/api/dispatch/visits", rlRequest, dispatch__visits__post);
app.get("/api/dispatch/visits/:id", dispatch__visits__id__get);
app.post("/api/dispatch/visits/:id/accept", dispatch__visits__id__accept__post);
app.post("/api/dispatch/visits/:id/release", dispatch__visits__id__release__post);
app.post("/api/dispatch/visits/:id/complete", dispatch__visits__id__complete__post);
app.post("/api/dispatch/visits/:id/cancel", dispatch__visits__id__cancel__post);
app.get("/api/dispatch/pricing", dispatch__pricing__get);
app.get("/api/dispatch/sweep", dispatch__sweep__get);
app.get("/api/dispatch/metrics", dispatch__metrics__get);
app.get("/api/dispatch/earnings", dispatch__earnings__get);
app.get("/api/dispatch/earnings/statement", dispatch__earnings__statement__get);
app.get("/api/admin/accounting", admin__accounting__get);
app.post("/api/dispatch/connect/onboard", dispatch__connect__onboard__post);
app.get("/api/companion/checkins", companion__checkins__get);
app.post("/api/companion/checkins/:id/answer", rlAnswer, companion__checkins__id__answer__post);
app.get("/api/companion/run", companion__run__get);
app.get("/api/provider/checkins", provider__checkins__get);
app.post("/api/provider/checkins/:id/acknowledge", provider__checkins__id__acknowledge__post);
// </api-registrations>

// Error middleware must be registered AFTER the routes it protects; Express
// only passes errors to middleware defined later in the stack.
app.use("/api", apiErrorHandler);

export function baseUrl(req: Request): string {
	return `${req.protocol}://${req.hostname}`;
}

export function escapeXml(s: string): string {
	return s.replace(/[&<>"']/g, (c) =>
		({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!,
	);
}

app.get("/robots.txt", (req, res) => {
	if (isSystemHost(req)) {
		res
			.type("text/plain")
			.set("Cache-Control", "public, max-age=60, must-revalidate").set("Vary", "Host")
			.send("User-agent: *\nDisallow: /\n");
		return;
	}
	const base = baseUrl(req);
	const body = [
		"User-agent: *",
		"Allow: /",
		"",
		`Sitemap: ${base}/sitemap.xml`,
		"",
	].join("\n");
	res.type("text/plain").set("Cache-Control", "public, max-age=60, must-revalidate").set("Vary", "Host").send(body);
});

app.get("/sitemap.xml", (req, res) => {
	if (isSystemHost(req)) {
		const empty = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>\n`;
		res.type("application/xml").set("Cache-Control", "public, max-age=60, must-revalidate").set("Vary", "Host").send(empty);
		return;
	}
	const base = baseUrl(req);
	const urls = seoRoutes
		.filter((r) => typeof r.path === "string" && r.path.startsWith("/"))
		.map((r) => {
			const loc = `${base}${r.path}`;
			const parts = [`    <loc>${escapeXml(loc)}</loc>`];
			if (r.lastmod) parts.push(`    <lastmod>${escapeXml(r.lastmod)}</lastmod>`);
			if (r.changefreq) parts.push(`    <changefreq>${r.changefreq}</changefreq>`);
			if (r.priority !== undefined)
				parts.push(`    <priority>${r.priority.toFixed(1)}</priority>`);
			return `  <url>\n${parts.join("\n")}\n  </url>`;
		})
		.join("\n");
	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
	res.type("application/xml").set("Cache-Control", "public, max-age=60, must-revalidate").set("Vary", "Host").send(body);
});

app.get("/llms.txt", llmsTxtHandler);

export default app;
