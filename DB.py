import sqlite3


class DaBa:
    """ Simple sqlite3 Abstraction """

    def __init__(self, dbname):
        self._conn = sqlite3.connect(dbname + '.db')
        self._cursor = self._conn.cursor()

    def close(self):
        self._conn.commit()
        self._cursor.close()

    def que(self, *query):
        self._cursor.execute(*query)

    def one(self):
        return self._cursor.fetchone()

    def all(self):
        return self._cursor.fetchall()

    def new_id(self):
        return self._cursor.lastrowid
