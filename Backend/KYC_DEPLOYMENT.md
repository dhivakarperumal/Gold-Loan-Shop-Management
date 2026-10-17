# Manual KYC setup and deployment

## What this feature does

The customer KYC workflow is a manual, account-linked document-submission and staff-review process. It does not call a credit bureau, government database, Aadhaar service, or identity-verification provider. The `manual` provider is deliberately the only configured provider; a future provider must be separately authorized and integrated rather than inferred from this manual result.

This account-linked workflow is separate from the `loan_customers.kyc_status` flag and its existing gold-loan customer-management action.

Supported document-type keys are `passport`, `voter_id`, `driving_license`, `pan`, `ration_card`, and `aadhaar`. Aadhaar must only be enabled after the business has confirmed that it is authorized to collect it and has reviewed applicable consent, storage, access, and retention requirements. Do not collect any ID until the applicable KYC rules and authority to collect it have been confirmed.

## Configuration

Set these values in `Backend/.env` (do not commit secrets):

```dotenv
KYC_PROVIDER=manual
KYC_ALLOWED_DOCUMENT_TYPES=passport,voter_id,driving_license,pan,ration_card
KYC_MAX_FILE_SIZE_MB=5
KYC_PRIVACY_NOTICE_VERSION=manual-kyc-v1
```

`KYC_ALLOWED_DOCUMENT_TYPES` must be deliberately set to an approved comma-separated subset of `passport`, `voter_id`, `driving_license`, `pan`, `ration_card`, and `aadhaar`; the default is empty and disables submissions until a policy-approved list is configured. Enable `aadhaar` only if the organization is authorized to collect it and has an applicable privacy/compliance process. `KYC_MAX_FILE_SIZE_MB` is bounded to 1–20 MB per file. Each application accepts up to five PDF, JPEG, and PNG files. Server-side checks inspect the file signature; the browser MIME type and file name are not treated as proof of content.

## Local run and schema

1. Configure the existing MySQL connection settings and `JWT_SECRET` in `Backend/.env`.
2. Set the KYC values above to the document types approved for local testing.
3. Start the backend with `cd Backend` then `npm start`.
4. On startup, the backend creates the additive `kyc_applications`, `kyc_documents`, and `kyc_audit_events` tables if they do not exist, and removes unreferenced staged files older than 24 hours.
5. Start the frontend with `cd Frontend` then `npm run dev`, sign in using a customer (`user`) account, and visit `/account/kyc`. Administrators use `/admin/kyc`.

The MySQL account needs permission to create these tables and indexes and add the nullable provider-reference column if upgrading an earlier KYC schema. Existing account data is not altered. Restart the backend after changing KYC configuration.

## Troubleshooting an empty admin queue

An empty queue means no application has been submitted to the MySQL database configured for this backend. Check that:

1. `KYC_ALLOWED_DOCUMENT_TYPES` is non-empty and contains only policy-approved types; when it is unset or empty, customer submission is intentionally disabled.
2. The customer signs in using an active account with role `user`, visits `/account/kyc`, and sees the upload form rather than the disabled-configuration notice.
3. The customer submits a supported test file and receives the success message. A successful submission creates one pending application and associated document rows.
4. The customer and admin frontend sessions use the same backend `VITE_API_URL`, and the backend is connected to the same database in both sessions.

The admin KYC page shows a configuration warning when the backend reports that no document types are enabled. Do not insert synthetic KYC rows to populate the queue; test through the customer upload flow with dummy files.

## API

Customer endpoints require a valid bearer token for an active `user` account:

- `GET /api/kyc/status` — current application, available document types, limits, consent version.
- `POST /api/kyc` — multipart form with `documents` files, JSON-string `document_types` in matching file order, and `consent=true`.
- `POST /api/kyc/resubmit` — same form; allowed only after `rejected`, `resubmission_required`, or `failed`.
- `GET /api/kyc/documents/:documentId` — owner-only document view; access is audited.

Admin endpoints require an active `admin` session:

- `GET /api/kyc/admin/stats`
- `GET /api/kyc/admin/applications` — `page`, `pageSize` (maximum 100), `status`, `search`, `dateFrom`, `dateTo`.
- `GET /api/kyc/admin/applications/:id`
- `PATCH /api/kyc/admin/applications/:id/review` — JSON `{ "decision": "in_review|verified|rejected|resubmission_required", "reason": "..." }`; rejection and resubmission decisions require a reason.
- `GET /api/kyc/admin/documents/:documentId` — admin-only document view; access is audited.

## Production security and compliance checklist

- KYC files are outside the public `/uploads` tree, stored under `Backend/private_uploads/kyc`, named with random UUIDs, and never served statically. Keep this directory private, encrypted at rest, access-restricted, and excluded from source control. Use private object storage with equivalent authorization if deploying multiple hosts.
- Serve the application only over HTTPS. Configure reverse-proxy request/body size limits and security headers; monitor upload/review errors. The built-in five-attempts-per-hour upload limiter is process-local and resets on restart: replace it with a shared store (for example, Redis) before running multiple backend instances.
- Add malware scanning/quarantine and operational alerting before accepting real identity documents. Signature checks and a private path are not malware scanning.
- Set and enforce a documented retention/deletion schedule, including database rows, file copies, backups, and staff exports. This implementation does not automatically purge submitted applications because no legally reviewed retention schedule was supplied.
- Confirm applicable lender licensing, jurisdiction-specific KYC/AML rules, privacy notices/consent language, data-subject processes, document types, and lawful basis with qualified compliance/legal advisers before production use. The sample notice is not legal advice.
- Manual `verified` means only that an administrator selected that internal status. It is not a government verification or a claim of document authenticity.
- For a future external provider, perform provider/legal/security due diligence, explicitly map provider results and failure states, validate signed callbacks, store provider references without secrets, and add integration tests before changing `KYC_PROVIDER`.
