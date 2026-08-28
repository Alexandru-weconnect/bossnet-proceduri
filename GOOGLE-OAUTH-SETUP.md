# Google Workspace OAuth — Bossnet Proceduri

Aplicația folosește Authorization Code cu PKCE în browserul sistemului. Client ID-ul Desktop este public și intră în build. Pentru clientul Bossnet curent, endpointul Google solicită și Client Secret la schimbul codului; acesta este păstrat numai în mediul privat al API-ului și nu intră în aplicația Windows sau în repository.

## Contul necesar

Intră în Google Cloud cu un cont `@bossnet.ro` care este:

- Google Workspace Super Admin; sau
- membru al organizației Cloud Bossnet cu drepturile `Project Creator` și `OAuth Config Editor`/`Owner` pe proiect.

Nu trimite parola contului Google. Dacă în pagina de audiență nu apare opțiunea **Internal**, proiectul nu este creat sub organizația Google Workspace Bossnet sau contul nu are drepturile necesare.

## Configurare în Google Cloud Console

1. Deschide [Create a project](https://console.cloud.google.com/projectcreate).
2. La **Organization**, selectează organizația care administrează domeniul `bossnet.ro`.
3. Creează proiectul `Bossnet Proceduri`.
4. Deschide [Google Auth Platform → Branding](https://console.cloud.google.com/auth/branding):
   - App name: `Bossnet Proceduri`;
   - User support email: o adresă administrativă `@bossnet.ro`;
   - Developer contact: o adresă administrativă `@bossnet.ro`.
5. Deschide [Google Auth Platform → Audience](https://console.cloud.google.com/auth/audience) și selectează **Internal**.
6. În **Data Access**, păstrează numai `openid`, `email` și `profile`. Nu sunt necesare Gmail, Drive sau Admin SDK.
7. Deschide [Google Auth Platform → Clients](https://console.cloud.google.com/auth/clients), apoi **Create client**:
   - Application type: **Desktop app**;
   - Name: `Bossnet Proceduri Windows`.
8. Descarcă fișierul JSON al clientului. **Client ID** este configurat în build, iar **Client Secret** este configurat separat în secret store-ul API-ului.

Pentru un client Desktop, callback-ul pe IP loopback `127.0.0.1` și port dinamic este mecanismul corect; nu trebuie creat un redirect web fix pentru aplicația Tauri.

## Ce trebuie trimis pentru activare

Pentru build este necesară numai valoarea publică:

```text
GOOGLE_DESKTOP_CLIENT_ID=000000000000-xxxxxxxxxxxxxxxx.apps.googleusercontent.com
```

Client ID-ul nu este secret. Client Secret-ul se încarcă direct în mediul securizat al API-ului; nu se commit-uiește, nu se pune în GitHub Actions și nu se include în executabil. Nu transmite parola Google, cookie-uri sau coduri 2FA.

Configurația este împărțită astfel:

- API: `GOOGLE_CLIENT_ID`;
- API secret store: `GOOGLE_CLIENT_SECRET`;
- workflow-ul GitHub Actions: `VITE_GOOGLE_CLIENT_ID`, ca identificator public inclus în build.

Client ID-ul din API și cel din build trebuie să fie identice. Credentialul Desktop corectat a fost configurat la 28 august 2026; Client Secret-ul este prezent numai în mediul Passenger al API-ului. Installerul `0.4.3` nu îl conține.

## Dacă organizația blochează aplicația

În [Google Admin Console](https://admin.google.com/), mergi la **Security → Access and data control → API controls → Manage third-party app access** și marchează clientul ca trusted/allowed pentru utilizatorii Bossnet. Pentru scope-urile de bază este posibil să nu fie necesar acest pas, în funcție de politica organizației.

## Test final

- cont activ importat `@bossnet.ro` → acces permis;
- cont `@bossnet.ro` care nu există în director → acces respins;
- cont extern → acces respins;
- logout → sesiune revocată;
- după 24h → sesiune expirată automat.

Referințe oficiale: [audiență Internal în Google Workspace](https://support.google.com/cloud/answer/15549945?hl=en), [crearea clientului OAuth Desktop](https://support.google.com/cloud/answer/15549257?hl=en), [loopback redirect pentru aplicații desktop](https://developers.google.com/identity/protocols/oauth2/resources/loopback-migration), [practici OAuth și PKCE](https://developers.google.com/identity/protocols/oauth2/resources/best-practices), [validarea ID tokenului](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
