"""Job state management with SQLite."""
import secrets
import string
from datetime import datetime
from typing import Optional
import aiosqlite
from app.models import JobStatus


def generate_job_id(length: int = 12) -> str:
    """Generate a random job ID."""
    alphabet = string.ascii_lowercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


class JobManager:
    """Manages OCR job state in SQLite."""

    def __init__(self, db_path: str = "/app/data/jobs.db"):
        self.db_path = db_path
        self._db: Optional[aiosqlite.Connection] = None

    async def initialize(self) -> None:
        """Initialize database connection and create tables."""
        self._db = await aiosqlite.connect(self.db_path)
        self._db.row_factory = aiosqlite.Row

        await self._db.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                job_id TEXT PRIMARY KEY,
                status TEXT NOT NULL DEFAULT 'pending',
                filename TEXT,
                file_size INTEGER,
                progress INTEGER DEFAULT 0,
                method TEXT,
                result_text TEXT,
                result_pages INTEGER,
                result_confidence REAL,
                result_processing_time_ms INTEGER,
                error TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        await self._db.commit()

    async def close(self) -> None:
        """Close database connection."""
        if self._db:
            await self._db.close()
            self._db = None

    async def create_job(self, filename: str, file_size: int) -> str:
        """Create a new job and return its ID."""
        job_id = generate_job_id()
        now = datetime.utcnow().isoformat()

        await self._db.execute(
            """
            INSERT INTO jobs (job_id, filename, file_size, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (job_id, filename, file_size, now, now),
        )
        await self._db.commit()
        return job_id

    async def get_job(self, job_id: str) -> Optional[dict]:
        """Get job by ID."""
        async with self._db.execute(
            "SELECT * FROM jobs WHERE job_id = ?", (job_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if row:
                return dict(row)
            return None

    async def update_job(
        self,
        job_id: str,
        status: Optional[JobStatus] = None,
        progress: Optional[int] = None,
        method: Optional[str] = None,
        error: Optional[str] = None,
    ) -> None:
        """Update job fields."""
        updates = []
        params = []

        if status is not None:
            updates.append("status = ?")
            params.append(status.value)
        if progress is not None:
            updates.append("progress = ?")
            params.append(progress)
        if method is not None:
            updates.append("method = ?")
            params.append(method)
        if error is not None:
            updates.append("error = ?")
            params.append(error)

        updates.append("updated_at = ?")
        params.append(datetime.utcnow().isoformat())
        params.append(job_id)

        await self._db.execute(
            f"UPDATE jobs SET {', '.join(updates)} WHERE job_id = ?",
            params,
        )
        await self._db.commit()

    async def complete_job(
        self,
        job_id: str,
        text: str,
        pages: int,
        method: str,
        confidence: float,
        processing_time_ms: int,
    ) -> None:
        """Mark job as completed with results."""
        now = datetime.utcnow().isoformat()
        await self._db.execute(
            """
            UPDATE jobs SET
                status = ?,
                progress = 100,
                method = ?,
                result_text = ?,
                result_pages = ?,
                result_confidence = ?,
                result_processing_time_ms = ?,
                updated_at = ?
            WHERE job_id = ?
            """,
            (
                JobStatus.COMPLETED.value,
                method,
                text,
                pages,
                confidence,
                processing_time_ms,
                now,
                job_id,
            ),
        )
        await self._db.commit()

    async def fail_job(self, job_id: str, error: str) -> None:
        """Mark job as failed."""
        await self.update_job(job_id, status=JobStatus.FAILED, error=error)
