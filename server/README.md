# Bossnet Proceduri API

API privat pentru autentificarea Google Workspace, sesiuni revocabile și directorul organizațional. Rulează cu Node.js 22 prin CloudLinux Node.js Selector și se conectează la PostgreSQL 16 instalat nativ; nu folosește Docker.

## Reguli de securitate

- folosește două roluri DB: unul de migrare/import și unul limitat pentru runtime;
- setează `NODE_ENV=production` și `ALLOW_MOCK_AUTH=false` pe server;
- nu salva workbook-ul, parolele DB sau tokenurile în Git;
- `GOOGLE_CLIENT_ID` este public și trebuie să coincidă între server și aplicația desktop;
- `GOOGLE_CLIENT_SECRET` există numai în mediul privat al API-ului și nu intră în Git sau installer;
- API-ul acceptă numai utilizatori activi importați și ID tokenuri cu `hd=bossnet.ro`.

## Dezvoltare

```bash
npm ci
npm run typecheck
npm run build
```

Migrare și import:

```bash
DATABASE_OWNER_URL='postgresql://...' DATABASE_API_ROLE='rol_api' npm run migrate
DATABASE_OWNER_URL='postgresql://...' npm run import:organization -- /cale/export.xlsx
```

Importul este tranzacțional și idempotent pe ID-urile sursă. Telefoanele cu prefixul `40` sunt normalizate în format E.164 cu `+`, iar în log sunt afișate numai totalurile și un prefix din checksum.

## Endpoint-uri

- `GET /v1/health` — stare API și DB;
- `POST /v1/auth/google` — schimb Authorization Code + PKCE, verificare Google și emitere sesiune 24h;
- `POST /v1/auth/mock` — numai development;
- `GET /v1/session` și `DELETE /v1/session` — validare/revocare;
- `GET /v1/organization` — utilizatori, ierarhie, departamente și apartenențe.
