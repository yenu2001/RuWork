# RuWork Project Plan

## Purpose and source precedence

RuWork is an existing University of Ruhuna part-time job platform. This plan extends the supplied backend in `RuWork_backend-master/`; it does not replace its `models/`, `controllers/`, `routes/`, `middlewears/`, and `index.js` structure.

The plan is based on:

1. The complete supplied backend source and package manifest.
2. `docs/RuWork_Backend_Requirements.pdf`.
3. `docs/RuWork_Backend_Objects_Relationships.pdf`.
4. `design/ptjf.png` and `design/Hero 1.png`.
5. The current project instructions, which override conflicts in older documents.

The current instructions specifically override two older directions:

- Students remain in the existing `User` collection rather than introducing a separate `Student` collection.
- Pricing, rates, budgets, scope, and agreed-price calculations remain, but RuWork will not process payments or track a Paid/Pending payment state. Payment is arranged directly between the parties outside RuWork.

## 1. Existing backend

### Folder structure

```text
RuWork_backend-master/
|- controllers/
|  |- adminController.js
|  |- applicationController.js
|  |- emailVerificationController.js
|  |- jobController.js
|  |- jobProviderController.js
|  |- messageController.js
|  |- notificationController.js
|  |- reviewController.js
|  `- userController.js
|- middlewears/
|  `- authMiddleware.js
|- models/
|  |- admin.js
|  |- adminAudit.js
|  |- application.js
|  |- job.js
|  |- jobProvider.js
|  |- message.js
|  |- notification.js
|  |- platformSetting.js
|  |- review.js
|  `- user.js
|- routes/
|  |- adminRouter.js
|  |- applicationRouter.js
|  |- jobProviderRouter.js
|  |- jobRouter.js
|  |- messageRouter.js
|  |- notificationRouter.js
|  |- reviewRouter.js
|  `- userRouter.js
|- scripts/
|  |- createAdmin.js
|  `- README.md
|- utils/
|  |- account.js
|  |- admin.js
|  |- application.js
|  |- communication.js
|  |- emailService.js
|  |- emailVerification.js
|  |- job.js
|  |- ratingAggregates.js
|  `- review.js
|- index.js
|- package.json
`- package-lock.json
```

The misspelled `middlewears/` directory is retained for compatibility.

### Current models

- `User`: student personal details, credentials, and a default `student` role.
- `JobProvider`: company and contact details, credentials, and a default `Job_Provider` role.
- `Admin`: administrator identity, credentials, and a default `admin` role.
- `Job`: Provider-owned opportunity with title, synchronized current company identity, description, category, skills/scope, location/work details, suitable year, deadline, hourly/fixed LKR pricing, draft/open/closed lifecycle, and rating summary.
- `Application`: immutable Job/Student/Provider references, Student note, pricing snapshots, approved price, status reasons, and the `pending_review -> in_progress | declined | withdrawn` / `in_progress -> completed | cancelled` lifecycle.
- `Review`: one active Review per completed Application, with authoritative Job/Student/Provider references, an integer 1–5 rating, optional bounded plain-text comment, and timestamps.
- `Message`: immutable Student/Provider sender and receiver discriminators/IDs, mandatory authoritative Job/Application context, bounded plain-text content, optional explicitly shared Student profile contact number, read state, and timestamps.
- `Notification`: immutable typed Student/Provider recipient, bounded safe message, optional related Job/Application/Message references, read state, and timestamps.
- `AdminAudit`: fully immutable server-authored record of one Admin decision — Admin identity, enumerated action, enumerated target type, target ID, size-bounded metadata, and a server `createdAt` with no `updatedAt`.
- `PlatformSetting`: a single `singletonKey: "platform"` document holding the three typed, allowlisted business-policy booleans plus the Admin who last changed them.

### Current routes and controllers

- `POST /api/users`: student registration.
- `POST /api/users/login`: student login.
- `POST /api/jobProviders`: provider registration.
- `POST /api/jobProviders/login`: provider login.
- `POST /api/admin/login`: Admin login.
- `GET /api/users/verify-email/:token` and `POST /api/users/resend-verification`: Student verification.
- `GET /api/jobProviders/verify-email/:token` and `POST /api/jobProviders/resend-verification`: Provider verification.
- `GET /api/admin/registrations`: sanitized Admin-only registration listing with status/type filters.
- `GET /api/admin/registrations/:type/:id`: sanitized Admin-only registration detail.
- `PATCH /api/admin/registrations/:type/:id/approve`: Admin approval.
- `PATCH /api/admin/registrations/:type/:id/reject`: Admin rejection with an optional reason.
- Public `GET /api/jobs` browse/search and `GET /api/jobs/:id` details.
- Approved-Provider `POST /api/jobs`, `GET /api/jobs/my`, `GET /api/jobs/my/:id`, `PATCH /api/jobs/:id`, and `DELETE /api/jobs/:id` ownership-scoped management.
- Eligible-Student Application creation, listing/detail, withdrawal, and in-progress cancellation routes under `/api/applications`.
- Approved-Provider applicant listing/detail, acceptance/decline, and completion routes under `/api/applications`.
- Eligible-Student `GET/PATCH /api/users/profile`, `GET /api/users/dashboard`, and `GET /api/users/job-history`.
- Approved-Provider `GET/PATCH /api/jobProviders/profile` and `GET /api/jobProviders/dashboard`.
- Admin-only `GET /api/admin/dashboard` in addition to the registration-review routes.
- Eligible-Student `POST /api/reviews`, `GET /api/reviews/my/application/:applicationId`, and `DELETE /api/reviews/:id`.
- Public paginated `GET /api/jobs/:jobId/reviews` and owning-Provider `GET /api/jobProviders/reviews`.
- Admin-only paginated `GET /api/admin/reviews`, `GET /api/admin/reviews/:id`, `PATCH /api/admin/reviews/:id/moderation`, and `DELETE /api/admin/reviews/:id`.
- Admin-only paginated `GET /api/admin/students`, `GET /api/admin/students/:id`, and `PATCH /api/admin/students/:id/moderation`.
- Admin-only paginated `GET /api/admin/providers`, `GET /api/admin/providers/:id`, and `PATCH /api/admin/providers/:id/moderation`.
- Admin-only paginated `GET /api/admin/jobs`, `GET /api/admin/jobs/:id`, and `PATCH /api/admin/jobs/:id/moderation`.
- Admin-only `GET /api/admin/settings` and `PATCH /api/admin/settings` over an allowlisted typed business-policy set.
- Admin-only paginated, filterable, read-only `GET /api/admin/audits`.
- Eligible-Student/approved-Provider `GET /api/messages/conversations`, `GET /api/messages/conversations/:applicationId`, `POST /api/messages`, and `GET /api/messages/unread-count`.
- Eligible-Student/approved-Provider `GET /api/notifications`, `GET /api/notifications/unread-count`, `PATCH /api/notifications/read-all`, and `PATCH /api/notifications/:id/read`.

### Functionality already present

- Express JSON API entry point and MongoDB/Mongoose connection.
- Mongoose schemas for the three account types and jobs.
- bcrypt password hashing during registration and password comparison during login.
- JWT creation during login and token decoding before job creation.
- Basic role checking in `postJob`.
- Existing hourly pricing data through `Job.hourlyRate`; this must be preserved.
- Hashed, expiring, single-use Student and Provider email verification with SMTP delivery and resend cooldown.
- Admin-only registration review, guarded state transitions, and private Admin provisioning.
- Authoritative Student eligibility and approved/verified Provider middleware.

### Incomplete functionality

- No password-reset, password-change, or access-token revocation strategy.
- No health endpoint or integration tests against a live MongoDB/SMTP environment.
- Production security hardening (CORS/Helmet/rate limiting, centralized error handling, logging) and optional email/realtime communication delivery remain deferred to Phase 10. Role workspaces, database messaging, in-app notifications, and the full Admin workspace — account/Job/Review moderation, expanded statistics, Settings, and audit records — are complete.

### Historical Phase 1 findings (resolved)

- Database credentials and JWT signing material are hardcoded in source. Any previously committed values must be rotated, not reused.
- The server uses a fixed port rather than environment configuration.
- JWTs are printed to logs, exposing bearer credentials.
- Invalid JWTs are silently ignored, and authentication is implemented globally instead of on protected routes.
- `authMiddleware.js` is fully commented out and its role checks are inactive.
- JWTs have no configured expiry.
- Provider registration assigns the Mongoose model object to `role` instead of the intended role string.
- The provider model stores `companyEmail`, while login queries `email` and the token also reads the nonexistent `email` field.
- Student email validation checks for `.ruh.ac.lk`, which rejects a normal `name@ruh.ac.lk` address and can accept a disallowed subdomain.
- Student emails are not normalized before validation/querying.
- Registration passes the entire request body into Mongoose, allowing client attempts to control role and future approval fields.
- Students lack university/academic, email-verification, and account-approval fields.
- Providers lack account-approval state.
- Student/provider login does not distinguish pending, rejected, unverified, and approved accounts.
- Admin registration is publicly reachable even though Admin accounts must be provisioned privately.
- Login promises have incomplete error handling and return inconsistent authentication status codes.
- Job authorization is duplicated in the controller and allows Admins to post jobs; provider ownership is not recorded.

## 2. Final architecture

The existing layout remains the foundation. New behavior will be added as small modules in the same conventions:

```text
RuWork_backend-master/
|- controllers/       # request/response orchestration
|- middlewears/       # JWT, role, eligibility, and ownership guards
|- models/            # current schemas plus planned domain schemas
|- routes/            # Express route definitions
|- utils/             # small shared validation/token helpers where useful
`- index.js            # environment loading, database connection, route mounting, startup
```

Future additions should be incremental. Controllers should validate input and delegate persistence to Mongoose models. Protected routes must authenticate first, then apply role, eligibility, and ownership checks. Frontend restrictions are usability features only; the API remains the authority.

### Frontend foundation

Phase 3 adds a separate Vite application alongside the preserved backend:

```text
frontend/
|- public/                   # public RuWork mark/favicon
|- src/
|  |- components/
|  |  |- admin/            # moderation badge, reasoned moderation dialog, bounded pagination
|  |  |- auth/              # role modal, registration sections, resend, route guard
|  |  |- applications/      # apply/actions and Application status presentation
|  |  |- common/            # buttons, inputs, alerts, logo, modal, loading, toast support
|  |  |- jobs/              # cards, rating/status summaries, skills, preview, skeletons
|  |  |- layout/            # public/authentication and role-aware application navigation
|  |  |- reviews/           # rating summaries, stars, review cards/lists, Student actions
|  |  `- workspace/         # reusable role-workspace statistics and account-status badges
|  |- context/              # authentication and lightweight toast state
|  |- pages/
|  |  |- admin/             # dashboard, Registration Reviews/details, Student and Provider
|  |  |                     # administration/details, Job moderation/inspection, Review
|  |  |                     # moderation, Settings, and the read-only Audit Trail
|  |  |- auth/              # login, registration, verification, account states
|  |  |- jobs/              # public browse and Job Details
|  |  |- messages/          # shared Student/Provider responsive inbox and threads
|  |  |- notifications/     # shared Student/Provider lifecycle/Message updates
|  |  |- provider/          # dashboard, jobs/applicants, Application detail, profile/reviews
|  |  |- public/            # landing page
|  |  `- student/           # dashboard, Applications/detail, Job History, profile
|  |- services/             # Axios plus auth, domain, Message, Notification, and workspace calls
|  |- test/                 # shared Vitest setup
|  |- utils/                # validation, safe API errors, JWT decode, session storage
|  |- App.jsx               # route map and role protection
|  `- main.jsx              # application providers and browser entry point
|- .env.example             # public API base URL only
|- eslint.config.js
|- package.json
`- vite.config.js           # React, Tailwind, tests, and local `/api` proxy
```

The frontend remains deliberately separate from the backend. Its default `VITE_API_BASE_URL=/api` is routed to `http://localhost:5000` by the Vite development proxy, avoiding endpoint duplication in components and avoiding a Phase 3 backend/CORS refactor. Deployment environments may override the public API base URL.

## 3. Models

### User (Student / Job Seeker)

Preserve the existing personal fields and extend the same collection with:

- `university`: fixed by the backend to `University of Ruhuna`.
- `faculty` and/or `fieldOfStudy`.
- `yearOfStudy`.
- `isEmailVerified`: Boolean, default `false`.
- `accountStatus`: `pending | approved | rejected`, default `pending`.
- `emailVerificationTokenHash`, `emailVerificationExpiresAt`, and `verificationEmailSentAt`; verification internals are excluded from normal queries.
- Optional `rejectionReason`, `reviewedAt`, and private `reviewedBy` review metadata.

The canonical role remains `student`. The canonical email is trimmed, lowercased, unique, and must have the exact domain configured by `ALLOWED_STUDENT_EMAIL_DOMAIN` (`ruh.ac.lk`).

### JobProvider

Preserve all current company and contact fields. `companyEmail` is the canonical provider email field. The model includes the required `companyAddress`, `accountStatus`, separate `isEmailVerified`, hashed verification-token/expiry fields, resend timing, account-review metadata, and the mandatory nullable `averageRating`/zero-based `reviewCount` Review summary. Preserve the existing `Job_Provider` role naming for compatibility. Provider email is normalized but is not restricted to `ruh.ac.lk`. Publishing and Provider Review access are protected by the authoritative approved-and-verified Provider guard.

### Admin

Preserve the existing Admin model and `admin` role. Public registration is unavailable. Initial Admin accounts are provisioned with `npm run create-admin` using ignored environment variables; the script validates input, prevents duplicate Admin emails, hashes passwords, and never prints plaintext passwords. Phase 9 adds the separate `AdminAudit` record rather than embedding audit metadata in the Admin document; finer-grained Admin permissions remain a possible later addition.

### AdminAudit

Phase 9 adds an append-only audit document. Every field — `adminId`, `action`, `entityType`, `entityId`, and `metadata` — is `immutable`, and the schema carries `createdAt` only. `action` is constrained to twelve values (`REGISTRATION_APPROVED`, `REGISTRATION_REJECTED`, `STUDENT_SUSPENDED`, `STUDENT_RESTORED`, `PROVIDER_SUSPENDED`, `PROVIDER_RESTORED`, `JOB_HIDDEN`, `JOB_RESTORED`, `REVIEW_HIDDEN`, `REVIEW_RESTORED`, `REVIEW_DELETED`, `SETTINGS_UPDATED`) and `entityType` to six (`registration`, `student`, `jobProvider`, `job`, `review`, `settings`). A validator caps serialized `metadata` at 1500 characters.

The Admin identity is always read from the verified JWT subject, never from the request body, and `createAdminAudit` re-validates both ObjectIds and both enumerations before writing. There is no audit create, update, or delete API; the only exposure is the bounded Admin-only listing. Newest-first, per-Admin, and per-target indexes support that listing.

### PlatformSetting

Phase 9 adds a single-document settings collection keyed by an immutable `singletonKey: "platform"`. It stores exactly three typed booleans — `studentRegistrationOpen`, `providerRegistrationOpen`, and `jobPostingOpen` — plus `updatedBy` and timestamps. There is no arbitrary key/value store: the update endpoint rejects any field outside the allowlist and any value that is not a literal boolean.

No secret, credential, or infrastructure value is stored here. JWT signing material, MongoDB credentials, SMTP credentials, and Admin provisioning values remain environment-only, and the Settings page states this explicitly. Settings are read server-side by Student registration, Provider registration, and Job creation, so a closed policy is enforced by the API rather than by hiding a frontend control.

### Moderation fields

Phase 9 extends four existing schemas with a small, uniform, reversible moderation block rather than adding new state machines:

- `User` and `JobProvider` gain `moderationStatus` (`active | suspended`, default `active`), `moderationReason`, `moderatedAt`, and `moderatedBy`.
- `Job` gains `moderationStatus` (`visible | hidden`, default `visible`), the same three review fields, and a separate `providerSuspendedAt` stamp that is maintained by Provider suspension rather than by direct Job moderation.
- `Review` gains `moderationStatus` (`active | hidden`, default `active`) and the same three review fields.

Every moderation state is reversible and no moderation path deletes a record. Suspended accounts, hidden Jobs, and hidden Reviews retain their Applications, Messages, Reviews, and history intact.

### Job

The completed Job model preserves `hourlyRate` and the existing field names while adding an immutable required `jobProviderId`, centralized category enum, normalized unique skill tags, scope, hourly/fixed `budgetType`, fixed `budget`, internal normalized `priceAmount`, immutable `LKR` currency, and the minimal `draft | open | closed` lifecycle. Conditional validation requires exactly the relevant positive primary price. Phase 7 now maintains the nullable `averageRating` and zero-based `reviewCount` from active Review documents. Targeted compound and text indexes support Provider ownership, availability/deadline, category/location, price sorting, and bounded MongoDB text search.

Pricing is job information, not payment processing.

Job deletion follows Option B: `DELETE /api/jobs/:id` closes and archives the owned Job with `archivedAt` instead of removing it. Archived Jobs disappear from browse and Provider management while remaining available through existing Application history.

### Application

Phase 5 adds an Application document with immutable references to the `Job`, Student `User`, and owning `JobProvider`; a 20–1000 character Application note; immutable Job-pricing snapshot; semantically separate Provider-approved price; LKR currency; status reasons; lifecycle timestamps; and normal Mongoose timestamps.

- Hourly work stores `originalHourlyRate` and later `approvedHourlyRate`.
- Fixed work stores `originalBudget` and later `approvedBudget`.
- A unique compound `{ jobId, studentId }` index prevents duplicate applications even under concurrent requests.
- The lifecycle is `pending_review -> in_progress | declined | withdrawn`, `in_progress -> completed | cancelled`.
- The Provider alone accepts, declines, or completes an owned Job's Application. The Student alone withdraws their pending Application or cancels their in-progress engagement.
- `withdrawn`, `declined`, `completed`, and `cancelled` are terminal. Only `completed` is Review eligible.
- No payment-processing or Paid/Pending fields exist.

### Review

Phase 7 adds an auditable Review document with immutable `applicationId`, `jobId`, `studentId`, and `jobProviderId` references, an integer rating from 1–5, an optional trimmed plain-text comment capped at 1000 characters, and normal Mongoose timestamps. A unique `applicationId` index enforces one active Review per completed engagement and duplicate-key races return a sanitized `409 Conflict`.

All identities come from the authoritative completed Application. Student creation and deletion re-check the eligible University Student account and ownership; cancelled, pending, in-progress, declined, and withdrawn Applications cannot be reviewed. Deleting a Review leaves the Application and related records intact and permits a new Review for that completed Application later. Archived Jobs remain eligible through their completed Application history.

### Message

Phase 8 stores direct Student/Provider Messages as individual records grouped by a mandatory `applicationId`; no redundant Conversation document is needed. Every Message has immutable `senderType`/`senderId`, `receiverType`/`receiverId`, `jobId`, and `applicationId`, plus trimmed plain-text content from 1–2000 characters, `isRead`, optional `readAt`, and timestamps. The authoritative Application establishes both participants and Job, so callers cannot select/spoof identities or message an unrelated account. A Student may explicitly include only the phone number re-read from their authenticated profile; Providers cannot submit or replace that contact value.

Indexes support chronological Application history, recipient unread counts, and sender queries. Conversation summaries are aggregated from Message records, newest-first and bounded, then hydrate safe Job/participant summaries with constant batch queries rather than an N+1 query per conversation. Opening a thread marks only received unread Messages as read.

### Notification

Phase 8 stores in-app Notifications with immutable `recipientType`/`recipientId`, one of the seven implemented event types (`NEW_APPLICATION`, `APPLICATION_ACCEPTED`, `APPLICATION_DECLINED`, `APPLICATION_WITHDRAWN`, `APPLICATION_CANCELLED`, `APPLICATION_COMPLETED`, `NEW_MESSAGE`), a trimmed plain-text message capped at 500 characters, optional related Job/Application/Message references, read state, and timestamps. Recipient/unread and newest-first indexes support bounded inbox and badge queries.

Lifecycle Notifications are created after the related Application save succeeds, and a Message creates a `NEW_MESSAGE` Notification for its receiver. Notification failure is best-effort and does not reverse an already-successful core Application/Message action. Review notifications are intentionally deferred because Phase 8's confirmed trigger list does not include them; the centralized helper is the clean extension point if that product decision changes.

## 4. Authentication flow

### Student registration

```text
Submit registration
-> trim/lowercase email
-> require exactly one @ and domain exactly ruh.ac.lk
-> reject any conflicting university value
-> force university = University of Ruhuna
-> force role = student
-> hash password
-> create with isEmailVerified = false and accountStatus = pending
-> return an awaiting-verification/approval response without a JWT
```

The implemented verification flow sends a one-time token to the University email, stores only its hash and expiry, and sets `isEmailVerified` only after successful confirmation. Verification does not change Admin approval state.

### Job Provider registration

```text
Submit registration
-> normalize companyEmail
-> force role = Job_Provider
-> hash password
-> create with isEmailVerified = false and accountStatus = pending
-> send a one-time company-email verification link
-> return an awaiting-verification/Admin-review response without a JWT
```

Providers are not subject to the University email-domain rule.

### Login and JWT

- Student login normalizes the email and verifies the password.
- A Student receives normal access only if email/university/role eligibility remains valid, `isEmailVerified` is true, `accountStatus` is `approved`, and the account is not suspended by Admin moderation.
- Provider login uses `companyEmail`, verifies the password, and requires `isEmailVerified = true`, `accountStatus = approved`, and no Admin suspension.
- Admin login is separate and has no public Admin signup.
- Issued JWTs include the account ID, canonical email, and role, have a configured expiry, and are signed with `process.env.JWT_SECRET`.
- Protected routes reject absent, malformed, expired, or invalid tokens with `401`.
- Role guards return `403` for an authenticated but unauthorized account.

## 5. Admin approval flow

```text
Student or Job Provider registers
-> accountStatus: pending
-> Admin opens the complete registration record
-> Admin approves or rejects
-> accountStatus: approved or rejected
```

Email verification is distinct from approval for both account types. Approval endpoints are Admin-only, validate state transitions, record reviewer/timestamps, write an immutable audit record, and never expose password or token hashes.

Approval is separate from moderation. An approved account may later be reversibly suspended, and a restored account returns to its existing approval state rather than re-entering the review queue.

## 6. Student eligibility

Only a Student who satisfies every server-side rule may receive normal Student access or apply for a job:

- role is `student`;
- normalized email domain is exactly `ruh.ac.lk`;
- university is exactly `University of Ruhuna`;
- `isEmailVerified` is true;
- `accountStatus` is `approved`; and
- `moderationStatus` is not `suspended`.

The application endpoint must re-check these conditions instead of trusting an old frontend state or hidden button.

## 7. Job system

- Provider-only job creation with authenticated provider ownership.
- Multi-step frontend creation followed by one validated API submission, or draft updates followed by publish.
- Pricing support for hourly/fixed budget types, rates, scope, calculated cost where applicable, and provider-approved/adjusted agreed prices.
- Public/Student job listing with pagination, safe sort options, search, category, skills, location, suitable year, budget type/range, and open/deadline filters.
- Lightweight listing projections; details are fetched separately.
- Student applications with eligibility checks and duplicate-application prevention.
- Provider application decisions and provider ownership checks.
- Provider edit/delete operations restricted to the provider's own jobs.
- Admin moderation through Admin-only endpoints: reversible Job hiding, Provider suspension that hides owned Jobs, and preserved Application history in both cases.

## 8. Reviews and ratings

- Reviews attach to a completed job engagement, Student `User`, and Job Provider.
- Rating is constrained to whole numbers from 1–5; Students can create/delete only their own eligible Reviews, while Providers have view-only access. Admins can reversibly hide and restore a Review through moderation, and retain the Phase 7 permanent deletion for content that must not persist. Both Admin paths write an audit record and recalculate both aggregates.
- Job-list/search responses expose only `averageRating` and `reviewCount`.
- On desktop job cards, the aggregate rating is displayed on the right side of the card.
- Individual comments are retrieved only from the selected Job Details page through a separate paginated review endpoint.
- Both mandatory aggregates are implemented: each Job summarizes its active Reviews, and each Job Provider summarizes active Reviews across all their Jobs.
- Centralized MongoDB aggregation helpers recalculate and store both summaries after Student creation/deletion and Admin deletion. Values round to one decimal; no Reviews stores `averageRating: null` and `reviewCount: 0`.
- Recalculation is idempotent. Because local/test MongoDB may not be a replica set, Phase 7 does not require transactions; create/delete operations use compensating rollback/restore when an aggregate update fails and surface a safe server error.
- Public Job Reviews, owning-Provider Reviews, and Admin Reviews are newest-first and paginated with bounded page sizes. Admin text search is escaped before use and arbitrary sorting/query input is not accepted.

## 9. Messaging and notifications

- Direct messaging is available only between the Student and Job Provider already related by an authoritative Application; Admin chat, attachments, group chat, and arbitrary account lookup are not supported.
- Conversation lists and histories use bounded pagination. Message content is rendered as plain text, participant summaries are allowlisted, and archived Jobs remain valid context because their Applications are preserved.
- Contact exchange is an explicit per-Message Student choice. The backend derives the number from the current authenticated profile and ignores no client-supplied alternate number because system-field submissions are rejected.
- In-app lifecycle Notifications cover applying, accepting, declining, withdrawing, cancelling, completing, and receiving a Message. Each role sees only its own records and may mark one or all read.
- The responsive Student and Provider workspaces expose inbox/thread pages, notification pages, contextual links, refresh controls, semantic read/unread labels, and real unread header badges. They do not poll or use WebSockets; current state refreshes on navigation, explicit refresh, and relevant local actions.
- No email event delivery, realtime socket infrastructure, message attachments, payment chat, or Admin surveillance UI was added in this phase.

## 10. Payment policy

RuWork retains prices, hourly/fixed rates, budgets, scope, calculated job cost, and provider approval/adjustment of an agreed price.

RuWork does not process, collect, transfer, settle, escrow, or hold money. It will not integrate Stripe, PayHere, cards, bank transfers, wallets, or a payment gateway, and it will not track a Paid/Pending payment status. Payments are arranged directly between the Student and Job Provider using the provider's preferred method.

Future frontend copy:

> **Payment Information**  
> Payments are arranged directly between the student and the job provider using the provider's preferred payment method. RuWork does not process, collect, or hold payments.

## 11. Frontend pages

The supplied board contains grayscale wireframes for early flows, a basic `RuAdmin` shell, and newer white/blue-purple registration concepts. It also contains a separate `GradGig` marketplace/category concept that is not part of the confirmed RuWork job requirements and does not redefine the product. The implemented public/authentication frontend uses the newer RuWork visual direction: a white/light-neutral canvas, indigo-purple primary color, restrained blue accents, rounded form panels, compact shadows, clear split-screen authentication layouts, and the Student/Provider messaging hierarchy from the supplied concepts. It does not copy the older grayscale style or GradGig identity.

### Public

- Landing page
- Role-selection login entry
- Student login
- Job Provider login
- Separate Admin login
- Create Account role selection (Student or Job Provider only)
- Student Registration
- Job Provider Registration
- Verification/awaiting-approval states

### Student

- Dashboard
- Find Jobs (rating summary on the right of desktop cards)
- Job Details (individual reviews loaded here)
- My Applications
- Messages
- Notifications
- Job History
- Reviews
- Profile

### Job Provider

- Dashboard
- Post Job multi-step flow and preview
- My Jobs
- Applications
- Messages
- Notifications
- Reviews
- Company Profile

### Admin

- Dashboard
- Registration Reviews
- Students
- Job Providers
- Jobs
- Reviews
- Settings

The seven entries above are the Admin navigation. Phase 9 also adds detail and activity views reached from them rather than from the navigation bar: Student and Job Provider account details, Job inspection, Registration details, and the full Audit Trail at `/admin/audits`, linked from both the Dashboard activity card and the Settings audit section.

## 12. Development phases

1. **Backend foundation repair (completed):** documented the existing system; added environment configuration and ignore rules; removed hardcoded secrets; repaired provider email/role bugs; added approval and Student academic/eligibility schema preparation; disabled public Admin registration; restored protected-route JWT/RBAC behavior; and verified the foundation.
2. **Approval and verification (completed):** implemented Student and Provider hashed-token email verification and resend cooldown, SMTP delivery structure, Admin review APIs, guarded state transitions, authoritative eligibility middleware, private Admin provisioning, and automated tests.
3. **Frontend public/authentication shell (completed):** Vite/React/Tailwind setup, shared layout/design tokens, responsive landing page, exact role-selection flows, registration/login, verification and resend, pending/rejected states, React Router protection, session authentication state, and Axios client.
4. **Job foundation (completed):** Provider ownership, category/skills/scope, hourly/fixed pricing, local preview plus draft/publish, CRUD and lifecycle controls, browse/search/filter/detail APIs, responsive Job pages, and tests.
5. **Applications (completed):** Student eligibility guard, Application schema and lifecycle, duplicate prevention, Provider decisions, agreed-price adjustment, Student/provider Application views, Student withdrawal/in-progress cancellation, and Option B Job archiving. Notifications remain a later phase.
6. **Role workspaces (completed):** live Student/Provider/Admin dashboards, Student Job History, Student and Company Profile management, responsive role navigation, current-company identity synchronization, essential Admin Registration Reviews/decisions, and authorization/ownership verification.
7. **Reviews and ratings (completed):** completed-engagement review rules, per-Job and mandatory Provider aggregates, lightweight job-card summaries, paginated Job Details comments, Student creation/deletion, focused Provider/Admin views, moderation, and tests.
8. **Messaging and notifications (completed):** Application-authorized direct Messages, explicit Student contact sharing, bounded conversation/history APIs, persistent lifecycle/Message Notifications, read/unread state and badges, shared responsive role pages, and tests. Realtime and email delivery remain optional later enhancements.
9. **Full Admin workspace (completed):** reversible Student/Provider/Job/Review moderation beyond the existing Registration Review workflow, expanded authoritative statistics, allowlisted business-policy Settings, immutable audit records, strict Admin-only authorization on every endpoint, a responsive Admin workspace, and tests.
10. **Production hardening and live integration:** validation consistency, centralized error handling, password reset/change if required, access-token revocation, CORS/Helmet/rate limiting, logging without secrets, a health endpoint, replacing the `mongoose.connection.readyState === 0` test-support short-circuit in `utils/admin.js` with injected test doubles or an explicit environment gate, security/a11y/performance testing, deployment/live MongoDB/SMTP configuration and integration testing, seed/demo tooling, and documentation.

## Phase 1 verification criteria (completed)

- No MongoDB URI, database credential, or JWT signing secret remains in source.
- `.env` is ignored and `.env.example` contains no secrets.
- Student email normalization and exact-domain validation are enforced by the backend.
- Student university and role cannot be changed through registration input.
- New Student and Provider accounts begin pending; Student email verification remains separate.
- Provider registration and login use `companyEmail` consistently and the provider role is a string.
- Public Admin registration is unavailable.
- Protected job posting uses JWT authentication and provider role authorization.
- Dependencies install, source imports parse, and startup behavior is tested with safe configuration.

## Phase 2 implementation status

- Verification tokens use 32 random bytes, are delivered only in the frontend verification URL, and are stored only as SHA-256 hashes with a configurable expiry (30 minutes by default).
- Successful verification clears the stored token hash/expiry and leaves `accountStatus` unchanged.
- Student and Provider resend endpoints replace older tokens and enforce a persisted configurable cooldown (60 seconds by default).
- SMTP configuration uses `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASSWORD`, and `EMAIL_FROM`; live delivery still requires local credentials and provider configuration.
- Student and Provider login issue no normal JWT for unverified, pending, or rejected accounts.
- `requireEligibleRuhunaStudent` re-reads the authoritative Student record and verifies role, exact domain, university, email verification, and approval.
- `requireApprovedJobProvider` re-reads the Provider record and prevents unverified/unapproved job posting.
- Admin registration-review routes require JWT authentication and the Admin role, return explicit allowlisted fields, require verified email before approval, and reject repeated/nonsensical state transitions.
- Rejections may include a trimmed reason up to 500 characters and record `reviewedAt`/`reviewedBy`.
- The first Admin is created privately with `npm run create-admin` and ignored `ADMIN_*` environment variables; public `POST /api/admin` remains unavailable.
- Automated tests cover domain rejection, forced registration state, password hashing, token hashing/expiry/single use/replacement, Admin authorization and sanitization, Student/Provider decisions, login states, and authoritative eligibility.
- Actual SMTP delivery was not tested because no email credentials are configured; email generation and delivery integration are structurally and unit verified.

## Phase 3 implementation status

- Added the standalone `frontend/` Vite + React application with Tailwind CSS as the primary styling system, React Router, Axios, ESLint, Vitest, and React Testing Library.
- Added reusable RuWork primitives for logo, buttons, labeled fields, password visibility, selects, text areas, alerts, loading states, toast feedback, registration sections, and a focus-trapped keyboard-accessible modal.
- Implemented the responsive landing page and public header/footer using the newer white/indigo/purple RuWork direction while preserving the supplied Student/Provider product hierarchy. GradGig marketplace concepts and old grayscale styling were intentionally excluded.
- Login role selection contains exactly Student / Job Seeker, Job Provider, and Admin. Create Account contains only Student / Job Seeker and Job Provider; no Admin registration route or option exists.
- Implemented `/login/student`, `/login/provider`, and `/admin/login` against the exact Phase 2 credential fields and endpoints. Student/Provider `EMAIL_NOT_VERIFIED`, `ACCOUNT_PENDING`, and `ACCOUNT_REJECTED` responses route to full account-state pages rather than generic notifications.
- Implemented `/register/student` with the exact Student fields, fixed `University of Ruhuna` display, exact `@ruh.ac.lk` client validation, and backend-matching password guidance. Implemented `/register/provider` with the exact supported company and primary-contact fields, including the 300-character company-description limit and optional website.
- Implemented `/verify-email?token=...&type=student|jobProvider` against the Phase 2 email-link contract, including verifying, success, invalid-or-expired, failure, and resend states. The backend currently returns one combined invalid-or-expired code, so the frontend does not claim it can distinguish those two cases. Single-use/already-used links are handled by the same safe state.
- Implemented Student and Provider resend calls with the correct email field, in-flight disabling, generic success response, server-enforced cooldown display, and safe network/server error handling.
- Added a shared Axios client configured by the public `VITE_API_BASE_URL`; its request interceptor attaches the Phase 2 Bearer JWT without logging it or placing it in URLs.
- Added React Context authentication state and role-aware protected routes; the initial dashboard placeholders were subsequently replaced by the live Phase 6 workspaces. JWT claims are decoded only for display/routing and are reconstructed from the token during restoration; backend signature validation and authorization remain authoritative.
- Authentication uses `sessionStorage` under `ruwork.auth`. This restores access after reload in the same tab and clears when the browser tab/session closes, but remains JavaScript-readable and therefore exposed to XSS. Passwords are never persisted. No refresh token or cookie architecture was invented because Phase 2 does not provide one. These tradeoffs are also documented in `frontend/README.md`.
- Added safe frontend environment examples containing only `/api`; no database, JWT-signing, SMTP, or Admin-provisioning secret is present in the frontend.
- Added focused tests for role modal options, exact Student email/password validation, verification query-token forwarding, pending/rejected states, unauthorized redirect, wrong-role redirect, token-claim restoration, and configured Axios base URL.
- Full dashboards, applications, Review creation, messaging, notifications, profiles, and payment processing remained intentionally deferred after Phase 3. Phase 4 has now completed the Job foundation without changing those boundaries.

## Phase 4 implementation status

- Completed the existing `Job` schema with immutable Provider ownership, authoritative company identity, confirmed RuWork categories, normalized 1–10 skill tags, scope, suitable year, working details, future-deadline enforcement for open Jobs, and `draft | open | closed` status.
- Pricing supports either a positive numeric `hourlyRate` or positive numeric fixed `budget`, selected by `budgetType`; the irrelevant price is cleared and an internal `priceAmount` supports safe unified range filters/sorts. Display currency is fixed to LKR. No payment, transaction, escrow, settlement, or Paid/Pending data was added.
- Approved-and-verified Provider middleware protects every management endpoint. Ownership comes only from the authoritative Provider record; client-supplied ownership/company/rating/system fields are rejected. Update, status change, private-draft retrieval, and deletion are owner-scoped with explicit 403/404 behavior.
- Added public `GET /api/jobs` and `GET /api/jobs/:id`; Provider `POST /api/jobs`, `GET /api/jobs/my`, `GET /api/jobs/my/:id`, `PATCH /api/jobs/:id`, and `DELETE /api/jobs/:id`. Static `/my` routes precede `/:id` routes.
- Public browse defaults to open Jobs with future deadlines and returns allowlisted card summaries only. It supports bounded page/limit metadata, whitelisted newest/oldest/price/rating sorts, capped MongoDB text search, escaped location/skill filters, and category/year/budget/price-range filters. Job Details returns full public fields and only allowlisted Provider company fields.
- Phase 4 prepared `averageRating: null` and `reviewCount: 0`; Phase 7 now maintains those fields from real Reviews. Search cards keep the aggregate on the desktop right side, display “No ratings yet” honestly, and never request or render individual comments.
- Added responsive `/jobs` URL-synchronized browse/filter/pagination UI, `/jobs/:id` details, protected `/provider/jobs`, `/provider/jobs/new`, and `/provider/jobs/:id/edit`, plus role-aware application navigation. The dashboard placeholders used at that phase were subsequently replaced in Phase 6.
- The Provider editor retains all multi-step values locally through Basics, Skills & Scope, Work Details, Pricing, Description, and Preview. Preview creates no database record. Complete Jobs may then be saved as a draft or published; existing Jobs may be edited, closed, or reopened. Conditional pricing shows only the applicable LKR input.
- My Jobs filters only the authenticated Provider’s Jobs and provides draft/open/closed/derived-expired presentation with View, Edit, Publish/Reopen, Close, and modal-confirmed Delete actions.
- Phase 5 replaced the disabled Job Details application control with the role- and availability-aware Apply flow, and changed the former hard-delete control to modal-confirmed Archive.
- Automated verification passes all 38 backend tests and 19 frontend tests, plus frontend ESLint and the Vite production build. Desktop and 390×844 browser checks found meaningful content, no framework error overlay, no console errors, and no mobile horizontal overflow. Live data was not exercised because the local `MONGODB_URI` is intentionally unconfigured; the safe API error state was verified instead.
- At the end of Phase 4, Applications, Reviews, and role workspaces were still deferred. Phases 5–7 have since completed Applications, dashboards/profiles/history, Reviews, both required rating aggregates, and focused Review moderation. Messaging, notifications, full Admin Job moderation, and every form of payment processing remain deferred.

## Phase 5 implementation status

- Added `Application` persistence, serialization, route/controller modules, lifecycle validation, bounded pagination/status filters, safe projections, authoritative Student/Provider identities, and the unique Job/Student index.
- An approved and verified University Student may apply once to a non-archived open Job before its deadline. Draft, closed, expired, and archived Jobs reject Applications; client attempts to spoof identity, state, timestamps, or pricing are rejected.
- Added Student APIs to find the current Application for a Job, list/view owned Applications, withdraw `pending_review`, and cancel `in_progress` with an optional reason. The requested cancellation is terminal and visible to both parties.
- Added owning-Provider APIs to list a Job's applicants, view an Application, accept `pending_review` with the correct hourly/fixed approved price, decline it with an optional reason, and complete `in_progress` work. Ownership is verified through the related Job, not a client-supplied Provider ID.
- Added Student `/student/applications` and `/student/applications/:id` pages with status filters, responsive cards/details, original/agreed prices, withdrawal/cancellation confirmations, archived-Job history, external-payment notice, and completed-only Review actions after Phase 7.
- Added Provider `/provider/jobs/:jobId/applications` and `/provider/applications/:id` pages with safe Student academic fields, filters, details, fixed/hourly agreement modals, decline confirmation, completion confirmation, and status updates.
- Job Details now supports public login guidance, Student apply modal/validation/success, existing-Application linking, role blocking, and closed/expired blocking. My Jobs includes Application counts and links to applicant management.
- Job deletion is Option B soft deletion: the Job becomes closed and receives `archivedAt`; it is omitted from browse/My Jobs/edit while Application references and history remain intact.
- Prices are agreement metadata only. RuWork still does not process or track payments, and the shared Payment Information copy appears in Job and Application details.
- Automated verification passes all 55 backend tests and 31 frontend tests, including Phase 5 schema, authorization, duplicate/race handling, status transitions, pricing, archive integrity, apply/actions/pages/routes, and safe display behavior. ESLint and the production Vite build also pass.
- At the end of Phase 5, dashboards/profiles/history and Reviews were still deferred. Phase 6 completed the workspaces and Phase 7 completed Review creation, both aggregates, and focused Admin Review moderation. Database/email notifications, messaging/contact exchange, payment processing, and full Admin Application/Job moderation remain deferred.

## Phase 6 implementation status

- Replaced all dashboard placeholders with live, responsive Student, Provider, and Admin workspaces using bounded summary endpoints rather than browser-side collection scans or N+1 requests.
- Added eligible-Student self-profile retrieval/update with an explicit editable-field allowlist. University, official email, role, approval/verification state, password, and verification/review metadata remain immutable through this API.
- Added Student Job History derived from owned terminal Applications (`completed`, `cancelled`, `declined`, and `withdrawn`), with bounded pagination, status filters, agreed/original pricing, dates, and preserved archived-Job references.
- Added approved-Provider Company Profile retrieval/update with an explicit allowlist and read-only company email/security state. The current Provider company name is authoritative: a rename synchronizes every owned Job, including archived records, and serializers prefer populated current Provider identity wherever it is available.
- Added a Provider dashboard with owned-only Job/Application aggregates, five recent Jobs with application counts, and five recent Applications. No rating, revenue, or payment statistic is fabricated.
- Added the Admin dashboard foundation with pending Student/Provider workload and lightweight Student, Provider, and open-Job totals.
- Added protected Admin Registration Reviews list/type/status filters, sanitized Student/Provider cards, full detail pages, account/email state badges, and modal-confirmed approve/reject actions with the existing optional 500-character rejection reason.
- Extended the shared role-aware header for Student Dashboard / Find Jobs / My Applications / Job History / Profile; Provider Dashboard / Post a Job / My Jobs / Company Profile; and Admin Dashboard / Registration Reviews on desktop and mobile.
- Added `profileService`, `dashboardService`, and `adminService`; page components contain no direct Axios calls and all APIs reuse the existing authenticated client.
- Automated verification passes all 64 backend tests and 41 frontend tests, together with frontend ESLint and the Vite production build. A temporary in-memory API exercised Student, Provider, and Admin browser flows without modifying MongoDB: desktop and 390px mobile pages rendered meaningful data, profile read-only fields and archived Job History behaved correctly, approve/reject modals updated immediately, mobile navigation worked, and no console errors, framework overlays, or horizontal overflow were found.
- At the end of Phase 6, Reviews and both aggregates were deferred; Phase 7 has now completed them. Messaging, notifications, full Admin account/Job moderation and settings, password reset/change, and all payment processing remain deferred.

## Phase 7 implementation status

- Added the `Review` model and centralized validation/aggregate utilities. One unique active Review is allowed per completed Application, and Student/Job/Provider identities are always derived from that authoritative Application rather than client input.
- Added eligible-Student creation, own-Review lookup and deletion APIs; public paginated Job Reviews; owning-Provider paginated Reviews; and Admin-only paginated filtering/deletion. Public Student identity is limited to first and last name, and Review text is stored/rendered as bounded plain text.
- Only `completed` Applications qualify. Pending, in-progress, declined, withdrawn, and cancelled Applications are rejected. A completed engagement remains eligible when its Job is archived, and deleting a Review preserves Application history and allows re-review.
- Centralized MongoDB aggregation recalculates both mandatory denormalized summaries after every create/delete path. Ratings round to one decimal; an empty set restores `averageRating: null` and `reviewCount: 0`. Idempotent recalculation plus compensating Review rollback/restore provides practical consistency without requiring replica-set transactions.
- Job browse cards show only the real Job aggregate on the desktop right side and never comments. Job Details separately labels Job and Provider ratings and loads paginated Review cards. Completed Student Application Details provides an accessible 1–5 radio-star form plus modal-confirmed deletion and immediate local state updates.
- Added `/provider/reviews` with the Provider's overall rating and scoped, view-only Review list, `/admin/reviews` with bounded rating/comment filtering and modal-confirmed moderation deletion, and real Provider rating on Company Profile. Provider and Admin navigation now includes Reviews.
- Phase 7 adds 15 focused backend tests and 9 focused frontend Review tests, while extending the existing Job card/detail tests. The complete suites pass 79/79 backend tests and 51/51 frontend tests; ESLint and the Vite production build also pass.
- A temporary in-memory API exercised the complete browser flow without touching MongoDB: desktop Job cards kept the rating on the right and omitted comments; Job Details showed separate Job/Provider ratings and safe Student Reviews; an archived completed Application supported Review creation, deletion, and re-review; Provider Reviews were scoped and view-only; Admin filtering and modal-confirmed moderation rendered correctly. Desktop and 390px layouts had meaningful content, no Vite overlay, no console errors, correct modal focus containment/wrapping, and no horizontal overflow.
- Live MongoDB Atlas aggregation is not claimed unless local Atlas credentials are configured; automated controller/model tests and a temporary in-memory browser API provide credential-free verification.

## Phase 8 implementation status

- Added persistent `Message` and `Notification` models plus centralized participant/event/pagination validation. The separate Student and JobProvider collections remain intact and are represented by an explicit account-type discriminator with immutable IDs.
- An Application is the required conversation boundary and authoritative relationship. Student and Provider message creation, history, and summary access re-check current eligible/approved accounts and exact Application participation; Admins, unrelated users, identity spoofing, and arbitrary receivers are rejected.
- Students may explicitly attach only their current authenticated profile phone number to an individual Message. Providers cannot expose the control, and neither role can submit a replacement contact/system field. Message content is bounded to 2000 characters and displayed as plain text.
- Added bounded, newest-first conversation summaries without N+1 participant queries, paginated chronological history, receiver-only read updates on opening a thread, and role-scoped unread counts. Archived Job/Application history remains usable.
- Added seven persistent in-app Notification triggers for the six Application lifecycle actions and new Messages. Listing, unread-only filtering, individual read, mark-all-read, and unread-count operations are recipient scoped. Core actions remain successful if best-effort Notification creation encounters an independent failure.
- Added protected shared `/student/messages`, `/student/messages/:applicationId`, `/student/notifications`, `/provider/messages`, `/provider/messages/:applicationId`, and `/provider/notifications` workspaces. Application Details links directly to the legitimate thread; contextual Notification destinations are constructed only from validated type/role mappings and stored IDs.
- The inbox uses a two-column desktop layout and a focused list/thread mobile layout with back navigation, bounded pagination, loading/error/empty states, native labeled controls, safe wrapping, semantic unread labels, and no fixed-width content. The header shows real unread badges only when counts are positive and caps visual text at `99+`.
- No WebSocket/polling infrastructure, attachments, Admin chat/moderation, email event delivery, payment fields, or payment processing were added. Review Notifications remain a documented extension rather than an invented Phase 8 trigger.
- Phase 8 adds 12 focused backend and 15 focused frontend communication tests plus two protected-route assertions. The complete suites pass 91/91 backend tests and 68/68 frontend tests; ESLint and the Vite production build also pass.
- A temporary in-memory API exercised Student and Provider sign-in, desktop/mobile inboxes, thread history, sending, explicit Student contact sharing, Provider contact restrictions, Notifications, contextual navigation, mark-all-read, and immediate badge synchronization without modifying MongoDB. Both roles rendered meaningful content at desktop and 390×844, with no console errors, Vite overlay, or horizontal overflow.
- Live MongoDB/SMTP delivery is not claimed without configured external credentials. Model/controller integration is verified with deterministic automated tests, and the temporary browser API is removed after verification.

## Phase 9 implementation status

### Models and shared utilities

- Added the append-only `AdminAudit` model and the single-document `PlatformSetting` model, plus a shared `utils/admin.js` holding the moderation/action/entity enumerations, Settings defaults and allowlist, bounded pagination, bounded search, regex escaping, the moderation-reason rule, the strict field allowlist check, the audit writer, and the Settings reader.
- Extended `User`, `JobProvider`, `Job`, and `Review` with the uniform reversible moderation block described in §3, and added `Job.providerSuspendedAt` so Provider suspension can hide owned Jobs without touching each Job's own moderation state. Supporting compound indexes were added for each moderated collection.

### Admin Dashboard

- `GET /api/admin/dashboard` returns authoritative counts computed by the database: Student and Provider totals split across approved/pending/rejected/suspended; Job totals split across draft/open/closed/archived/hidden; one count per Application lifecycle status; Review total/visible/hidden; the pending registration queue; and the six most recent audit records.
- Communication is reported as `messages` and `notifications` counts only. No Message content, participant, thread, or Application-level Message detail is exposed anywhere in the Admin API or UI, and no Admin Message route exists.
- The frontend renders every group with loading, retryable-error, and empty states, and keeps a fallback renderer for the pre-Phase-9 summary-only response shape.

### Registration Reviews

- The existing Phase 2 approve/reject controller is reused unchanged in its decision logic; Phase 9 added the strict body allowlist, audit integration, and pagination around it. Approval still requires a verified email, repeated or nonsensical transitions still return `409`, and rejection still accepts a trimmed reason of up to 500 characters.
- The merged Student/Provider queue is now bounded. Each collection is read newest-first only as far as the requested page can reach, both totals are counted, and the merged list is sorted and sliced to the page. The page bound for this endpoint is 200 because two collections back one queue; the generic Admin listings keep the 10000 bound. The response adds `pagination` alongside the existing `filters`, `count`, and `registrations` fields, and the Registration Reviews page paginates and resets to page one whenever a filter changes.
- Responses remain the sanitized allowlisted serializers; password and verification-token fields are never present.

### Student and Job Provider administration

- Added paginated, searchable, filterable Admin listings, sanitized detail endpoints, and reversible `active ⇄ suspended` moderation for both account types. Search is bounded to 80 characters and escaped before use in a case-insensitive regex; filters are validated against fixed allowlists.
- Suspension requires a 5–500 character reason; restoration does not. Repeating the current state returns `409`.
- Enforcement is server-side and authoritative: `requireEligibleRuhunaStudent` and `requireApprovedJobProvider` both reject a suspended account, and Student and Provider login reject one as well. A suspended account keeps every Application, Review, Message, and Notification it already had.
- Suspending a Provider stamps `providerSuspendedAt` on all of that Provider's Jobs, which removes them from public browse, public Job Details, and new Applications. Restoring the Provider clears the stamp. Both directions are compensated if the audit write fails.

### Job moderation

- Added an Admin-only paginated Job listing with lifecycle, moderation, archive, and escaped-search filters, an inspection endpoint, and reversible `visible ⇄ hidden` moderation with a required reason on hide.
- Moderated Jobs are excluded from public browse, public Job Details, and Application creation. Provider-facing views still show the Job with its moderation state so the Provider is not silently confused.
- A Provider cannot override moderation. All five moderation fields plus `providerSuspendedAt` are in the Job system-field list, `assertNoSystemFields` runs on both create and update, and the update path assigns only editable fields plus a validated status transition — so editing, publishing, closing, or reopening a Job cannot clear a hide.
- Applications, Reviews, and Message history attached to a hidden Job are preserved. Phase 9 adds no Admin Job-deletion route; Option B Provider archiving remains the only removal path.

### Review moderation

- Added Admin-only reversible `active ⇄ hidden` Review moderation with a required reason on hide, alongside the retained Phase 7 permanent deletion.
- Hidden Reviews are excluded from public Job Reviews, owning-Provider Reviews, and both rating aggregates. The shared aggregation helper filters on `moderationStatus` so a hide or restore immediately produces correct Job and Provider averages and counts, and the operation is compensated and re-recalculated if the audit write fails.
- A Student cannot bypass moderation. There is no Student Review update API at all, and moderation fields are outside every writable set.

### Settings

- Added a Settings read/write pair over exactly three typed allowlisted booleans. Any other field, or any non-boolean value, is rejected with `400`. There is no arbitrary key/value capability and no secret or infrastructure value is stored.
- Settings are authoritative server-side: Student registration, Provider registration, and Job creation each read the current Settings and refuse the action with an explicit code when the relevant policy is closed.
- The singleton is created on first write, every change records a `{ from, to }` diff in an audit record, and a failed audit write removes a newly created singleton or restores the previous field values.

### Audit records

- Every Admin decision across registrations, Student moderation, Provider moderation, Job moderation, Review moderation, Review deletion, and Settings changes writes one audit record. Each writer is wrapped so a failed audit reverses the action it was recording rather than leaving an unaudited change.
- The Admin identity is taken from the verified JWT subject, so a client cannot forge or reassign authorship, and the server supplies the timestamp. Records cannot be edited or deleted through any API.
- Added a bounded, filterable, Admin-only `GET /api/admin/audits`, and a responsive read-only `/admin/audits` Audit Trail page with action and record-type filters, pagination, empty and retryable-error states, and no edit or delete controls. It is reached from the Dashboard activity card and from the Settings audit section; the Settings page keeps its own Settings-scoped history.

### Authorization and security

- `adminRouter` mounts `authenticateToken`, `isAdmin`, and `requireAdminAccount` above every route except `POST /api/admin/login`, so all twenty Admin endpoints require a valid token, an `admin` role claim, and a live re-read of the Admin record. Unauthenticated requests receive `401`; Student and Provider tokens receive `403`.
- Every mutation validates its body against an explicit field allowlist, so system fields such as moderation state, review metadata, ownership, and timestamps cannot be mass-assigned or spoofed.
- Malformed ObjectIds return `404` rather than a cast error, and missing records return `404`.
- Every listing is bounded. Pagination accepts only scalar input before any numeric coercion, so repeated query keys that arrive as arrays are rejected rather than silently coerced; limits are capped at 50. All text filters are length-bounded and regex-escaped, and all enumerated filters are checked against fixed allowlists, so Mongo operator and query injection through Admin filters is not possible.
- Public Admin registration remains unavailable, and no Admin endpoint exposes private Student–Provider Message content.

### Verification

- The complete suites pass **105/105 backend tests** and **86/86 frontend tests across 20 test files**. Phase 9 contributes 14 focused backend tests and 18 focused frontend tests, and extends the existing Phase 2 registration-listing test and Phase 6 Registration Reviews test to the paginated call shape.
- All 47 backend JavaScript files pass `node --check`. Frontend ESLint passes with no errors or warnings, and the Vite production build succeeds. Both `npm audit` runs report zero vulnerabilities. No npm dependency was added in Phase 9.
- A temporary in-memory Admin API exercised the complete browser flow without touching MongoDB. Admin login, the Dashboard, Registration Reviews with pagination and filter reset, Student and Provider administration, account details, Job moderation and inspection, Review moderation, Settings, and the Audit Trail all rendered meaningful data at 1440×900 desktop and 390×844 mobile. Reversible Student suspension and restoration were exercised end to end, including the required-reason confirmation dialog and the resulting audit records. Audit action and record-type filters, pagination, and the empty state behaved correctly, and no edit or delete control exists on that page. Every page reported no horizontal overflow, no Vite error overlay, and no console errors, and the mobile navigation toggle exposed all seven Admin destinations. The temporary API file was removed after verification, matching Phases 6–8.
- Live MongoDB and SMTP behavior is not claimed without configured external credentials. Model and controller integration is verified with deterministic automated tests plus the temporary browser API.

### Deliberate Phase 9 boundaries

- No payment processing, payment status, or payment field of any kind was added.
- No Admin access to private Student–Provider Messages was added; only counts are reported.
- No destructive account deletion and no destructive Job deletion was added. All new moderation is reversible and history-preserving.
- No arbitrary key/value or security-related Settings capability was added.
- No public Admin signup was added.
- No Phase 10 production-hardening work — CORS, Helmet, rate limiting, centralized error handling, password reset, or logging infrastructure — was added.

### Known Phase 9 limitations

- `createAdminAudit` and `getPlatformSettings` short-circuit when `mongoose.connection.readyState === 0` and the model method is still the original, which lets the credential-free test suite run without MongoDB. In a live deployment with a dropped connection this would return default Settings and skip an audit write rather than failing loudly. The practical exposure is small because the preceding document save fails first, but production code is shaped by a test need here. This behavior was intentionally left unchanged in Phase 9 and is carried into Phase 10 as a hardening item.
- The merged registration queue reads `offset + limit` documents per collection, which is correct and bounded but is not index-only pagination. Its page bound is 200 for that reason.
- Provider suspension hides the Provider's Jobs but intentionally does not hide Reviews already written about that Provider, because those Reviews are Student-authored history about completed engagements.
- The Audit Trail is reachable from the Dashboard and Settings rather than from the seven-item Admin navigation, to keep the documented navigation stable.
- Admin actions are audited, but there is no export, retention policy, or tamper-evident chaining over audit records.

## Technology and language audit after Phase 9

- Application code uses JavaScript and JSX only. CSS/Tailwind styling, JSON configuration, Markdown documentation, environment files, and static SVG/PNG/PDF assets are supporting formats rather than additional application languages.
- No `.ts`, `.tsx`, `.py`, `.java`, `.cs`, `.php`, `.go`, `.rb`, or `.rs` application source exists outside dependency/build directories.
- Frontend runtime stack: React, Vite, Tailwind CSS, React Router, Axios, and Lucide React. Frontend development/testing: ESLint, Vitest, React Testing Library, jsdom, Tailwind/Vite React plugins, and React type metadata used by editor/tooling.
- Backend runtime stack: Node.js, Express, MongoDB/Mongoose, bcrypt, JSON Web Token, Nodemailer, dotenv, and the existing body-parser compatibility dependency. Nodemon is the existing development runner even though it is currently listed in runtime dependencies.
- No new npm dependency was required for Phase 8 or Phase 9. The Admin workspace — moderation dialogs, badges, filters, pagination, Settings toggles, and the Audit Trail — uses React, native semantic controls, existing Tailwind utilities, and existing Lucide icons.
- Both npm dependency audits report zero known vulnerabilities, and all 47 backend JavaScript files pass `node --check`.
- `body-parser` is largely redundant with modern Express JSON parsing and `nodemon` would normally be a development dependency, but both predate Phase 6 and remain in use by the existing backend configuration; removing or relocating them was outside this incremental phase.
- The repository remains compliant with the approved straightforward JavaScript/JSX + React/Vite/Tailwind/Axios frontend and JavaScript + Node/Express + MongoDB/Mongoose backend architecture.
