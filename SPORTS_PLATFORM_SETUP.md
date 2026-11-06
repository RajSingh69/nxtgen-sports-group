# NXT Gen Sports Platform Setup

This is the Phase 1 foundation for the private NXT Gen Sports Platform. It is separate from the keynote/speaker booking Firebase project.

## 1. Architecture Overview

The platform is a static GitHub Pages-compatible ES module application. It does not use React, Next.js, Vue, Vite, webpack, or a build step.

Core principles:

- no public registration
- no social feed or messaging in Phase 1
- relationship-based athlete access
- private athlete/development data by default
- child-safety and safeguarding architecture from day one
- separate Firebase project from the keynote booking system

Firebase project intended for this platform:

```text
nxt-gen-sports-platform
```

## 2. Routes

Athlete/private app:

```text
/sports-platform/login/
/sports-platform/
/sports-platform/profile/
/sports-platform/development/
/sports-platform/team/
/sports-platform/settings/
```

Management app:

```text
/sports-admin/
/sports-admin/athletes/
/sports-admin/teams/
/sports-admin/organisations/
/sports-admin/safeguarding/
```

All routes are private. Unauthenticated users are redirected to `/sports-platform/login/` by the client, and Firestore rules deny unauthorised data access server-side.

## 3. Firebase Separation

Existing keynote booking Firebase files remain at the repository root:

```text
.firebaserc
firebase.json
firestore.rules
firestore.indexes.json
```

Sports Platform Firebase files live separately:

```text
firebase-sports-platform/.firebaserc
firebase-sports-platform/firebase.json
firebase-sports-platform/firestore.rules
firebase-sports-platform/firestore.indexes.json
```

Do not run a blind `firebase deploy` from the wrong directory. Deploy the sports platform from `firebase-sports-platform/` only.

## 4. Firebase Web Config

Sports Platform browser config lives in:

```text
js/sports-platform-firebase-config.js
```

It contains the Firebase Web App config for the `nxt-gen-sports-platform` Firebase project. This is normal browser client configuration, not an Admin SDK credential.

Do not add service-account credentials or private keys.

## 5. Roles

Implemented role foundation:

- `athlete`
- `guardian`
- `coach`
- `manager`
- `organisation`
- `moderator`
- `admin`

Organisation accounts are represented as users with role/membership records rather than treating every organisation document as a login account. This keeps staff permissions explicit and easier to extend.

## 6. Firestore Schema

### `users/{uid}`

Authentication profile and role metadata.

Suggested fields:

```json
{
  "displayName": "Rajan",
  "email": "admin@example.com",
  "role": "admin",
  "active": true,
  "athleteId": null,
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

Athlete users should include `athleteId` when linked to an athlete profile.

### `athletes/{athleteId}`

Private athlete profile foundation.

Suggested fields:

```json
{
  "firstName": "Asha",
  "lastName": "Singh",
  "displayName": "Asha Singh",
  "dateOfBirth": "2011-05-18",
  "gender": "",
  "country": "India",
  "region": "",
  "city": "",
  "sport": "Football",
  "primaryPosition": "Midfielder",
  "secondaryPositions": [],
  "preferredFoot": "",
  "currentTeam": "",
  "academy": "",
  "squad": "",
  "shirtNumber": null,
  "height": null,
  "weight": null,
  "biography": "",
  "developmentStage": "foundation",
  "status": "active",
  "profilePhoto": "",
  "joinedAt": "Timestamp",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

Phase 1 does not create public athlete profiles. Future NXT Gen Social should use an explicit public/community profile projection, not this full private record.

### `teams/{teamId}`

```json
{
  "name": "U15 Development Squad",
  "sport": "Football",
  "ageGroup": "U15",
  "country": "India",
  "region": "",
  "city": "",
  "organisationId": "",
  "season": "2026/27",
  "active": true,
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

### `organisations/{organisationId}`

```json
{
  "name": "NXT Gen Sports Group",
  "type": "NXT Gen",
  "country": "United Kingdom",
  "region": "",
  "city": "",
  "website": "",
  "verified": true,
  "active": true,
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

### Relationship Collections

Relationship collections are explicit so access can be enforced in Firestore Rules.

Recommended document IDs:

```text
guardianAthleteLinks/{guardianUid}_{athleteId}
athleteCoachAssignments/{coachUid}_{athleteId}
athleteManagerAssignments/{managerUid}_{athleteId}
teamMembers/{teamId}_{athleteId}
organisationMembers/{organisationId}_{userUid}
```

Relationship fields should include:

```json
{
  "athleteId": "athlete_123",
  "guardianUid": "uid_here",
  "relationshipType": "parent",
  "active": true,
  "verificationStatus": "pending",
  "consentStatus": "not_started",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

Use the relevant UID field for coach/manager/organisation relationships.

### `safeguardingReports/{reportId}`

```json
{
  "reporterUid": "uid_here",
  "subjectUid": "uid_or_blank",
  "athleteId": "athlete_or_blank",
  "category": "safeguarding concern",
  "description": "",
  "status": "new",
  "priority": "standard",
  "assignedTo": "",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp",
  "resolvedAt": null
}
```

Categories may include inappropriate contact, bullying/harassment, concerning content, impersonation, safeguarding concern, spam, and other.

### `auditLogs/{auditId}`

For administrative actions such as role changed, athlete assigned, guardian linked, coach assigned, profile status changed, report status changed, or organisation verified.

Do not log passwords, tokens, or highly sensitive field contents.

## 7. Access Model

Firestore rules enforce access server-side.

Athlete:

- can read own `users/{uid}`
- can read own athlete profile where `users/{uid}.athleteId` matches
- cannot read unrelated athletes

Guardian:

- can read own user profile
- can read athletes explicitly linked through active `guardianAthleteLinks`

Coach:

- can read athletes explicitly assigned through active `athleteCoachAssignments`

Manager:

- can read and manage athletes explicitly assigned through active `athleteManagerAssignments`

Organisation:

- foundation membership exists through `organisationMembers`
- organisation membership does not automatically grant broad athlete access

Moderator:

- can read/update safeguarding reports
- does not automatically need access to every private development field

Admin:

- full platform administration access

## 8. Authentication Setup

Enable Firebase Authentication email/password in the new `nxt-gen-sports-platform` project.

There is no public sign-up button. Create users manually until a safe onboarding workflow is designed.

## 9. First Admin Setup

1. Create Firebase project `nxt-gen-sports-platform`.
2. Enable Authentication > Email/Password.
3. Create the first admin user manually in Firebase Authentication.
4. Copy the Auth UID.
5. Create Firestore document `users/{ADMIN_UID}`:

```json
{
  "displayName": "Rajan",
  "email": "your-email@example.com",
  "role": "admin",
  "active": true,
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

6. Replace placeholders in `js/sports-platform-firebase-config.js` with the Sports Platform web app config.
7. Deploy rules and indexes from `firebase-sports-platform/`.

## 10. Deployment Commands

From the sports Firebase config directory:

```powershell
cd "C:\Users\rajan\NxtGen Website\firebase-sports-platform"
firebase deploy --only firestore:rules,firestore:indexes --project nxt-gen-sports-platform
```

Do not deploy from the repository root for Sports Platform resources.

## 11. Indexes

Current Phase 1 queries require indexes for:

- athletes ordered by `updatedAt desc`
- guardian links by `guardianUid + active`
- coach assignments by `coachUid + active`
- manager assignments by `managerUid + active`
- organisation members by `userUid + active`
- safeguarding reports by `status + updatedAt desc`

These are defined in `firebase-sports-platform/firestore.indexes.json`.

## 12. Future Athlete Onboarding

Future onboarding should include:

- admin/manager-created athlete profile
- invitation workflow
- guardian link workflow for minors
- verification state
- consent state
- privacy boundary between private management profile and future community profile

Do not add public registration until that workflow exists.

## 13. Safeguarding Architecture

Phase 1 includes private safeguarding report storage and moderator/admin access rules. It intentionally does not implement unrestricted messaging, public social posting, or adult-to-child contact.

Future phases should add:

- report creation UI
- report assignment workflow
- audit timeline
- moderation queues
- blocking/reporting integration for social features
- consent and guardian notification workflows where appropriate

## 14. Intentionally Deferred

- social feed, posts, comments, likes/reactions
- public athlete profiles
- messaging/live chat
- opportunity marketplace
- scout access
- payments/subscriptions
- detailed nutrition/medical/mental-health systems
- performance analytics and AI recommendations
- video uploads
- public registration
- Google/Apple sign-in
- legal consent workflow
- contracts/e-signatures