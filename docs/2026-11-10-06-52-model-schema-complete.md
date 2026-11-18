\# Racetify Database Schema Design



This schema is designed for Racetify as a multi-tenant race-event management platform. It supports road running, trail running, event registration, race management, event crews, photo galleries, AI face recognition, bib OCR, certificate generation, and race timing.



Database: PostgreSQL\\

Primary keys: UUID\\

Multi-tenancy: Organization-based\\

Vector database: Qdrant (store embeddings externally, PostgreSQL stores references and metadata).



\# 1. Authentication \& Authorization



\## Users (`users`)



Stores user accounts across the entire platform.



| Column            | Type         | Description                              |

| ----------------- | ------------ | ---------------------------------------- |

| id                | UUID         | Primary key                              |

| first\_name        | VARCHAR(100) | Given name                               |

| last\_name         | VARCHAR(100) | Family name; nullable or empty          |

| name              | VARCHAR(255) | Display name derived from the two parts  |

| email             | VARCHAR(255) | Unique email                             |

| email\_verified\_at | TIMESTAMP    | Email verification                       |

| password          | VARCHAR      | Hashed password, nullable for OAuth-only |

| phone             | VARCHAR(30)  | Phone number                             |

| avatar\_url        | TEXT         | Profile picture                          |

| status            | VARCHAR(20)  | active, suspended, deleted               |

| last\_login\_at     | TIMESTAMP    | Last login                               |

| created\_at        | TIMESTAMP    |                                          |

| updated\_at        | TIMESTAMP    |                                          |

| deleted\_at        | TIMESTAMP    | Soft delete                              |



\## Social Accounts (`social\_accounts`)



Stores connected social authentication providers.



| Column           | Type         | Description               |

| ---------------- | ------------ | ------------------------- |

| id               | UUID         | Primary key               |

| user\_id          | UUID         | FK → users.id             |

| provider         | VARCHAR(50)  | google, apple, facebook   |

| provider\_user\_id | VARCHAR(255) | Provider's unique user ID |

| provider\_email   | VARCHAR(255) | Email from provider       |

| access\_token     | TEXT         | Encrypted token, nullable |

| refresh\_token    | TEXT         | Encrypted token, nullable |

| expires\_at       | TIMESTAMP    | Token expiration          |

| created\_at       | TIMESTAMP    |                           |

| updated\_at       | TIMESTAMP    |                           |



Constraints:



\- UNIQUE(provider, provider\_user\_id)

\- Index(user\_id)



\## Roles (`roles`)



Defines system roles and custom organization roles.



| Column      | Type         | Description            |

| ----------- | ------------ | ---------------------- |

| id          | UUID         | Primary key            |

| org\_id      | UUID         | FK → orgs.id, nullable |

| name        | VARCHAR(100) | Role name              |

| slug        | VARCHAR(100) | Unique within scope    |

| scope       | VARCHAR(20)  | system, org, event     |

| description | TEXT         | Role description       |

| is\_system   | BOOLEAN      | System-defined role    |

| created\_at  | TIMESTAMP    |                        |

| updated\_at  | TIMESTAMP    |                        |



Examples:



\- `system:superadmin`

\- `org:owner`

\- `org:admin`

\- `org:editor`

\- `event:admin`

\- `event:photographer`

\- `event:volunteer`



Rules:



\- `org\_id = NULL` for system roles.

\- Organization custom roles must have `org\_id`.

\- Event-level roles should belong to the organization that owns the event.

\- System roles cannot be modified by tenants.



\## Permissions (`permissions`)



Defines individual permissions available throughout Racetify.



| Column      | Type         | Description     |

| ----------- | ------------ | --------------- |

| id          | UUID         | Primary key     |

| name        | VARCHAR(150) | Permission name |

| resource    | VARCHAR(50)  | Resource/module |

| action      | VARCHAR(50)  | Allowed action  |

| description | TEXT         | Description     |

| created\_at  | TIMESTAMP    |                 |



Examples:



```

org:settings:view

org:settings:update

org:members:view

org:members:invite

org:members:manage



org:events:view

org:events:create

org:events:update

org:events:delete



event:settings:update

event:races:manage

event:participants:view

event:participants:manage

event:gallery:view

event:gallery:upload

event:gallery:delete

event:certificates:generate

event:results:manage

event:timing:manage

```



\## Role Permissions (`role\_permissions`)



Many-to-many relationship between roles and permissions.



| Column        | Type      | Description         |

| ------------- | --------- | ------------------- |

| id            | UUID      | Primary key         |

| role\_id       | UUID      | FK → roles.id       |

| permission\_id | UUID      | FK → permissions.id |

| created\_at    | TIMESTAMP |                     |



Constraint: UNIQUE(role\_id, permission\_id).



\## User Role Assignments (`user\_roles`)



Optional table for assigning global system roles directly to users.



| Column     | Type      | Description   |

| ---------- | --------- | ------------- |

| id         | UUID      | Primary key   |

| user\_id    | UUID      | FK → users.id |

| role\_id    | UUID      | FK → roles.id |

| created\_at | TIMESTAMP |               |



Organization and event roles should be assigned through their respective membership tables rather than this table.



\# 2. Organization Management



\## Organizations (`orgs`)



Represents a tenant in Racetify.



| Column      | Type         | Description                 |

| ----------- | ------------ | --------------------------- |

| id          | UUID         | Primary key                 |

| name        | VARCHAR(255) | Organization name           |

| slug        | VARCHAR(100) | Unique slug                 |

| logo\_url    | TEXT         | Organization logo           |

| description | TEXT         | Description                 |

| email       | VARCHAR(255) | Contact email               |

| phone       | VARCHAR(30)  | Contact phone               |

| website     | TEXT         | Website                     |

| status      | VARCHAR(20)  | active, suspended, archived |

| created\_at  | TIMESTAMP    |                             |

| updated\_at  | TIMESTAMP    |                             |

| deleted\_at  | TIMESTAMP    |                             |



\## Organization Members (`org\_members`)



Stores users who belong to an organization.



| Column     | Type        | Description                |

| ---------- | ----------- | -------------------------- |

| id         | UUID        | Primary key                |

| org\_id     | UUID        | FK → orgs.id               |

| user\_id    | UUID        | FK → users.id              |

| role\_id    | UUID        | FK → roles.id              |

| status     | VARCHAR(20) | invited, active, suspended |

| joined\_at  | TIMESTAMP   |                            |

| created\_at | TIMESTAMP   |                            |

| updated\_at | TIMESTAMP   |                            |



Constraints:



\- UNIQUE(org\_id, user\_id).

\- `role\_id` must reference a system role or a role belonging to the same organization.



An organization can have multiple members, and a user can belong to multiple organizations.



\# 3. Event Management



\## Events (`events`)



Stores race events owned by an organization.



| Column                | Type          | Description                                     |

| --------------------- | ------------- | ----------------------------------------------- |

| id                    | UUID          | Primary key                                     |

| org\_id                | UUID          | FK → orgs.id                                    |

| name                  | VARCHAR(255)  | Event name                                      |

| slug                  | VARCHAR(150)  | Event slug                                      |

| description           | TEXT          | Event description                               |

| short\_description     | TEXT          | Short description                               |

| logo\_url              | TEXT          | Event logo                                      |

| cover\_url             | TEXT          | Cover image                                     |

| start\_date            | DATE          | Event start date                                |

| end\_date              | DATE          | Event end date                                  |

| registration\_start\_at | TIMESTAMP     | Registration opening                            |

| registration\_end\_at   | TIMESTAMP     | Registration closing                            |

| timezone              | VARCHAR(50)   | Event timezone                                  |

| location              | VARCHAR(255)  | Venue name                                      |

| status                | VARCHAR(20)   | draft, published, ongoing, completed, cancelled |

| created\_at            | TIMESTAMP     |                                                 |

| updated\_at            | TIMESTAMP     |                                                 |

| deleted\_at            | TIMESTAMP     |                                                 |



Constraints:



\- UNIQUE(org\_id, slug).

\- Every event belongs to exactly one organization.



\## Event Races (`races`)



Represents individual race categories or distances within an event.



| Column           | Type          | Description              |

| ---------------- | ------------- | ------------------------ |

| id               | UUID          | Primary key              |

| event\_id         | UUID          | FK → events.id           |

| name             | VARCHAR(150)  | Marathon, 7K Fun Trail   |

| slug             | VARCHAR(100)  | Race slug                |

| description      | TEXT          | Description              |

| distance         | DECIMAL(10,2) | Distance in kilometers   |

| elevation\_gain   | INTEGER       | Elevation gain in meters |

| start\_time       | TIMESTAMP     | Race start time          |

| cut\_off\_duration | INTEGER       | Cutoff duration in minutes from race start |

| max\_participants | INTEGER       | Registration capacity    |

| status           | VARCHAR(20)   | draft, published, closed |

| sort\_order       | INTEGER       | Display ordering         |

| created\_at       | TIMESTAMP     |                          |

| updated\_at       | TIMESTAMP     |                          |



\## Race Categories (`race\_categories`)



Represents divisions within a race.



Examples:



\- Male Open

\- Female Open

\- Male Master

\- Female Master

\- Junior



| Column     | Type         | Description               |

| ---------- | ------------ | ------------------------- |

| id         | UUID         | Primary key               |

| race\_id    | UUID         | FK → races.id             |

| name       | VARCHAR(150) | Category name             |

| code       | VARCHAR(50)  | Category code             |

| gender     | VARCHAR(20)  | male, female, mixed, open |

| min\_age    | SMALLINT     | Minimum age               |

| max\_age    | SMALLINT     | Maximum age               |

| quota      | INTEGER      | Category quota            |

| sort\_order | INTEGER      | Ordering                  |

| created\_at | TIMESTAMP    |                           |

| updated\_at | TIMESTAMP    |                           |



\## Event Team (`event\_team`)



Users assigned to specific events with specific roles.



| Column     | Type        | Description                |

| ---------- | ----------- | -------------------------- |

| id         | UUID        | Primary key                |

| event\_id   | UUID        | FK → events.id             |

| user\_id    | UUID        | FK → users.id              |

| role\_id    | UUID        | FK → roles.id              |

| status     | VARCHAR(20) | invited, active, suspended |

| joined\_at  | TIMESTAMP   |                            |

| created\_at | TIMESTAMP   |                            |

| updated\_at | TIMESTAMP   |                            |



Constraints:



\- UNIQUE(event\_id, user\_id).

\- The role must be an event-level role or an applicable system role.



A user can be:



\- Organization Admin in Organization A.

\- Photographer in Event A.

\- Event Admin in Event B.

\- Photographer in Event C.



Event team membership does not automatically grant organization membership.



\# 4. Participant \& Registration Management



I recommend separating participants from registrations because one participant may register for multiple events over time.



\## Participants (`participants`)



Stores participant information within an event.



| Column                  | Type         | Description                            |

| ----------------------- | ------------ | -------------------------------------- |

| id                      | UUID         | Primary key                            |

| event\_id                | UUID         | FK → events.id                         |

| user\_id                 | UUID         | FK → users.id, nullable                |

| first\_name              | VARCHAR(150) | First name                             |

| last\_name               | VARCHAR(150) | Last name                              |

| email                   | VARCHAR(255) | Email                                  |

| phone                   | VARCHAR(30)  | Phone                                  |

| gender                  | VARCHAR(20)  | Gender                                 |

| birth\_date              | DATE         | Date of birth                          |

| nationality             | VARCHAR(100) | Nationality                            |

| country\_code            | VARCHAR(5)   | Country code                           |

| identity\_number         | VARCHAR(100) | Identity number, nullable              |

| emergency\_contact\_name  | VARCHAR(255) | Emergency contact                      |

| emergency\_contact\_phone | VARCHAR(30)  | Emergency phone                        |

| created\_at              | TIMESTAMP    |                                        |

| updated\_at              | TIMESTAMP    |                                        |



\## Registrations (`registrations`)



Connects participants to specific races and categories.



| Column              | Type        | Description                             |

| ------------------- | ----------- | --------------------------------------- |

| id                  | UUID        | Primary key                             |

| event\_id            | UUID        | FK → events.id                          |

| race\_id             | UUID        | FK → races.id                           |

| category\_id         | UUID        | FK → race\_categories.id, nullable       |

| participant\_id      | UUID        | FK → participants.id                    |

| registration\_number | VARCHAR(50) | Registration number                     |

| bib\_number          | VARCHAR(50) | Assigned bib                            |

| bib\_name            | VARCHAR(50) |                            |

| status              | VARCHAR(20) | pending, confirmed, cancelled, refunded |

| registered\_at       | TIMESTAMP   | Registration time                       |

| confirmed\_at        | TIMESTAMP   | Confirmation time                       |

| created\_at          | TIMESTAMP   |                                         |

| updated\_at          | TIMESTAMP   |                                         |



Constraints:



\- UNIQUE(event\_id, registration\_number).

\- UNIQUE(race\_id, bib\_number), allowing nullable bib numbers before assignment.



\## Orders (`orders`)



Stores checkout and payment orders.



| Column          | Type        | Description                                 |

| --------------- | ----------- | ------------------------------------------- |

| id              | UUID        | Primary key                                 |

| event\_id        | UUID        | FK → events.id                              |

| user\_id         | UUID        | FK → users.id                               |

| order\_number    | VARCHAR(50) | Unique order number                         |

| subtotal        | BIGINT      | Subtotal in IDR                             |

| discount\_amount | BIGINT      | Discount                                    |

| platform\_fee    | BIGINT      | Platform fee                                |

| total\_amount    | BIGINT      | Total                                       |

| currency        | VARCHAR(3)  | IDR                                         |

| status          | VARCHAR(20) | pending, paid, expired, cancelled, refunded |

| expires\_at      | TIMESTAMP   | Payment expiration                          |

| paid\_at         | TIMESTAMP   | Payment time                                |

| created\_at      | TIMESTAMP   |                                             |

| updated\_at      | TIMESTAMP   |                                             |



\## Order Items (`order\_items`)



| Column          | Type      | Description                 |

| --------------- | --------- | --------------------------- |

| id              | UUID      | Primary key                 |

| order\_id        | UUID      | FK → orders.id              |

| registration\_id | UUID      | FK → registrations.id       |

| unit\_price      | BIGINT    | Price                       |

| quantity        | INTEGER   | Quantity                    |

| subtotal        | BIGINT    | Subtotal                    |

| created\_at      | TIMESTAMP |                             |



\## Payments (`payments`)



Stores payment transactions and gateway responses.



| Column             | Type         | Description                                 |

| ------------------ | ------------ | ------------------------------------------- |

| id                 | UUID         | Primary key                                 |

| order\_id           | UUID         | FK → orders.id                              |

| provider           | VARCHAR(50)  | Midtrans, DOKU                              |

| provider\_reference | VARCHAR(255) | Gateway reference                           |

| payment\_method     | VARCHAR(50)  | QRIS, VA, transfer                          |

| amount             | BIGINT       | Payment amount                              |

| status             | VARCHAR(20)  | pending, success, failed, expired, refunded |

| paid\_at            | TIMESTAMP    | Payment time                                |

| raw\_response       | JSONB        | Gateway response                            |

| created\_at         | TIMESTAMP    |                                             |

| updated\_at         | TIMESTAMP    |                                             |



\# 5. Gallery \& Media Management



\## Storage Provider (`storage\_providers`)



| Column        | Type         | Description             |

| ------------- | ------------ | ----------------------- |

| id            | UUID         | Primary key             |

| name          | VARCHAR      |   			 |

| type          | VARCHAR      | "local", "s3", "gcs"    |

| bucket        | VARCHAR      |   			 |

| visibility    | VARCHAR      | "public", "private"     |

| is\_default    | BOOLEAN      | false                   |

| is\_active     | BOOLEAN      | true                    |

| config        | JSONB        |                         |





\## Storage Objects (`storage\_objects`)



Centralized storage metadata for uploaded files. This is important because gallery images, watermarks, fonts, certificates, and other files may share the same storage infrastructure.



| Column        | Type         | Description             |

| ------------- | ------------ | ----------------------- |

| id            | UUID         | Primary key             |

| org\_id        | UUID         | FK → orgs.id, nullable  |

| uploaded\_by   | UUID         | FK → users.id           |

| provider\_id   | UUID         | FK → storage\_providers.id |

| object\_key    | TEXT         | Storage object key      |

| original\_name | VARCHAR(255) | Original filename       |

| mime\_type     | VARCHAR(100) | MIME type               |

| extension     | VARCHAR(20)  | File extension          |

| size          | BIGINT       | File size               |

| width         | INTEGER      | Image width             |

| height        | INTEGER      | Image height            |

| created\_at    | TIMESTAMP    |                         |

| updated\_at    | TIMESTAMP    |                         |



Constraint: UNIQUE(provider\_id, object\_key).



\## gallery Items (`gallery\_items`)



Stores event gallery photos and potentially videos in the future.



| Column          | Type        | Description                                        |

| --------------- | ----------- | -------------------------------------------------- |

| id              | UUID        | Primary key                                        |

| event\_id        | UUID        | FK → events.id                                     |

| photographer\_id | UUID        | FK → users.id                                      |

| storage\_object\_id | UUID        | FK → storage\_objects.id                              |

| collection\_id   | UUID        | FK → gallery\_collections.id, nullable              |

| type            | VARCHAR(20) | image, video                                       |

| status          | VARCHAR(20) | uploading, processing, published, failed, archived |

| captured\_at     | TIMESTAMP   | Capture date                                       |

| published\_at    | TIMESTAMP   | Publish date                                       |

| metadata        | JSONB       | Additional metadata                                |

| created\_at      | TIMESTAMP   |                                                    |

| updated\_at      | TIMESTAMP   |                                                    |



\## gallery Collection (`gallery\_collections`)



Organizes gallery items into collections.



| Column                | Type         | Description                     |

| --------------------- | ------------ | ------------------------------- |

| id                    | UUID         | Primary key                     |

| event\_id              | UUID         | FK → events.id                  |

| name                  | VARCHAR(255) | collection name                 |

| slug                  | VARCHAR(150) | collection slug                 |

| description           | TEXT         | Description                     |

| cover\_gallery\_item\_id | UUID         | FK → gallery\_items.id, nullable |

| is\_public             | BOOLEAN      | Public visibility               |

| sort\_order            | INTEGER      | Ordering                        |

| created\_at            | TIMESTAMP    |                                 |

| updated\_at            | TIMESTAMP    |                                 |



\## gallery Item Bibs (`gallery\_item\_bibs`)



Stores OCR results for bib numbers detected in gallery photos.



| Column          | Type         | Description                      |

| --------------- | ------------ | -------------------------------- |

| id              | UUID         | Primary key                      |

| gallery\_item\_id | UUID         | FK → gallery\_items.id            |

| bib\_text        | VARCHAR(50)  | OCR original text                |

| bib\_number      | BIGINT       | Normalized numeric bib, nullable |

| confidence      | DECIMAL(5,4) | OCR confidence                   |

| source          | VARCHAR(20)  | ocr, manual                      |

| is\_verified     | BOOLEAN      | Manually verified                |

| created\_at      | TIMESTAMP    |                                  |

| updated\_at      | TIMESTAMP    |                                  |



Example:



| bib\_text | bib\_number |

| -------- | ---------- |

| 00123    | 123        |

| A-123    | NULL       |

| 123B     | NULL       |



Keep `bib\_text` as the original value. Do not force all bibs to be numeric.



\## gallery Item Faces (`gallery\_item\_faces`)



Stores detected face metadata and Qdrant references.



| Column          | Type         | Description           |

| --------------- | ------------ | --------------------- |

| id              | UUID         | Primary key           |

| gallery\_item\_id | UUID         | FK → gallery\_items.id |

| qdrant\_point\_id | UUID         | Qdrant point ID       |

| face\_index      | INTEGER      | Face index in image   |

| bounding\_box    | JSONB        | Face coordinates      |

| confidence      | DECIMAL(5,4) | Detection confidence  |

| created\_at      | TIMESTAMP    |                       |



Do not store face vectors directly in PostgreSQL.



\# 6. Watermark \& Generator Management



\## Watermarks (`watermarks`)



Stores watermark configurations per event.



| Column          | Type         | Description                     |

| --------------- | ------------ | ------------------------------- |

| id              | UUID         | Primary key                     |

| event\_id        | UUID         | FK → events.id                  |

| name            | VARCHAR(150) | Watermark name                  |

| storage\_object\_id | UUID         | FK → storage\_objects.id, nullable |

| scope           | VARCHAR(20)  | gallery, certificate            |

| type            | VARCHAR(20)  | image, text                     |

| position        | VARCHAR(30)  | center, top\_left, bottom\_right  |

| opacity         | DECIMAL(5,4) | Opacity                         |

| scale           | DECIMAL(8,4) | Scale                           |

| rotation        | DECIMAL(8,2) | Rotation                        |

| repeat\_mode     | VARCHAR(20)  | none, tiled                     |

| settings        | JSONB        | Additional configuration        |

| is\_default      | BOOLEAN      | Default watermark               |

| created\_at      | TIMESTAMP    |                                 |

| updated\_at      | TIMESTAMP    |                                 |



\## Generator Templates (`generator\_templates`)



Stores templates for bib and certificate generators.



| Column           | Type          | Description            |

| ---------------- | ------------- | ---------------------- |

| id               | UUID          | Primary key            |

| event\_id         | UUID          | FK → events.id         |

| name             | VARCHAR(150)  | Template name          |

| scope            | VARCHAR(30)   | bib, certificate       |

| format           | VARCHAR(20)   | svg, json              |

| template\_content | TEXT          | SVG or template source |

| width            | DECIMAL(10,2) | Width                  |

| height           | DECIMAL(10,2) | Height                 |

| unit             | VARCHAR(10)   | mm, px                 |

| version          | INTEGER       | Template version       |

| created\_at       | TIMESTAMP     |                        |

| updated\_at       | TIMESTAMP     |                        |



Use SVG or structured JSON for template content. Avoid storing generated files directly in this table.



\## Fonts (`fonts`)



Stores custom fonts for bib and certificate generators.



| Column          | Type         | Description            |

| --------------- | ------------ | ---------------------- |

| id              | UUID         | Primary key            |

| name            | VARCHAR(150) | Font name              |

| family          | VARCHAR(150) | Font family            |

| weight          | VARCHAR(20)  | 400, 500, 700          |

| style           | VARCHAR(20)  | normal, italic         |

| storage\_object\_id | UUID         | FK → storage\_objects.id |

| format          | VARCHAR(20)  | ttf, otf, woff2        |

| status          | VARCHAR(20)  | active, disabled       |

| created\_at      | TIMESTAMP    |                        |

| updated\_at      | TIMESTAMP    |                        |



Fonts can be organization-scoped and reused across events.



\## Generated Documents (`generated\_documents`)



Tracks generated bibs and certificates.



| Column          | Type        | Description                            |

| --------------- | ----------- | -------------------------------------- |

| id              | UUID        | Primary key                            |

| event\_id        | UUID        | FK → events.id                         |

| template\_id     | UUID        | FK → generator\_templates.id            |

| type            | VARCHAR(30) | bib, certificate                       |

| storage\_object\_id | UUID      | FK → storage\_objects.id                |

| status          | VARCHAR(20) | pending, processing, completed, failed |

| generated\_at    | TIMESTAMP   |                                        |

| created\_at      | TIMESTAMP   |                                        |

| updated\_at      | TIMESTAMP   |                                        |



\# 7. Certificate Management



\## Certificates (`certificates`)



Stores issued certificates for participants.



| Column             | Type         | Description                 |

| ------------------ | ------------ | --------------------------- |

| id                 | UUID         | Primary key                 |

| event\_id           | UUID         | FK → events.id              |

| participant\_id     | UUID         | FK → participants.id        |

| registration\_id    | UUID         | FK → registrations.id       |

| template\_id        | UUID         | FK → generator\_templates.id |

| certificate\_number | VARCHAR(100) | Unique certificate number   |

| storage\_object\_id  | UUID         | FK → storage\_objects.id     |

| status             | VARCHAR(20)  | pending, issued, revoked    |

| issued\_at          | TIMESTAMP    | Issue date                  |

| revoked\_at         | TIMESTAMP    | Revocation date             |

| created\_at         | TIMESTAMP    |                             |

| updated\_at         | TIMESTAMP    |                             |



Constraint: UNIQUE(event\_id, certificate\_number).



\# 8. Face Recognition \& Enrollment



\## Face Enrollments (`face\_enrollments`)



Stores enrolled face profiles for user or organization ownership.



I recommend explicitly distinguishing ownership rather than using an ambiguous `ref\_id`.



| Column       | Type         | Description                        |

| ------------ | ------------ | ---------------------------------- |

| id           | UUID         | Primary key                        |

| user\_id      | UUID         | FK → users.id, nullable            |

| org\_id       | UUID         | FK → orgs.id, nullable             |

| ref\_id       | VARCHAR      | org id reference                   |

| status       | VARCHAR(20)  | pending, active, rejected, deleted |

| consented\_at | TIMESTAMP    | Consent timestamp                  |

| revoked\_at   | TIMESTAMP    | Consent revocation                 |

| created\_at   | TIMESTAMP    |                                    |

| updated\_at   | TIMESTAMP    |                                    |



Rules:



\- Exactly one of `user\_id` or `org\_id` must be populated.

\- User enrollment is private to the user.

\- Organization enrollment is managed by the organization.

\- Store explicit consent and deletion records.



\## Face Enrollment Images (`face\_enrollment\_images`)



Stores source images used for enrollment.



| Column          | Type        | Description                |

| --------------- | ----------- | -------------------------- |

| id              | UUID        | Primary key                |

| enrollment\_id   | UUID        | FK → face\_enrollments.id   |

| storage\_object\_id | UUID        | FK → storage\_objects.id      |

| status          | VARCHAR(20) | pending, processed, failed |

| created\_at      | TIMESTAMP   |                            |



\## Face Embeddings (`face\_embeddings`)



Stores references to face vectors in Qdrant.



| Column            | Type         | Description              |

| ----------------- | ------------ | ------------------------ |

| id                | UUID         | Primary key              |

| enrollment\_id     | UUID         | FK → face\_enrollments.id |

| qdrant\_collection | VARCHAR(150) | Collection name          |

| qdrant\_point\_id   | UUID         | Qdrant point ID          |

| created\_at        | TIMESTAMP    |                          |



Constraint: UNIQUE(qdrant\_collection, qdrant\_point\_id).



Qdrant stores the actual embedding vector. PostgreSQL stores its reference and associated metadata.



\# 9. Notifications \& Invitations



\## Notifications (`notifications`)



Stores user notifications.



| Column     | Type         | Description          |

| ---------- | ------------ | -------------------- |

| id         | UUID         | Primary key          |

| user\_id    | UUID         | FK → users.id        |

| type       | VARCHAR(100) | Notification type    |

| title      | VARCHAR(255) | Notification title   |

| message    | TEXT         | Notification message |

| data       | JSONB        | Additional payload   |

| read\_at    | TIMESTAMP    | Read timestamp       |

| created\_at | TIMESTAMP    |                      |



\## Invitations (`invitations`)



A unified invitation system for organization members and event team members.



| Column      | Type         | Description                         |

| ----------- | ------------ | ----------------------------------- |

| id          | UUID         | Primary key                         |

| org\_id      | UUID         | FK → orgs.id                        |

| event\_id    | UUID         | FK → events.id, nullable            |

| email       | VARCHAR(255) | Invitee email                       |

| role\_id     | UUID         | FK → roles.id                       |

| invited\_by  | UUID         | FK → users.id                       |

| token\_hash  | VARCHAR(255) | Hashed invitation token             |

| status      | VARCHAR(20)  | pending, accepted, expired, revoked |

| expires\_at  | TIMESTAMP    | Expiration                          |

| accepted\_at | TIMESTAMP    | Acceptance                          |

| created\_at  | TIMESTAMP    |                                     |

| updated\_at  | TIMESTAMP    |                                     |



Rules:



\- `event\_id = NULL` means organization membership invitation.

\- `event\_id != NULL` means event team invitation.

\- The event must belong to the specified organization.

\- Validate role scope and organization ownership.

\- Invitations should use cryptographically random tokens; store only their hashes.



\# 10. Race Timing \& Results



\## Race Results (`race\_results`)



Stores calculated participant results.



| Column          | Type        | Description               |

| --------------- | ----------- | ------------------------- |

| id              | UUID        | Primary key               |

| race\_id         | UUID        | FK → races.id             |

| registration\_id | UUID        | FK → registrations.id     |

| gun\_time        | BIGINT      | Gun time in milliseconds  |

| chip\_time       | BIGINT      | Chip time in milliseconds |

| finish\_time     | TIMESTAMP   | Finish timestamp          |

| overall\_rank    | INTEGER     | Overall rank              |

| gender\_rank     | INTEGER     | Gender rank               |

| category\_rank   | INTEGER     | Category rank             |

| status          | VARCHAR(20) | finished, dns, dnf, dq    |

| is\_official     | BOOLEAN     | Official result           |

| published\_at    | TIMESTAMP   | Publication               |

| created\_at      | TIMESTAMP   |                           |

| updated\_at      | TIMESTAMP   |                           |



\# 11. Additional Supporting Tables



These tables are recommended for a production SaaS platform.



\## Audit Logs (`audit\_logs`)



Tracks important actions across the platform.



| Column        | Type         | Description              |

| ------------- | ------------ | ------------------------ |

| id            | UUID         | Primary key              |

| org\_id        | UUID         | FK → orgs.id, nullable   |

| event\_id      | UUID         | FK → events.id, nullable |

| user\_id       | UUID         | FK → users.id, nullable  |

| action        | VARCHAR(150) | Action performed         |

| resource\_type | VARCHAR(100) | Resource type            |

| resource\_id   | UUID         | Resource ID              |

| ip\_address    | INET         | Client IP                |

| user\_agent    | TEXT         | User agent               |

| metadata      | JSONB        | Additional data          |

| created\_at    | TIMESTAMP    |                          |





\## Webhooks (`webhooks`)



Stores external integrations and webhook configurations.



| Column     | Type        | Description              |

| ---------- | ----------- | ------------------------ |

| id         | UUID        | Primary key              |

| org\_id     | UUID        | FK → orgs.id             |

| event\_id   | UUID        | FK → events.id, nullable |

| url        | TEXT        | Destination URL          |

| secret     | TEXT        | Encrypted signing secret |

| events     | JSONB       | Subscribed events        |

| status     | VARCHAR(20) | active, disabled         |

| created\_at | TIMESTAMP   |                          |

| updated\_at | TIMESTAMP   |                          |



\## Webhook Deliveries (`webhook\_deliveries`)



Tracks webhook delivery attempts.



| Column          | Type         | Description        |

| --------------- | ------------ | ------------------ |

| id              | UUID         | Primary key        |

| webhook\_id      | UUID         | FK → webhooks.id   |

| event\_type      | VARCHAR(100) | Event type         |

| payload         | JSONB        | Payload            |

| response\_status | INTEGER      | HTTP status        |

| attempts        | INTEGER      | Attempt count      |

| next\_retry\_at   | TIMESTAMP    | Retry time         |

| delivered\_at    | TIMESTAMP    | Delivery timestamp |

| created\_at      | TIMESTAMP    |                    |



\## Jobs (`jobs`)



Tracks asynchronous processing tasks.



| Column        | Type         | Description                            |

| ------------- | ------------ | -------------------------------------- |

| id            | UUID         | Primary key                            |

| org\_id        | UUID         | FK → orgs.id, nullable                 |

| event\_id      | UUID         | FK → events.id, nullable               |

| type          | VARCHAR(100) | Task type                              |

| resource\_type | VARCHAR(100) | Related resource                       |

| resource\_id   | UUID         | Related resource ID                    |

| payload       | JSONB        | Job payload                            |

| status        | VARCHAR(20)  | pending, processing, completed, failed |

| attempts      | INTEGER      | Retry count                            |

| error         | TEXT         | Last error                             |

| started\_at    | TIMESTAMP    |                                        |

| completed\_at  | TIMESTAMP    |                                        |

| created\_at    | TIMESTAMP    |                                        |

| updated\_at    | TIMESTAMP    |                                        |



\# 12. Relationship Overview



\# 13. Important Database Design Rules



These are the conventions I recommend adopting across Racetify.



\### A. Multi-tenancy



Every tenant-owned resource must be associated with an organization directly or through its parent resource.



For example:



```

orgs

&#x20; └── events

&#x20;      ├── races

&#x20;      │    └── race\_categories

&#x20;      ├── participants

&#x20;      │    └── registrations

&#x20;      ├── gallery\_items

&#x20;      ├── watermarks

&#x20;      └── generator\_templates

```



For tenant isolation:



\- Validate `org\_id` for every tenant operation.

\- Never trust an `org\_id` supplied by the frontend without authorization checks.

\- Use PostgreSQL RLS where appropriate.

\- Ensure child records cannot reference resources belonging to another tenant.



\### B. Role \& Permission System



Use RBAC (Role-Based Access Control).



```

User

&#x20;├── Organization Member

&#x20;│    └── Organization Role

&#x20;│         └── Permissions

&#x20;│

&#x20;└── Event Team

&#x20;     └── Event Role

&#x20;          └── Permissions

```



Authorization should consider the resource context, not just the role name.



For example:



```

Can user upload photos to Event A?



1\. Check whether user is an event team member.

2\. Resolve the assigned role.

3\. Resolve role permissions.

4\. Check event ownership and resource scope.

5\. Allow or deny.

```



\### C. Storage Storage



Keep binary files outside PostgreSQL.



```

PostgreSQL

&#x20; └── storage\_objects

&#x20;      ├── object\_key

&#x20;      ├── bucket

&#x20;      └── metadata



Cloudflare R2

&#x20; └── actual binary files

```



Use `storage\_objects` for original images, watermarks, fonts, certificates, and generated files.



\### D. AI Face Recognition



Keep face vectors in Qdrant and references in PostgreSQL.



```

PostgreSQL

&#x20; ├── face\_enrollments

&#x20; ├── face\_enrollment\_images

&#x20; ├── face\_embeddings

&#x20; └── gallery\_item\_faces



Qdrant

&#x20; ├── enrolled\_faces

&#x20; └── gallery\_faces

```



Use stable UUID point IDs and maintain a deletion workflow to synchronize PostgreSQL and Qdrant.



\### E. Database Conventions



| Convention        | Recommendation                                               |

| ----------------- | ------------------------------------------------------------ |

| Primary key       | UUID                                                         |

| Foreign key       | UUID                                                         |

| Table naming      | snake\_case, plural                                           |

| Column naming     | snake\_case                                                   |

| Timestamps        | timestamptz                                                  |

| Currency          | BIGINT in smallest currency unit                             |

| Flexible settings | JSONB                                                        |

| Soft delete       | deleted\_at where necessary                                   |

| Status            | VARCHAR with application validation or PostgreSQL ENUM       |

| Indexes           | Foreign keys, unique constraints, frequently queried columns |



\# 14. Recommended Final Module Structure



For Racetify, I would organize the database into these logical modules:



| Module           | Main Tables                                                                          |

| ---------------- | ------------------------------------------------------------------------------------ |

| Authentication   | users, social\_accounts                                                               |

| Authorization    | roles, permissions, role\_permissions, user\_roles                                     |

| Organization     | orgs, org\_members, invitations                                                       |

| Event Management | events, races, race\_categories, event\_team                                           |

| Registration     | participants, registrations, orders, order\_items, payments                           |

| Gallery          | gallery\_items, gallery\_albums, gallery\_item\_bibs, gallery\_item\_faces                 |

| Storage          | storage\_provider, storage\_objects                                                    |

| Watermark        | watermarks                                                                           |

| Generator        | generator\_templates, fonts, generated\_documents                                      |

| Certificate      | certificates                                                                         |

| Face Recognition | face\_enrollments, face\_enrollment, face\_embeddings                                   |

| Timing           | race\_results                                                                         |

| Notification     | notifications                                                                        |

| Integration      | webhooks, webhook\_deliveries                                                         |

| System           | audit\_logs, jobs                                                                     |



\## My recommendations before implementation



There are five architectural decisions worth settling before creating migrations:



1\. Participants vs Users: Keep them separate. A participant does not need a Racetify account to register for a race.

2\. Organization vs Event Roles: Keep `org\_members` and `event\_team` separate because event crews do not necessarily belong to the organization.

3\. Storage Objects: Use one centralized storage metadata table rather than creating separate file tables for every module.

4\. Face Enrollment: Separate user-owned and organization-owned enrollments, with explicit consent and revocation.

5\. Registration vs Participants: Separate registration transactions from participant profiles to support multiple races and repeat registrations.



This provides a foundation that can grow from a simple race registration platform into a complete race-event SaaS ecosystem.

