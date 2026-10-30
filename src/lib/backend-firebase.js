import * as fb from './firebase.js';

const clean = (o) => JSON.parse(JSON.stringify(o)); // Firestore rejects undefined

export const backend = {
  name: 'firebase',
  start(onUser) { return fb.onAuth(onUser); },
  signIn: () => fb.signInGoogle(),
  signOut: () => fb.signOutUser(),
  attach(uid, h) {
    const u1 = fb.onSnapshot(fb.userDoc(uid), { includeMetadataChanges: true }, (snap) => {
      h.onDoc(snap.exists() ? snap.data() : null, { fromCache: snap.metadata.fromCache });
    }, (err) => h.onError && h.onError(err));
    const u2 = fb.onSnapshot(fb.entriesCol(uid), (snap) => {
      h.onEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => h.onError && h.onError(err));
    return () => { u1(); u2(); };
  },
  createUser: (uid, data) => fb.setDoc(fb.userDoc(uid), clean(data)),
  saveSettings: (uid, settings) => fb.updateDoc(fb.userDoc(uid), { settings: clean(settings) }),
  setDay: (uid, date, obj) => fb.updateDoc(fb.userDoc(uid), { [`days.${date}`]: obj ? clean(obj) : fb.deleteField() }),
  setAck: (uid, id) => fb.updateDoc(fb.userDoc(uid), { [`ackTerms.${id}`]: true }),
  addEntry: (uid, e) => fb.setDoc(fb.entryDoc(uid, e.id), clean(e)),
  updateEntry: (uid, e) => fb.setDoc(fb.entryDoc(uid, e.id), clean(e)),
  deleteEntry: (uid, id) => fb.deleteDoc(fb.entryDoc(uid, id)),
  async resetAll(uid) {
    const snap = await fb.getDocs(fb.entriesCol(uid));
    let batch = fb.writeBatch(fb.db);
    let n = 0;
    for (const d of snap.docs) {
      batch.delete(d.ref);
      if (++n % 400 === 0) { await batch.commit(); batch = fb.writeBatch(fb.db); }
    }
    await batch.commit();
    await fb.deleteDoc(fb.userDoc(uid));
  },
};
