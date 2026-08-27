# Bossnet Proceduri

Aplicație desktop Tauri 2 pentru pornirea și urmărirea proiectelor Bossnet. Interfața este compactă, folosește un limbaj vizual nocturn, geometric și include un strat transparent configurabil.

## Descărcare Windows

- [Descarcă Bossnet Proceduri 0.2.0 — x64 installer `.exe`](https://github.com/Alexandru-weconnect/bossnet-proceduri/releases/download/v0.2.0/Bossnet.Proceduri_0.2.0_x64-setup.exe)
- [Pagina release-ului și notele versiunii](https://github.com/Alexandru-weconnect/bossnet-proceduri/releases/tag/v0.2.0)

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

> Loginul curent este intenționat un mock de test. Nu este o măsură reală de autentificare. Integrarea Google OAuth și validarea domeniului pe server sunt descrise în `CE-FACEM-IN-PARALEL.md`.

## Dezvoltare

```bash
npm install
npm run tauri dev
```

Build frontend:

```bash
npm run build
```

Build desktop:

```bash
npm run tauri build
```

## Securitate și date

Versiunea de test păstrează local doar emailul, expirarea sesiunii, preferințele de interfață/notificare și proiectele mock. Cheile de storage sunt versionate. Nu sunt stocate tokenuri Google sau parole.

Installerul public este nesemnat în această etapă, deci Windows SmartScreen poate afișa „Unknown publisher”. Certificarea oficială este pasul separat documentat în roadmap.
