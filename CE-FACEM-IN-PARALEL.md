# Bossnet Proceduri — ce facem în paralel

Acest document separă MVP-ul build-uit de integrările care au nevoie de credențiale, backend sau decizie de business.

## Livrat acum

1. Shell Tauri 2 pentru Windows, cu system tray și installer `.exe`.
2. Identitate vizuală proprie Bossnet: icon hexagonal, negru, alb și gold.
3. Login mock `@bossnet.ro`, sesiune locală cu TTL de 24h și logout.
4. Dashboard compact: `Proiect nou` / `Proiecte existente`.
5. Inițializare proiect pe cele două rute din knowledge base: `CLONE` și `NEW`.
6. Rezumat procedural pentru Discovery, Preview, QA și Shopify.
7. Reglaje persistente pentru opacitate, gradient, blur, grilă și estompare la inactivitate.
8. Regulă nativă „mereu deasupra” și fundal Windows stabil, fără colțuri albe.
9. Notificări in-app cu istoric și notificări native Windows configurabile.

## Fluxul paralel 1 — Google OAuth real

- se creează client OAuth în Google Cloud pentru organizația Bossnet;
- autentificarea se face în browserul sistemului cu PKCE, nu într-un formular intern;
- backend-ul verifică `iss`, `aud`, expirarea tokenului și domeniul/hosted domain;
- accesul este acceptat numai dacă emailul verificat se termină în `@bossnet.ro`;
- refresh/revocare și logout sunt gestionate server-side;
- sesiunea aplicației rămâne de 24h, dar nu se bazează pe `localStorage` ca autoritate.

Necesare: `GOOGLE_CLIENT_ID`, redirect URI aprobat și endpoint Bossnet pentru schimbul/verificarea tokenului.

## Fluxul paralel 2 — sursa reală pentru proiecte și proceduri

- alegem API-ul și baza de date;
- definim roluri: operator, reviewer, admin;
- migrăm knowledge base-ul în documente versionate;
- salvăm Project Specification, gate-uri, aprobări și evidence pack;
- adăugăm sincronizare și mod offline controlat.

## Fluxul paralel 3 — distribuție fără avertisment

Build-ul actual este public și nesemnat. Pentru eliminarea avertismentului SmartScreen este necesar un certificat Windows code-signing valid, configurat ca GitHub Secret. Tokenurile și certificatul nu intră niciodată în repository.

## Decizii vizuale intenționate

Referința Lamborghini cere suprafețe fără gradient. Cerința de proiect cere explicit overlay transparent și gradient. Rezultatul păstrează negrul absolut, gold-ul exclusiv pentru acțiuni, geometria angulară și cardurile fără radius, dar folosește gradient numai ca atmosferă în fundal. Controalele și CTA-urile rămân plate și precise.

## Definition of done pentru următoarea versiune

- OAuth testat cu un cont real `@bossnet.ro` și cu un cont extern respins;
- sesiune revocabilă și expirare verificată server-side;
- listă de proiecte sincronizată între două dispozitive;
- procedurile sunt versionate și pot primi status/aprobare;
- installer semnat și verificat pe Windows 10 și Windows 11.
