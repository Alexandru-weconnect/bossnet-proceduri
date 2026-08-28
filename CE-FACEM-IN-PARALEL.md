# Bossnet Proceduri — ce facem în paralel

Acest document separă MVP-ul build-uit de integrările care au nevoie de credențiale, backend sau decizie de business.

## Livrat acum

1. Shell Tauri 2 pentru Windows, cu system tray și installer `.exe`.
2. Identitate vizuală proprie Bossnet: icon hexagonal, negru, alb și gold.
3. Login mock `@bossnet.ro`, limitat la development; fluxul Google Workspace PKCE și Client ID-ul Desktop al organizației sunt configurate, în așteptarea testului interactiv cu un cont real.
4. Dashboard compact: `Proiect nou` / `Proiecte existente`.
5. Inițializare proiect pe cele două rute din knowledge base: `CLONE` și `NEW`.
6. Rezumat procedural pentru Discovery, Preview, QA și Shopify.
7. Reglaje persistente pentru opacitate, gradient, blur, grilă și estompare la inactivitate.
8. Regulă nativă „mereu deasupra” și fundal Windows stabil, fără colțuri albe.
9. Notificări in-app cu istoric și notificări native Windows configurabile.
10. PostgreSQL 16 nativ, schemă `bossnet`, sesiuni revocabile și API Node.js separat.
11. Import validat din workbook pentru utilizatori, ierarhie, telefoane, departamente și apartenențe.
12. Ecran `Echipă` care încarcă directorul numai după autentificare.
13. Rubrică separată `Debug`, cu dropdown, search, carduri, date picker simplu/range, icon-uri SVG Lucide, textarea și WYSIWYG.

## Fluxul paralel 1 — activarea Google OAuth real

- se creează un client OAuth de tip **Desktop app** într-un proiect aflat sub organizația Google Workspace Bossnet;
- ecranul de consimțământ are audiența **Internal** și scope-urile `openid`, `email`, `profile`;
- autentificarea deja se deschide în browserul sistemului și folosește PKCE, state și nonce;
- API-ul schimbă Authorization Code-ul folosind PKCE și Client Secret-ul păstrat exclusiv server-side;
- backend-ul verifică semnătura, `iss`, `aud`, expirarea, nonce, `email_verified` și `hd=bossnet.ro`;
- contul trebuie să corespundă unui utilizator activ din PostgreSQL;
- logoutul revocă sesiunea opacă de 24h pe server.
- Client ID-ul Desktop este configurat atât în API, cât și în build-ul Windows; Client Secret-ul este folosit numai de API și nu intră în aplicația publică.

Rămas pentru validarea finală: testul interactiv cu un cont real importat `@bossnet.ro`, plus verificarea politicii **Internal** din Google Auth Platform.

## Fluxul paralel 2 — proiecte și proceduri sincronizate

- extindem API-ul și schema PostgreSQL deja create;
- definim roluri: operator, reviewer, admin;
- migrăm knowledge base-ul în documente versionate;
- salvăm Project Specification, gate-uri, aprobări și evidence pack;
- adăugăm sincronizare și mod offline controlat.

## Fluxul paralel 3 — distribuție fără avertisment

Build-ul actual este public și nesemnat. Pentru eliminarea avertismentului SmartScreen este necesar un certificat Windows code-signing valid, configurat ca GitHub Secret. Tokenurile și certificatul nu intră niciodată în repository.

## Decizii vizuale intenționate

Referința Lamborghini cere suprafețe fără gradient. Cerința de proiect cere explicit overlay transparent și gradient. Rezultatul păstrează negrul absolut, gold-ul exclusiv pentru acțiuni, geometria angulară și cardurile fără radius, dar folosește gradient numai ca atmosferă în fundal. Controalele și CTA-urile rămân plate și precise.

## Definition of done pentru următoarea versiune

- OAuth testat cu un cont real `@bossnet.ro`, un utilizator Bossnet neimportat și un cont extern respins;
- sesiune revocabilă și expirare verificată server-side;
- listă de proiecte sincronizată între două dispozitive;
- procedurile sunt versionate și pot primi status/aprobare;
- installer semnat și verificat pe Windows 10 și Windows 11.
