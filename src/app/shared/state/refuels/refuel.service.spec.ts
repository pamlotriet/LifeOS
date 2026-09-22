import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FirestoreDocument, FirestoreService, FirestoreWrite } from '../../../core/firebase/firestore.service';
import { AuthService } from '../authentication/authentication.service';
import { RefuelService } from './refuel.service';

describe('RefuelService', () => {
  const getSession = vi.fn();
  const listDocuments = vi.fn();
  const getDocument = vi.fn();
  const commitWrites = vi.fn();
  const documentName = vi.fn((path: string) => `projects/test/databases/(default)/documents/${path}`);

  const service = () => runInInjectionContext(Injector.create({ providers: [
    { provide: AuthService, useValue: { getSession } },
    { provide: FirestoreService, useValue: { listDocuments, getDocument, commitWrites, documentName } },
  ] }), () => new RefuelService());

  const input = (odometer: number, initialRangeKm: number | null = null) => ({
    dop: '2026-09-22', pop: 'Shell', fuelType: 'Petrol', areaTown: 'Sandton',
    odometer, qtyLiters: 40, amountPaid: 900, initialRangeKm,
  });
  const document = (id: string, odometer: number, initialRangeKm: number | null = null): FirestoreDocument => ({
    name: `projects/test/databases/(default)/documents/users/user-1/vehicles/car-1/refuels/${id}`,
    updateTime: '2026-09-22T12:00:00Z',
    fields: {
      dop: { stringValue: '2026-09-22' }, pop: { stringValue: 'Shell' },
      fuelType: { stringValue: 'Petrol' }, areaTown: { stringValue: 'Sandton' },
      odometer: { doubleValue: odometer }, qtyLiters: { doubleValue: 40 },
      amountPaid: { doubleValue: 900 },
      initialRangeKm: initialRangeKm === null ? { nullValue: null } : { doubleValue: initialRangeKm },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ uid: 'user-1', token: 'id-token' });
    getDocument.mockResolvedValue({ name: 'projects/test/databases/(default)/documents/users/user-1/vehicles/car-1', updateTime: '2026-09-22T12:00:00Z' });
    commitWrites.mockResolvedValue(undefined);
  });

  it('loads refuels only from the signed-in user and selected vehicle', async () => {
    listDocuments.mockResolvedValue([document('log-1', 13600, 600)]);
    const [entry] = await service().list('car-1');
    expect(listDocuments).toHaveBeenCalledWith('users/user-1/vehicles/car-1/refuels', 'id-token');
    expect(entry).toEqual(expect.objectContaining({ id: 'log-1', vehicleId: 'car-1', qtyLiters: 40, odometer: 13600 }));
  });

  it('saves calculated fields with a new first refuel', async () => {
    listDocuments.mockResolvedValue([]);
    await service().add('car-1', input(13600, 600));
    const writes = commitWrites.mock.calls[0][0] as FirestoreWrite[];
    expect(writes).toHaveLength(2);
    expect(writes[0]).toEqual(expect.objectContaining({
      currentDocument: { exists: false },
      update: expect.objectContaining({ fields: expect.objectContaining({
        rangeKm: { doubleValue: 600 }, randPerLiter: { doubleValue: 22.5 },
        kmPerLiter: { doubleValue: 15 }, litersPer100Km: { doubleValue: 40 / 600 * 100 },
      }) }),
    }));
    expect(writes[1]).toEqual(expect.objectContaining({
      update: expect.objectContaining({ fields: expect.objectContaining({
        lifetimeTotalSpent: { doubleValue: 900 }, lifetimeTotalRangeKm: { doubleValue: 600 },
        lifetimeTotalLitres: { doubleValue: 40 }, lifetimeRefuelCount: { doubleValue: 1 },
        lifetimeAverageMonthlySpend: { doubleValue: 900 },
      }) }),
    }));
  });

  it('updates later stored ranges when an earlier odometer changes', async () => {
    listDocuments.mockResolvedValue([document('first', 100, 300), document('second', 500)]);
    await service().update('car-1', 'first', input(150, 300));
    const writes = commitWrites.mock.calls[0][0] as FirestoreWrite[];
    expect(writes).toHaveLength(3);
    expect(writes[0]).toEqual(expect.objectContaining({ currentDocument: { updateTime: '2026-09-22T12:00:00Z' } }));
    expect(writes[1]).toEqual(expect.objectContaining({
      updateMask: { fieldPaths: ['rangeKm', 'randPerLiter', 'kmPerLiter', 'litersPer100Km'] },
      update: expect.objectContaining({ fields: expect.objectContaining({ rangeKm: { doubleValue: 350 } }) }),
    }));
    expect(writes[2]).toEqual(expect.objectContaining({
      update: expect.objectContaining({ fields: expect.objectContaining({ lifetimeTotalRangeKm: { doubleValue: 650 } }) }),
    }));
  });

  it('recalculates survivors in the same commit as a deletion', async () => {
    listDocuments.mockResolvedValue([document('first', 100, 300), document('middle', 500), document('last', 850)]);
    await service().delete('car-1', 'middle');
    const writes = commitWrites.mock.calls[0][0] as FirestoreWrite[];
    expect(writes[0]).toEqual(expect.objectContaining({ delete: expect.stringContaining('/middle') }));
    expect(writes.find((write) => 'update' in write && write.update.name.endsWith('/last')))
      .toEqual(expect.objectContaining({ update: expect.objectContaining({ fields: expect.objectContaining({ rangeKm: { doubleValue: 750 } }) }) }));
    expect(writes.at(-1)).toEqual(expect.objectContaining({ update: expect.objectContaining({ fields: expect.objectContaining({
      lifetimeRefuelCount: { doubleValue: 2 }, lifetimeTotalRangeKm: { doubleValue: 1050 },
    }) }) }));
  });
});
