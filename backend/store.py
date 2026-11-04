"""Tiny storage layer: Firestore if credentials exist, otherwise in-memory (so the demo always runs)."""
import os, json, copy


class MemoryStore:
    kind = "memory"

    def __init__(self):
        self.data = {}

    def get(self, col, id_):
        d = self.data.get(col, {}).get(id_)
        return copy.deepcopy(d) if d else None

    def set(self, col, id_, doc):
        self.data.setdefault(col, {})[id_] = copy.deepcopy(doc)

    def query(self, col, where=None, order_by=None, desc=False, limit=None):
        rows = [copy.deepcopy(d) for d in self.data.get(col, {}).values()]
        for k, v in (where or {}).items():
            rows = [r for r in rows if r.get(k) == v]
        if order_by:
            rows.sort(key=lambda r: r.get(order_by, 0), reverse=desc)
        return rows[:limit] if limit else rows


class FirestoreStore:
    kind = "firestore"

    def __init__(self, cred):
        import firebase_admin
        from firebase_admin import credentials, firestore
        if not firebase_admin._apps:
            firebase_admin.initialize_app(credentials.Certificate(cred))
        self.db = firestore.client()

    def get(self, col, id_):
        snap = self.db.collection(col).document(id_).get()
        return snap.to_dict() if snap.exists else None

    def set(self, col, id_, doc):
        self.db.collection(col).document(id_).set(doc)

    def query(self, col, where=None, order_by=None, desc=False, limit=None):
        from google.cloud.firestore_v1.base_query import FieldFilter
        from firebase_admin import firestore
        q = self.db.collection(col)
        for k, v in (where or {}).items():
            q = q.where(filter=FieldFilter(k, "==", v))
        if order_by and not where:  # single-field order needs no composite index
            q = q.order_by(order_by, direction=firestore.Query.DESCENDING if desc else firestore.Query.ASCENDING)
            if limit:
                q = q.limit(limit)
            return [d.to_dict() for d in q.stream()]
        rows = [d.to_dict() for d in q.stream()]
        if order_by:
            rows.sort(key=lambda r: r.get(order_by, 0), reverse=desc)
        return rows[:limit] if limit else rows


def get_store():
    path, raw = os.getenv("FIREBASE_CREDENTIALS"), os.getenv("FIREBASE_CREDENTIALS_JSON")
    if path and not os.path.exists(path):
        candidate = os.path.join(os.path.dirname(__file__), path)
        if os.path.exists(candidate):
            path = candidate
    cred = json.loads(raw) if raw else (path if path and os.path.exists(path) else None)
    if cred:
        try:
            return FirestoreStore(cred)
        except Exception as e:  # noqa
            print("Firestore init failed, falling back to memory:", e)
    print("Using in-memory store (data resets on restart). Add Firebase credentials for persistence.")
    return MemoryStore()
