import http from "node:http";

const token = `${Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: "admin-browser", role: "admin", email: "admin@ruwork.test", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.signature`;
let students = [{ id: "student-browser", type: "student", firstName: "Yenulu", lastName: "Student", email: "yenulu@ruh.ac.lk", university: "University of Ruhuna", faculty: "Technology", fieldOfStudy: "ICT", yearOfStudy: "2nd Year", phoneNumber: "0710000000", gender: "Prefer not to say", dateOfBirth: "2003-04-12", isEmailVerified: true, accountStatus: "approved", moderationStatus: "active", registeredAt: "2026-08-20" }];
let providers = [{ id: "provider-browser", type: "jobProvider", companyName: "Current Company", companyEmail: "jobs@current.lk", industry: "Technology", companySize: "11-50", companyAddress: "Matara", companyWebsite: "https://example.com", companyDescription: "Local technology services.", firstName: "Yenulu", lastName: "Manager", phoneNumber: "0711111111", isEmailVerified: true, accountStatus: "approved", moderationStatus: "active", registeredAt: "2026-08-19" }];
let jobs = [{ id: "job-browser", jobTitle: "Research Assistant", companyName: "Current Company", provider: { id: "provider-browser", companyName: "Current Company", companyEmail: "jobs@current.lk", moderationStatus: "active" }, category: "Research", location: "Matara", budgetType: "fixed", budget: 10000, currency: "LKR", status: "open", moderationStatus: "visible", applicationDeadline: "2099-09-20", jobDescription: "Assist with a research report and organize findings.", createdAt: "2026-08-20", updatedAt: "2026-08-21" }];
let reviews = [{ id: "review-browser", applicationId: "application-browser", rating: 5, comment: "Clear scope and professional communication.", moderationStatus: "active", student: { id: "student-browser", firstName: "Yenulu", lastName: "Student" }, provider: { id: "provider-browser", companyName: "Current Company" }, job: { id: "job-browser", jobTitle: "Research Assistant", isArchived: false }, createdAt: "2026-08-22" }];
let settings = { studentRegistrationOpen: true, providerRegistrationOpen: true, jobPostingOpen: true, updatedAt: "2026-08-28" };
let audits = [{ id: "audit-browser", action: "REGISTRATION_APPROVED", entityType: "student", entityId: "student-pending", metadata: {}, admin: { email: "admin@ruwork.test" }, createdAt: "2026-08-28" }];
let registrations = [{ id: "student-pending", type: "student", firstName: "Pending", lastName: "Student", email: "pending@ruh.ac.lk", university: "University of Ruhuna", faculty: "Science", fieldOfStudy: "Statistics", yearOfStudy: "1st Year", isEmailVerified: true, accountStatus: "pending", moderationStatus: "active", registeredAt: "2026-08-28" }];

const paginate = (items, url) => {
  const page = Number(url.searchParams.get("page") || 1);
  const limit = Number(url.searchParams.get("limit") || 20);
  return { items: items.slice((page - 1) * limit, page * limit), pagination: { page, limit, total: items.length, pages: Math.ceil(items.length / limit) } };
};
const send = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "http://127.0.0.1:5173", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS" });
  res.end(JSON.stringify(body));
};
const readBody = (req) => new Promise((resolve) => { let raw = ""; req.on("data", (chunk) => { raw += chunk; }); req.on("end", () => resolve(raw ? JSON.parse(raw) : {})); });
const audit = (action, entityType, entityId, metadata = {}) => audits.unshift({ id: `audit-${Date.now()}`, action, entityType, entityId, metadata, admin: { email: "admin@ruwork.test" }, createdAt: new Date().toISOString() });

http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  const url = new URL(req.url, "http://localhost:5001");
  const path = url.pathname;
  if (req.method === "POST" && path === "/api/admin/login") return send(res, 200, { message: "Login successful", token });
  if (req.method === "GET" && path === "/api/admin/dashboard") return send(res, 200, { summary: { pendingRegistrations: registrations.filter((item) => item.accountStatus === "pending").length, pendingStudents: 1, pendingProviders: 0, totalStudents: students.length, totalProviders: providers.length, openJobs: 1 }, statistics: { accounts: { students: { total: students.length, approved: 1, pending: 1, rejected: 0, suspended: students.filter((item) => item.moderationStatus === "suspended").length }, providers: { total: providers.length, approved: 1, pending: 0, rejected: 0, suspended: providers.filter((item) => item.moderationStatus === "suspended").length } }, jobs: { total: jobs.length, draft: 0, open: 1, closed: 0, archived: 0, hidden: jobs.filter((item) => item.moderationStatus === "hidden").length }, applications: { submitted: 2, shortlisted: 1, accepted: 1, in_progress: 1, completed: 3, rejected: 1, withdrawn: 1, cancelled: 0 }, reviews: { total: reviews.length, visible: reviews.filter((item) => item.moderationStatus !== "hidden").length, hidden: reviews.filter((item) => item.moderationStatus === "hidden").length }, communication: { messages: 14, notifications: 9 } }, recentAudits: audits.slice(0, 6) });
  if (req.method === "GET" && path === "/api/admin/registrations") return send(res, 200, { registrations: registrations.filter((item) => item.accountStatus === (url.searchParams.get("status") || "pending")) });
  let match = path.match(/^\/api\/admin\/registrations\/(student|jobProvider)\/([^/]+)$/);
  if (req.method === "GET" && match) { const item = registrations.find((entry) => entry.id === match[2]); return send(res, item ? 200 : 404, item ? { registration: item } : { error: "Registration not found" }); }
  match = path.match(/^\/api\/admin\/registrations\/(student|jobProvider)\/([^/]+)\/(approve|reject)$/);
  if (req.method === "PATCH" && match) { const body = await readBody(req); const item = registrations.find((entry) => entry.id === match[2]); if (!item) return send(res, 404, { error: "Registration not found" }); item.accountStatus = match[3] === "approve" ? "approved" : "rejected"; item.rejectionReason = body.rejectionReason; audit(match[3] === "approve" ? "REGISTRATION_APPROVED" : "REGISTRATION_REJECTED", match[1], item.id); return send(res, 200, { message: `Registration ${item.accountStatus} successfully`, registration: item }); }
  for (const [segment, items, type] of [["students", students, "student"], ["providers", providers, "jobProvider"]]) {
    if (req.method === "GET" && path === `/api/admin/${segment}`) { const result = paginate(items, url); return send(res, 200, { accounts: result.items, pagination: result.pagination }); }
    match = path.match(new RegExp(`^/api/admin/${segment}/([^/]+)$`));
    if (req.method === "GET" && match) { const item = items.find((entry) => entry.id === match[1]); return send(res, item ? 200 : 404, item ? { account: item } : { error: "Account not found" }); }
    match = path.match(new RegExp(`^/api/admin/${segment}/([^/]+)/moderation$`));
    if (req.method === "PATCH" && match) { const body = await readBody(req); const item = items.find((entry) => entry.id === match[1]); item.moderationStatus = body.status; item.moderationReason = body.status === "suspended" ? body.reason : undefined; audit(body.status === "suspended" ? `${type === "student" ? "STUDENT" : "PROVIDER"}_SUSPENDED` : `${type === "student" ? "STUDENT" : "PROVIDER"}_RESTORED`, type, item.id, { reason: body.reason }); return send(res, 200, { message: `${type === "student" ? "Student" : "Job Provider"} ${body.status === "suspended" ? "suspended" : "restored"} successfully`, account: item }); }
  }
  if (req.method === "GET" && path === "/api/admin/jobs") { const result = paginate(jobs, url); return send(res, 200, { jobs: result.items, pagination: result.pagination }); }
  match = path.match(/^\/api\/admin\/jobs\/([^/]+)$/);
  if (req.method === "GET" && match) return send(res, 200, { job: jobs.find((item) => item.id === match[1]) });
  match = path.match(/^\/api\/admin\/jobs\/([^/]+)\/moderation$/);
  if (req.method === "PATCH" && match) { const body = await readBody(req); const item = jobs.find((entry) => entry.id === match[1]); item.moderationStatus = body.status; item.moderationReason = body.status === "hidden" ? body.reason : undefined; audit(body.status === "hidden" ? "JOB_HIDDEN" : "JOB_RESTORED", "job", item.id, { reason: body.reason }); return send(res, 200, { message: `Job ${body.status === "hidden" ? "hidden" : "restored"} successfully`, job: item }); }
  if (req.method === "GET" && path === "/api/admin/reviews") { const result = paginate(reviews, url); return send(res, 200, { reviews: result.items, pagination: result.pagination }); }
  match = path.match(/^\/api\/admin\/reviews\/([^/]+)\/moderation$/);
  if (req.method === "PATCH" && match) { const body = await readBody(req); const item = reviews.find((entry) => entry.id === match[1]); item.moderationStatus = body.status; item.moderationReason = body.status === "hidden" ? body.reason : undefined; audit(body.status === "hidden" ? "REVIEW_HIDDEN" : "REVIEW_RESTORED", "review", item.id, { reason: body.reason }); return send(res, 200, { message: `Review ${body.status === "hidden" ? "hidden" : "restored"} successfully`, review: item }); }
  if (req.method === "GET" && path === "/api/admin/settings") return send(res, 200, { settings });
  if (req.method === "PATCH" && path === "/api/admin/settings") { const body = await readBody(req); settings = { ...settings, ...body, updatedAt: new Date().toISOString() }; audit("SETTINGS_UPDATED", "settings", "platform", { changes: Object.fromEntries(Object.keys(body).map((key) => [key, { to: body[key] }])) }); return send(res, 200, { message: "Admin Settings updated successfully", settings }); }
  if (req.method === "GET" && path === "/api/admin/audits") { const filtered = url.searchParams.get("entityType") === "settings" ? audits.filter((item) => item.entityType === "settings") : audits; const result = paginate(filtered, url); return send(res, 200, { audits: result.items, pagination: result.pagination }); }
  return send(res, 404, { error: "Mock route not found" });
}).listen(5001, "127.0.0.1", () => process.stdout.write("Phase 9 browser mock listening on http://127.0.0.1:5001\n"));
