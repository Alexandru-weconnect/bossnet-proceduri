# Bossnet Proceduri

Aplicație desktop Tauri 2 pentru pornirea și urmărirea proiectelor Bossnet. Interfața este compactă, folosește un limbaj vizual nocturn, geometric și include un strat transparent configurabil.

Versiunea publică `0.4.0` folosește Client ID-ul Google Desktop corectat și adaugă un laborator separat `Debug` pentru verificarea componentelor în WebView2. PostgreSQL nativ, API-ul securizat și directorul organizațional rămân integrate; datele personale nu intră în repository sau în executabil.

## Descărcare Windows

- [Descarcă Bossnet Proceduri 0.4.0 — x64 installer `.exe`](https://github.com/Alexandru-weconnect/bossnet-proceduri/releases/download/v0.4.0/Bossnet.Proceduri_0.4.0_x64-setup.exe)
- [Pagina release-ului și notele versiunii](https://github.com/Alexandru-weconnect/bossnet-proceduri/releases/tag/v0.4.0)

## Inclus în versiunea 0.4.0

- login Google Workspace `@bossnet.ro` în browserul sistemului, cu Authorization Code și PKCE;
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

> Client ID-ul Google Desktop este configurat în installer și în API. Acceptanța interactivă trebuie făcută cu un cont activ `@bossnet.ro` care există în directorul importat.

## Arhitectura 0.4.0

```text
Aplicația Windows
  └─ Google OAuth în browserul sistemului (Authorization Code + PKCE)
      └─ API Bossnet / HTTPS
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

```bash
npm install
npm run tauri dev
```

Copiază `.env.example` în `.env.local` și completează URL-ul API plus Client ID-ul Google Desktop. Client ID-ul nu este secret; parolele DB și tokenurile nu se pun în fișierele frontend.

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

Aplicația păstrează local tokenul opac al sesiunii Bossnet, expirarea, identitatea afișată, preferințele de interfață/notificare și proiectele mock. ID tokenul Google și parolele nu sunt persistate. Sesiunea este validată și poate fi revocată de API.

Installerul public este nesemnat în această etapă, deci Windows SmartScreen poate afișa „Unknown publisher”. Certificarea oficială este pasul separat documentat în roadmap.
