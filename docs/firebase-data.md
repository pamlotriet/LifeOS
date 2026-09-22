# Firebase vehicle data and photos

Vehicle records live in Cloud Firestore at `users/{uid}/vehicles/{vehicleId}`. Google sign-in creates `users/{uid}` when missing. An account with no vehicles sees the empty state.

Vehicle photos live in Firebase Storage at `users/{uid}/vehicles/{vehicleId}/photo`. The app uploads using the existing Firebase sign-in, saves the Storage download URL and path in the vehicle's Firestore document, and displays the saved URL. There is no separate Drive sign-in. Anyone with a photo download URL can view it; treat the URL as a shareable link.

## Enable Storage

1. In [Firebase Console](https://console.firebase.google.com/), select **fuel-consumption-92c8c**. Open **Build → Storage → Get started** and create the default bucket. The app expects `fuel-consumption-92c8c.firebasestorage.app`; if Firebase gives the bucket a different name, change `storageBucket` in both environment files.
2. Publish `storage.rules` to that bucket. From this repository, run `npx firebase-tools deploy --project fuel-consumption-92c8c --only storage`, or paste the rules in **Build → Storage → Rules** and click **Publish**.
3. If Firestore sign-in or vehicle reads fail with 403, confirm the `(default)` Firestore database exists and deploy `firestore.rules` using `npx firebase-tools deploy --project fuel-consumption-92c8c --only firestore:rules`.

Existing Drive photos are not moved automatically. Their vehicle records remain, but those photos need to be uploaded again to appear from Firebase Storage.

## Refuel records

Each vehicle has its own Firestore collection at `users/{uid}/vehicles/{vehicleId}/refuels/{refuelId}`. A record stores date of purchase (`dop`), place of purchase (`pop`), fuel type, area/town, odometer, litres, amount paid, and an optional manual range for the first entry. It also stores calculated `rangeKm`, `randPerLiter`, `kmPerLiter`, and `litersPer100Km` fields for exports. Entries are ordered by odometer for distance calculations. The first entry uses its manual range; each later entry uses its odometer minus the preceding entry's odometer. Price per litre is amount divided by litres, fuel economy is range divided by litres, and consumption is litres divided by range times 100. Adding, editing, or deleting an entry saves updated calculated fields on affected later entries in the same Firestore commit. Overall averages use total amount, litres, and range so entries with different quantities are weighted correctly.

The Suzuki Swift vehicle has three refuels imported from the supplied spreadsheet: 30 October 2026 at Astron Energy, Langenhoven Park, Bloemfontein (578.7 km, 27.525 L, R761.50, initial range 564.7 km); 1 September 2026 at Engen Greystone, Greystone, Rustenburg (1032 km, 26.36 L, R674.50); and 15 September 2026 at the same station and town (1436 km, 27.22 L, R733). All three use ULP 95. The earlier sample record was removed. The Firestore rules for this subcollection were deployed to project `fuel-consumption-92c8c`.

The vehicle document also stores a lifetime summary for export: `lifetimeTotalSpent`, `lifetimeTotalRangeKm`, `lifetimeTotalLitres`, `lifetimeRefuelCount`, `lifetimeAverageMonthlySpend`, `lifetimeAverageRangeKm`, `lifetimeAveragePricePerLiter`, `lifetimeAverageKmPerLiter`, and `lifetimeAverageLitersPer100Km`. The monthly average divides spend by the number of months with recorded refuels. Each refuel add, edit, or delete updates this summary atomically with the refuel records. The imported Suzuki Swift's summary was backfilled and verified in Firestore.

## Books

Books live at `users/{uid}/books/{bookId}` and user-defined mood and genre tags at `users/{uid}/bookTags/{tagId}`. Each book stores its main category, reading details, optional series name and number, tag IDs, and an array of individually identified copies with format and label. The app searches Open Library by title and author first, then Google Books when Open Library has no reliable cover; the matched HTTPS image URL is saved in `coverUrl`. Books with no reliable match show the app's fallback cover. The project's Books API is enabled and the Firebase browser key permits `books.googleapis.com`. Users do not upload book covers. Deleting a tag removes its ID from affected books in one Firestore commit. The Books rules were deployed to project `fuel-consumption-92c8c`. The signed-in user's 119 inventory rows are stored across 115 book records, with repeated titles grouped as copies and original spreadsheet values preserved for export. Firebase Storage rules do not permit book-cover uploads.

Yearly reading goals are stored at `users/{uid}/readingGoals/{year}` with a `target` book count. A book counts toward a year when its status is `Finished` and its `yearRead` matches that year. The 115 imported books have their spreadsheet Year Read value saved separately from finish dates, so invalid spreadsheet dates do not erase goal progress. The Books page reloads both books and the goal when pulled down.
