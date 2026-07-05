import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "123av.db")

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=65536")
    return conn

def init_db():
    conn = get_conn()
    c = conn.cursor()

    c.executescript("""
        CREATE TABLE IF NOT EXISTS videos (
            code TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            type TEXT,
            release_date TEXT,
            duration TEXT,
            maker TEXT,
            thumbnail TEXT,
            views INTEGER DEFAULT 0,
            description TEXT,
            crawled_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS genres (
            slug TEXT PRIMARY KEY,
            name TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS video_genres (
            code TEXT NOT NULL,
            genre_slug TEXT NOT NULL,
            PRIMARY KEY (code, genre_slug),
            FOREIGN KEY (code) REFERENCES videos(code) ON DELETE CASCADE,
            FOREIGN KEY (genre_slug) REFERENCES genres(slug) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS actresses (
            slug TEXT PRIMARY KEY,
            name TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS video_actresses (
            code TEXT NOT NULL,
            actress_slug TEXT NOT NULL,
            PRIMARY KEY (code, actress_slug),
            FOREIGN KEY (code) REFERENCES videos(code) ON DELETE CASCADE,
            FOREIGN KEY (actress_slug) REFERENCES actresses(slug) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS tags (
            slug TEXT PRIMARY KEY,
            name TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS video_tags (
            code TEXT NOT NULL,
            tag_slug TEXT NOT NULL,
            PRIMARY KEY (code, tag_slug),
            FOREIGN KEY (code) REFERENCES videos(code) ON DELETE CASCADE,
            FOREIGN KEY (tag_slug) REFERENCES tags(slug) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_vg_genre ON video_genres(genre_slug);
        CREATE INDEX IF NOT EXISTS idx_va_actress ON video_actresses(actress_slug);
        CREATE INDEX IF NOT EXISTS idx_vt_tag ON video_tags(tag_slug);
        CREATE INDEX IF NOT EXISTS idx_videos_type ON videos(type);
        CREATE INDEX IF NOT EXISTS idx_videos_maker ON videos(maker);
        CREATE INDEX IF NOT EXISTS idx_videos_release ON videos(release_date);
        CREATE INDEX IF NOT EXISTS idx_videos_views ON videos(views);
        CREATE VIRTUAL TABLE IF NOT EXISTS videos_fts USING fts5(
            title, content=videos, content_rowid=rowid
        );
        CREATE TRIGGER IF NOT EXISTS videos_ai AFTER INSERT ON videos BEGIN
            INSERT INTO videos_fts(rowid, title) VALUES (new.rowid, new.title);
        END;
        CREATE TRIGGER IF NOT EXISTS videos_ad AFTER DELETE ON videos BEGIN
            INSERT INTO videos_fts(videos_fts, rowid, title) VALUES('delete', old.rowid, old.title);
        END;
        CREATE TRIGGER IF NOT EXISTS videos_au AFTER UPDATE ON videos BEGIN
            INSERT INTO videos_fts(videos_fts, rowid, title) VALUES('delete', old.rowid, old.title);
            INSERT INTO videos_fts(rowid, title) VALUES (new.rowid, new.title);
        END;
    """)

    conn.commit()
    conn.close()

def get_stats():
    conn = get_conn()
    c = conn.cursor()
    stats = {}
    for table in ["videos", "genres", "actresses", "tags"]:
        c.execute(f"SELECT COUNT(*) FROM {table}")
        stats[table] = c.fetchone()[0]
    c.execute("SELECT COUNT(DISTINCT maker) FROM videos WHERE maker IS NOT NULL AND maker != ''")
    stats["studios"] = c.fetchone()[0]
    conn.close()
    return stats

if __name__ == "__main__":
    init_db()
    print("Database initialized.")
    print(f"Stats: {get_stats()}")
