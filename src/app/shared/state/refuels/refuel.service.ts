import { inject, Injectable } from '@angular/core';
import { FirestoreDocument, FirestoreService, FirestoreValue, FirestoreWrite } from '../../../core/firebase/firestore.service';
import { AuthService } from '../authentication/authentication.service';
import { calculateRefuels, RefuelEntry, RefuelInput, RefuelRecord, refuelLifetimeSummary } from './refuel.model';

const calculatedFields = ['rangeKm', 'randPerLiter', 'kmPerLiter', 'litersPer100Km'];

@Injectable({ providedIn: 'root' })
export class RefuelService {
  private readonly auth = inject(AuthService);
  private readonly firestore = inject(FirestoreService);

  async list(vehicleId: string): Promise<RefuelRecord[]> {
    const { uid, token } = await this.auth.getSession();
    const documents = await this.firestore.listDocuments(this.collection(uid, vehicleId), token);
    return documents.map((document) => this.fromDocument(document, vehicleId));
  }

  async get(vehicleId: string, id: string): Promise<RefuelRecord> {
    const { uid, token } = await this.auth.getSession();
    return this.fromDocument(await this.firestore.getDocument(`${this.collection(uid, vehicleId)}/${encodeURIComponent(id)}`, token), vehicleId);
  }

  async add(vehicleId: string, input: RefuelInput): Promise<RefuelRecord> {
    const { uid, token } = await this.auth.getSession();
    const collection = this.collection(uid, vehicleId);
    const documents = await this.firestore.listDocuments(collection, token);
    const record: RefuelRecord = { ...input, id: crypto.randomUUID(), vehicleId };
    const projected = [...documents.map((document) => this.fromDocument(document, vehicleId)), record];
    this.validate(projected, record);
    const entries = calculateRefuels(projected);
    const current = entries.find((entry) => entry.id === record.id)!;
    const writes: FirestoreWrite[] = [{
      update: { name: this.firestore.documentName(`${collection}/${record.id}`), fields: this.toFields(current) },
      currentDocument: { exists: false },
    }];
    writes.push(...this.metricWrites(documents, entries));
    writes.push(await this.summaryWrite(uid, vehicleId, entries, token));
    await this.commit(writes, token);
    return record;
  }

  async update(vehicleId: string, id: string, input: RefuelInput): Promise<RefuelRecord> {
    const { uid, token } = await this.auth.getSession();
    const collection = this.collection(uid, vehicleId);
    const documents = await this.firestore.listDocuments(collection, token);
    const previous = documents.find((document) => document.name.endsWith(`/${id}`));
    if (!previous) throw new Error('This refuel no longer exists. Reload the history.');
    const record: RefuelRecord = { ...input, id, vehicleId };
    const projected = documents.map((document) => document === previous ? record : this.fromDocument(document, vehicleId));
    this.validate(projected, record);
    const entries = calculateRefuels(projected);
    const current = entries.find((entry) => entry.id === id)!;
    const writes: FirestoreWrite[] = [{
      update: { name: previous.name, fields: this.toFields(current) },
      currentDocument: this.precondition(previous),
    }];
    writes.push(...this.metricWrites(documents.filter((document) => document !== previous), entries));
    writes.push(await this.summaryWrite(uid, vehicleId, entries, token));
    await this.commit(writes, token);
    return record;
  }

  async delete(vehicleId: string, id: string): Promise<void> {
    const { uid, token } = await this.auth.getSession();
    const collection = this.collection(uid, vehicleId);
    const documents = await this.firestore.listDocuments(collection, token);
    const target = documents.find((document) => document.name.endsWith(`/${id}`));
    if (!target) throw new Error('This refuel no longer exists. Reload the history.');
    const survivors = documents.filter((document) => document !== target);
    const entries = calculateRefuels(survivors.map((document) => this.fromDocument(document, vehicleId)));
    const writes: FirestoreWrite[] = [{ delete: target.name, currentDocument: this.precondition(target) }];
    writes.push(...this.metricWrites(survivors, entries));
    writes.push(await this.summaryWrite(uid, vehicleId, entries, token));
    await this.commit(writes, token);
  }

  private async commit(writes: FirestoreWrite[], token: string): Promise<void> {
    if (writes.length > 500) throw new Error('Too many refuels to recalculate in one save.');
    await this.firestore.commitWrites(writes, token);
  }

  private validate(projected: RefuelRecord[], current: RefuelRecord): void {
    if (!Number.isFinite(current.odometer) || current.odometer < 0 ||
        !Number.isFinite(current.qtyLiters) || current.qtyLiters <= 0 ||
        !Number.isFinite(current.amountPaid) || current.amountPaid < 0) {
      throw new Error('Enter valid odometer, litre and amount values.');
    }
    if (projected.some((entry) => entry.id !== current.id && entry.odometer === current.odometer)) {
      throw new Error('Another refuel already has this odometer reading.');
    }
    if (projected.every((entry) => entry.id === current.id || entry.odometer > current.odometer) &&
        (!current.initialRangeKm || current.initialRangeKm <= 0)) {
      throw new Error('Enter the range driven for the first refuel.');
    }
  }

  private metricWrites(documents: FirestoreDocument[], entries: RefuelEntry[]): FirestoreWrite[] {
    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    const writes: FirestoreWrite[] = [];
    for (const document of documents) {
      const entry = byId.get(document.name.split('/').at(-1) ?? '');
      if (!entry) continue;
      const fields = this.metricFields(entry);
      const changed = calculatedFields.some((field) => {
        const before = document.fields?.[field];
        const after = fields[field];
        return before?.doubleValue !== after.doubleValue || before?.nullValue !== after.nullValue;
      });
      if (changed) writes.push({
        update: { name: document.name, fields },
        updateMask: { fieldPaths: calculatedFields },
        currentDocument: this.precondition(document),
      });
    }
    return writes;
  }

  private precondition(document: FirestoreDocument): { updateTime?: string; exists?: boolean } {
    return document.updateTime ? { updateTime: document.updateTime } : { exists: true };
  }

  private async summaryWrite(uid: string, vehicleId: string, entries: RefuelEntry[], token: string): Promise<FirestoreWrite> {
    const path = `users/${encodeURIComponent(uid)}/vehicles/${encodeURIComponent(vehicleId)}`;
    const vehicle = await this.firestore.getDocument(path, token);
    const summary = refuelLifetimeSummary(entries);
    const fields = Object.fromEntries(Object.entries(summary).map(([field, value]) => [
      field, value === null ? { nullValue: null } : { doubleValue: value },
    ])) as Record<string, FirestoreValue>;
    return {
      update: { name: vehicle.name, fields },
      updateMask: { fieldPaths: Object.keys(fields) },
      currentDocument: this.precondition(vehicle),
    };
  }

  private collection(uid: string, vehicleId: string): string {
    return `users/${encodeURIComponent(uid)}/vehicles/${encodeURIComponent(vehicleId)}/refuels`;
  }

  private metricFields(entry: RefuelEntry): Record<string, FirestoreValue> {
    const value = (number: number | null): FirestoreValue => number === null ? { nullValue: null } : { doubleValue: number };
    return {
      rangeKm: value(entry.rangeKm),
      randPerLiter: value(entry.randPerLiter),
      kmPerLiter: value(entry.kmPerLiter),
      litersPer100Km: value(entry.litersPer100Km),
    };
  }

  private toFields(entry: RefuelEntry): Record<string, FirestoreValue> {
    return {
      dop: { stringValue: entry.dop },
      pop: { stringValue: entry.pop },
      fuelType: { stringValue: entry.fuelType },
      areaTown: { stringValue: entry.areaTown },
      odometer: { doubleValue: entry.odometer },
      qtyLiters: { doubleValue: entry.qtyLiters },
      amountPaid: { doubleValue: entry.amountPaid },
      initialRangeKm: entry.initialRangeKm === null ? { nullValue: null } : { doubleValue: entry.initialRangeKm },
      ...this.metricFields(entry),
    };
  }

  private fromDocument(document: FirestoreDocument, vehicleId: string): RefuelRecord {
    const fields = document.fields ?? {};
    const number = (field: string) => Number(fields[field]?.doubleValue ?? fields[field]?.integerValue ?? 0);
    const rangeField = fields['initialRangeKm'];
    return {
      id: document.name.split('/').at(-1) ?? '',
      vehicleId,
      dop: fields['dop']?.stringValue ?? '',
      pop: fields['pop']?.stringValue ?? '',
      fuelType: fields['fuelType']?.stringValue ?? '',
      areaTown: fields['areaTown']?.stringValue ?? '',
      odometer: number('odometer'),
      qtyLiters: number('qtyLiters'),
      amountPaid: number('amountPaid'),
      initialRangeKm: rangeField?.doubleValue === undefined && rangeField?.integerValue === undefined ? null : number('initialRangeKm'),
    };
  }
}
