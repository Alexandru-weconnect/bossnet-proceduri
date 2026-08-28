# Google Workspace OAuth — Bossnet Proceduri

Aplicația folosește Authorization Code cu PKCE în browserul sistemului. Pentru un client de tip Desktop, Client ID-ul este public, iar aplicația nu trebuie să păstreze un Client Secret.

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
8. Copiază valoarea **Client ID**, care se termină în `.apps.googleusercontent.com`.

Pentru un client Desktop, callback-ul pe IP loopback `127.0.0.1` și port dinamic este mecanismul corect; nu trebuie creat un redirect web fix pentru aplicația Tauri.

## Ce trebuie trimis pentru activare

Trimite numai:

```text
GOOGLE_DESKTOP_CLIENT_ID=000000000000-xxxxxxxxxxxxxxxx.apps.googleusercontent.com
```

Client ID-ul nu este secret și poate fi transmis în conversație. Nu trimite Client Secret, parola Google, cookie-uri sau coduri 2FA.

Valoarea este configurată în două locuri:

- API: `GOOGLE_CLIENT_ID`;
- workflow-ul GitHub Actions: `VITE_GOOGLE_CLIENT_ID`, ca identificator public inclus în build.

Ambele trebuie să fie identice. Client ID-ul primit pentru aplicația Desktop a fost configurat la 28 august 2026; Client Secret-ul din fișierul descărcat nu este utilizat și nu intră în repository, API sau installer. Urmează construirea și testarea interactivă a installerului `0.3.0`.

## Dacă organizația blochează aplicația

În [Google Admin Console](https://admin.google.com/), mergi la **Security → Access and data control → API controls → Manage third-party app access** și marchează clientul ca trusted/allowed pentru utilizatorii Bossnet. Pentru scope-urile de bază este posibil să nu fie necesar acest pas, în funcție de politica organizației.

## Test final

- cont activ importat `@bossnet.ro` → acces permis;
- cont `@bossnet.ro` care nu există în director → acces respins;
- cont extern → acces respins;
- logout → sesiune revocată;
- după 24h → sesiune expirată automat.

Referințe oficiale: [audiență Internal în Google Workspace](https://support.google.com/cloud/answer/15549945?hl=en), [crearea clientului OAuth Desktop](https://support.google.com/cloud/answer/15549257?hl=en), [loopback redirect pentru aplicații desktop](https://developers.google.com/identity/protocols/oauth2/resources/loopback-migration), [practici OAuth și PKCE](https://developers.google.com/identity/protocols/oauth2/resources/best-practices), [validarea ID tokenului](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
