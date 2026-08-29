# Bossnet Proceduri

Aplicație desktop Tauri 2 pentru pornirea și urmărirea proiectelor Bossnet. Interfața este compactă, folosește un limbaj vizual nocturn, geometric și include un strat transparent configurabil.

Versiunea `0.4.4` adaugă o scară tipografică configurabilă 10 / 12 / 14 px, cu valoarea implicită compactă de 10 px, și separă dezvoltarea zilnică React de buildurile Tauri. Loginul Windows, notificările native și integrarea PostgreSQL rămân active.

## Descărcare Windows

- [Descarcă Bossnet Proceduri 0.4.4 — x64 installer `.exe`](https://github.com/Alexandru-weconnect/bossnet-proceduri/releases/download/v0.4.4/Bossnet.Proceduri_0.4.4_x64-setup.exe)
- [Pagina release-ului și notele versiunii](https://github.com/Alexandru-weconnect/bossnet-proceduri/releases/tag/v0.4.4)

SHA-256: `f3e4fb5b2d7c939c3eb7154e502f4bd6a5794460da9991e4c340c58f666ee99a`

## Inclus în versiunea 0.4.4

- notificările Windows sunt trimise printr-o comandă Rust nativă, fără starea de permisiune volatilă a WebView2;
- testul de notificare confirmă livrarea nativă și explică exact unde trebuie permisă aplicația dacă Windows o blochează;
- loginul afișează „PROCEDURI INTERNE” și „Last update: v0.4 MAHMURIA”;
- câmpul email, explicația introductivă și eticheta PKCE au fost eliminate din loginul de producție;
- cardul păstrează doar acțiunea Google și mesajul „Doar utilizatorii bossnet sunt autorizati”;
- fontul minim este configurabil la 10, 12 sau 14 px și se păstrează după repornire;
- valoarea implicită este 10 px, iar ierarhia vizuală originală a textelor rămâne intactă;
- cardurile, rândurile, formularele și panourile se adaptează dinamic la scala aleasă;
- preview-ul React are login local rapid ca `alexandru@bossnet.ro` / `admin`, fără token de producție;
- loginul și meniul lateral răspund corect la fereastra minimă 820×580;
- cardurile Director folosesc două coloane, cu emailul pe rând complet, fără suprapuneri;
- login Google Workspace `@bossnet.ro` în browserul sistemului, cu Authorization Code și PKCE;
- schimbul codului Google este făcut de API cu credentialul server-side, fără Client Secret în executabil;
- stări distincte pentru browser/callback/server și timeout-uri explicite în locul unui ecran aparent blocat;
- sesiune opacă server-side de 24 de ore, revocabilă și cu expirare automată;
- API HTTPS conectat la PostgreSQL 16 nativ, fără Docker;
- director organizațional protejat cu utilizatori, ierarhie, departamente și telefoane importate;
- login mock disponibil numai în development și dezactivat în installer;
- dashboard cu punctele de intrare **Proiect nou** și **Proiecte existente**;
- rubrică separată **Debug**, încărcată la cerere, cu dropdown, search și carduri interactive;
- date picker simplu și range, icon-uri SVG Lucide, textarea controlată și editor WYSIWYG cu toolbar;
- formular de inițializare pentru rutele Bossnet `NEW` și `CLONE`;
- proiecte salvate local și rezumat al procedurilor Shopify;
- inputuri editabile corect în WebView2/Windows;
- preseturi pentru opacitate, gradient și blur, persistente local;
- reguli overlay pentru grilă, estompare la inactivitate și fereastră mereu deasupra;
- notificări integrate în aplicație, istoric local și toast-uri native Windows;
- fundal nativ negru, fără colțuri albe în zonele geometrice decupate;
- icon dedicat pentru executabil, taskbar și system tray;
- închiderea ferestrei o ascunde în tray; aplicația se oprește din meniul tray;
- installer Windows NSIS generat în GitHub Actions.

> Client ID-ul Google Desktop este configurat în installer și în API. Client Secret-ul este configurat numai în mediul privat al API-ului, nu în Git, frontend sau installer.

## Arhitectura 0.4.4

```text
Aplicația Windows
  └─ Google OAuth în browserul sistemului (Authorization Code + PKCE)
      └─ API Bossnet / HTTPS
          ├─ schimbă codul temporar folosind credentialul Google server-side
          ├─ verifică ID token, nonce, audiență și hosted domain bossnet.ro
          ├─ emite o sesiune opacă, revocabilă, valabilă 24h
          └─ citește PostgreSQL nativ de pe server
```

- schema: `bossnet` în baza `teambossnet_bossnet_proceduri`;
- rolul API are numai accesul necesar pentru director și sesiuni;
- un cont Google primește acces numai dacă este `@bossnet.ro`, este verificat de Google și există ca utilizator activ importat;
- telefoanele, ierarhia și departamentele sunt servite numai după validarea sesiunii;
- loginul mock există exclusiv în development și este dezactivat în producție.

## Dezvoltare

Pentru lucru zilnic pe interfața React, pornește numai Vite. Ai refresh imediat și un login local de preview, fără compilarea Rust/Tauri:

```bash
npm install
npm run dev:web
```

Deschide adresa afișată de Vite (local `http://localhost:1420`, prin tunel `https://proceduri-dev.teambossnet.ro`) și apasă **DESCHIDE PREVIEW REACT**. Preview-ul pornește implicit ca `alexandru@bossnet.ro`, cu rol `admin`. Funcțiile strict native — notificările Windows, tray-ul și callback-ul OAuth Desktop — se verifică separat, la milestone-uri:

```bash
npm run dev:desktop
```

Copiază `.env.example` în `.env.local` și completează URL-ul API plus Client ID-ul Google Desktop. `VITE_PREVIEW_EMAIL` și `VITE_PREVIEW_SYSTEM_ROLE` stabilesc identitatea mock folosită numai în preview-ul web. Client ID-ul nu este secret; Client Secret-ul, parolele DB și tokenurile nu se pun în fișierele frontend.

Pentru autentificare Google reală direct în browser este necesar un client OAuth separat de tip **Web application**. Clientul Desktop existent rămâne dedicat aplicației Tauri; JSON-ul și `client_secret` nu se copiază în React.

Build frontend:

```bash
npm run build
```

Build desktop:

```bash
npm run tauri build
```

Backend:

```bash
cd server
npm ci
npm run typecheck
npm run build
```

Instrucțiunile pentru migrare și import sunt în `server/README.md`. Workbook-ul cu utilizatori nu trebuie copiat în repository.

Activarea contului Google este documentată pas cu pas în [`GOOGLE-OAUTH-SETUP.md`](GOOGLE-OAUTH-SETUP.md).

## Securitate și date

Aplicația păstrează local tokenul opac al sesiunii Bossnet, expirarea, identitatea afișată, preferințele de interfață/notificare și proiectele mock. Codul Google, PKCE verifier-ul, ID tokenul și parolele nu sunt persistate. Sesiunea este validată și poate fi revocată de API.

Installerul public este nesemnat în această etapă, deci Windows SmartScreen poate afișa „Unknown publisher”. Certificarea oficială este pasul separat documentat în roadmap.
