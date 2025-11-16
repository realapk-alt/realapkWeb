# ApkLit - Single-file React + Tailwind (Firebase-backed)

This repository contains a single static `index.html` implementing a responsive app listing UI,
dark/light theme toggle, and an admin dashboard (access via `/#adminsecret`) that uses
Firebase Firestore to store apps and the admin password.

## Files in this ZIP
- `index.html` — single-file React + Tailwind app (edit FIREBASE_CONFIG inside)
- `README.md` — this file
- `firebase.rules` — suggested Firestore rules
- `.gitignore` — minimal

## Setup & Host (step-by-step)

1. **Create Firebase Project**
   - Go to https://console.firebase.google.com/ and create a new project.
   - Add a Web app and copy the Firebase config object.

2. **Enable Firestore**
   - In the Firebase Console -> Firestore Database -> Create database.
   - For testing, you can start in test mode. For production, use secure rules.

3. **Set FIREBASE_CONFIG**
   - Open `index.html` and replace the `FIREBASE_CONFIG` placeholder values with your project's config.

4. **Optional: Configure Firestore Security Rules**
   - See `firebase.rules` in this ZIP for a minimal example. Deploy or test in console.

5. **Push to GitHub**
   - Create a new repo, add files, commit and push.
   - Enable GitHub Pages: Repository Settings -> Pages -> Source: `main` branch `/ (root)`.

6. **Open the site**
   - Visit `https://<username>.github.io/<repo>/`
   - To access Admin panel: append `/#adminsecret` to URL. First-time it will create `meta/admin` with password `admin123` if missing.

## Admin Notes / Security
- This example checks admin password client-side against a Firestore document.
- For production: implement Firebase Authentication + restrict Firestore reads/writes with rules so only authenticated admins can write.
- Do **not** keep `test mode` Firestore rules in production.
