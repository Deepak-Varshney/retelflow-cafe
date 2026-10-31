# RetelFlow Cafe app icon

Replace these two files with your own artwork (keep the same file names):

| File | Size | What it is |
|---|---|---|
| `icon.png` | 1024 x 1024 PNG | Main icon (iOS, Play Store, older Android). Square, no transparency. |
| `adaptive-icon.png` | 1024 x 1024 PNG, transparent background | Android adaptive icon foreground. Keep the logo inside the centre ~66% (about 680 x 680) — Android crops the edges into circle/squircle shapes. |

The adaptive icon background colour is set in `app.json` → `expo.android.adaptiveIcon.backgroundColor` (currently `#070a13`).

The icon only changes in a new build (`eas build -p android --profile preview`); Expo Go and over-the-air updates keep the old icon.
