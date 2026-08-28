# Bossnet Proceduri

Aplicație desktop Tauri 2 pentru pornirea și urmărirea proiectelor Bossnet. Interfața este compactă, folosește un limbaj vizual nocturn, geometric și include un strat transparent configurabil.

Versiunea în lucru `0.3.0` adaugă PostgreSQL nativ, un API Node.js separat, autentificare Google Workspace cu PKCE și directorul organizațional. Datele personale sunt importate direct în baza de date și nu intră în repository sau în executabil.

## Descărcare Windows

- [Descarcă Bossnet Proceduri 0.2.0 — x64 installer `.exe`](https://github.com/Alexandru-weconnect/bossnet-proceduri/releases/download/v0.2.0/Bossnet.Proceduri_0.2.0_x64-setup.exe)
- [Pagina release-ului și notele versiunii](https://github.com/Alexandru-weconnect/bossnet-proceduri/releases/tag/v0.2.0)

SHA-256: `9e807436776c5e7e376de2aff74b1142999262c1227630bef18b29ed317c314e`

## Inclus în versiunea 0.2.0

- login mock pentru orice adresă `@bossnet.ro`;
- sesiune locală de 24 de ore, cu expirare automată;
- dashboard cu punctele de intrare **Proiect nou** și **Proiecte existente**;
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

> Installerul `0.2.0` de mai sus rămâne versiunea publică de test. Noua versiune nu se publică până când Client ID-ul Google Workspace nu este configurat și testat.

## Arhitectura 0.3.0

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
