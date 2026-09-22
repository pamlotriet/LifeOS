# Firebase vehicle data and photos

Vehicle records live in Cloud Firestore at `users/{uid}/vehicles/{vehicleId}`. Google sign-in creates `users/{uid}` when missing. An account with no vehicles sees the empty state.

Vehicle photos live in Firebase Storage at `users/{uid}/vehicles/{vehicleId}/photo`. The app uploads using the existing Firebase sign-in, saves the Storage download URL and path in the vehicle's Firestore document, and displays the saved URL. There is no separate Drive sign-in. Anyone with a photo download URL can view it; treat the URL as a shareable link.

## Enable Storage

1. In [Firebase Console](https://console.firebase.google.com/), select **fuel-consumption-92c8c**. Open **Build → Storage → Get started** and create the default bucket. The app expects `fuel-consumption-92c8c.firebasestorage.app`; if Firebase gives the bucket a different name, change `storageBucket` in both environment files.
2. Publish `storage.rules` to that bucket. From this repository, run `npx firebase-tools deploy --project fuel-consumption-92c8c --only storage`, or paste the rules in **Build → Storage → Rules** and click **Publish**.
3. If Firestore sign-in or vehicle reads fail with 403, confirm the `(default)` Firestore database exists and deploy `firestore.rules` using `npx firebase-tools deploy --project fuel-consumption-92c8c --only firestore:rules`.

Existing Drive photos are not moved automatically. Their vehicle records remain, but those photos need to be uploaded again to appear from Firebase Storage.
