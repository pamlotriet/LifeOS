import { inject, Injectable } from '@angular/core';
import { FirestoreDocument, FirestoreService, FirestoreValue } from '../../../core/firebase/firestore.service';
import { AuthService } from '../authentication/authentication.service';
import { GymEntry, GymExercise, validateExercise, validateGymEntry } from './gym.model';

const fields = (input: object): Record<string, FirestoreValue> => Object.fromEntries(Object.entries(input).filter(([key]) => key !== 'id').map(([key,value]) => [key, typeof value === 'number' ? { doubleValue:value } : { stringValue:String(value) }]));
const decode = <T>(doc: FirestoreDocument): T => ({ ...Object.fromEntries(Object.entries(doc.fields ?? {}).map(([key,value]) => [key,value.stringValue ?? value.doubleValue ?? Number(value.integerValue)])), id:doc.name.split('/').at(-1) } as T);
@Injectable({ providedIn:'root' })
export class GymService {
  private readonly auth = inject(AuthService);
  private readonly firestore = inject(FirestoreService);
  async load(): Promise<{ exercises:GymExercise[]; entries:GymEntry[] }> {
    const {uid,token}=await this.auth.getSession();
    const [exercises,entries]=await Promise.all([this.firestore.listDocuments(`users/${uid}/gymExercises`,token),this.firestore.listDocuments(`users/${uid}/gymPlan`,token)]);
    return { exercises:exercises.map(doc=>decode<GymExercise>(doc)), entries:entries.map(doc=>decode<GymEntry>(doc)) };
  }
  async saveExercise(input: Omit<GymExercise,'id'>, id:string=crypto.randomUUID()): Promise<GymExercise> {
    validateExercise(input);
    const record:GymExercise={id,name:input.name.trim(),muscle:input.muscle,equipment:input.equipment.trim(),sets:input.sets,reps:input.reps.trim(),rest:input.rest,notes:input.notes.trim()};
    await this.save('gymExercises',record);return record;
  }
  async saveEntry(input: Omit<GymEntry,'id'>, id:string=crypto.randomUUID()): Promise<GymEntry> {
    validateGymEntry(input);
    const record:GymEntry={id,exerciseId:input.exerciseId,day:input.day,sets:input.sets,reps:input.reps.trim(),rest:input.rest,weight:input.weight.trim(),notes:input.notes.trim(),order:input.order};
    await this.save('gymPlan',record);return record;
  }
  async remove(collection:'gymExercises'|'gymPlan',id:string): Promise<void> {
    const {uid,token}=await this.auth.getSession();await this.firestore.deleteDocument(`users/${uid}/${collection}`,id,token);
  }
  private async save(collection:string,record:GymExercise|GymEntry):Promise<void> {
    const {uid,token}=await this.auth.getSession();await this.firestore.updateDocument(`users/${uid}/${collection}/${encodeURIComponent(record.id)}`,fields(record),token);
  }
}
