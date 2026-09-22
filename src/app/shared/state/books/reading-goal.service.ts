import { inject, Injectable } from '@angular/core';
import { FirestoreService } from '../../../core/firebase/firestore.service';
import { AuthService } from '../authentication/authentication.service';

@Injectable({ providedIn: 'root' })
export class ReadingGoalService {
  private readonly auth = inject(AuthService);
  private readonly firestore = inject(FirestoreService);

  async get(year: number): Promise<number | null> {
    const { uid, token } = await this.auth.getSession();
    const documents = await this.firestore.listDocuments(`users/${uid}/readingGoals`, token);
    const document = documents.find((item) => item.name.endsWith(`/${year}`));
    const value = Number(document?.fields?.['target']?.integerValue);
    return document && Number.isInteger(value) && value > 0 ? value : null;
  }

  async save(year: number, target: number, exists: boolean): Promise<void> {
    if (!Number.isInteger(target) || target < 1 || target > 1000) throw new Error('Choose a goal between 1 and 1000 books.');
    const { uid, token } = await this.auth.getSession();
    const path = `users/${uid}/readingGoals`;
    const fields = { target: { integerValue: String(target) }, year: { integerValue: String(year) } };
    if (exists) await this.firestore.updateDocument(`${path}/${year}`, fields, token);
    else await this.firestore.createDocument(path, String(year), fields, token);
  }
}
