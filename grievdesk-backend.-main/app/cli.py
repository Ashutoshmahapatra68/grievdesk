import click
from flask.cli import AppGroup

from app.extensions import get_db
from app.jobs import JOBS, run_job
from app.models.job_run import JobRun

jobs_cli = AppGroup("jobs", help="Housekeeping jobs: chat cleanup and automatic escalation.")


def _run(name):
    try:
        result = run_job(name, JOBS[name])
    except Exception as exc:
        click.echo(f"{name}: FAILED - {type(exc).__name__}: {exc}", err=True)
        raise SystemExit(1)
    click.echo(f"{name}: {result}")


@jobs_cli.command("cleanup-chats")
def cleanup_chats():
    """Delete chat transcripts older than CHAT_RETENTION_DAYS (complaints are never touched)."""
    _run("chat_cleanup")


@jobs_cli.command("escalate")
def escalate():
    """Escalate complaints nobody has responded to for ESCALATION_DAYS."""
    _run("escalation")


@jobs_cli.command("run-all")
def run_all():
    """Run every job once."""
    for name in JOBS:
        _run(name)


@jobs_cli.command("status")
def status():
    """Show the most recent run of each job."""
    db = get_db()
    for name in JOBS:
        last_doc = db.job_runs.find_one({"job": name}, sort=[("id", -1)])
        last = JobRun.from_doc(last_doc)
        if last is None:
            click.echo(f"{name}: never run")
            continue
        outcome = "running/crashed" if last.ok is None else ("ok" if last.ok else "FAILED")
        started = last.started_at.strftime("%Y-%m-%d %H:%M:%S") if hasattr(last.started_at, "strftime") else str(last.started_at)
        click.echo(f"{name}: {outcome} at {started} UTC - {last.summary}")
