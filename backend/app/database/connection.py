"""Database URL helpers and psycopg2 connect_args for Supabase / cloud hosts."""

from __future__ import annotations

import re
import socket
import sys
from urllib.parse import urlparse


def normalize_database_url(database_url: str, pooler_region: str | None) -> str:
    """
    Rewrite db.<ref>.supabase.co (IPv6-only direct host) to the Session pooler (IPv4)
    when SUPABASE_POOLER_REGION is set — required for Render and most cloud hosts.
    """
    url = database_url.strip()
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg2://" + url[len("postgresql://") :]

    if "pooler.supabase.com" in url:
        return url

    match = re.search(r"@db\.([a-z0-9]+)\.supabase\.co", url)
    if not match or not pooler_region:
        return url

    ref = match.group(1)
    url = url.replace(f"@db.{ref}.supabase.co", f"@aws-0-{pooler_region}.pooler.supabase.com")
    # Pooler user must be postgres.<project_ref>, not postgres
    url = re.sub(
        r"(postgresql\+psycopg2://)postgres:",
        rf"\1postgres.{ref}:",
        url,
        count=1,
    )
    return url


def _resolve_hostaddr(host: str, port: int) -> str | None:
    """
    Return an IP for hostaddr. Prefer IPv4 (works on Render).
    On Windows only, fall back to IPv6 for Supabase direct hosts where libpq DNS fails.
    """
    try:
        return socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)[0][4][0]
    except socket.gaierror:
        pass

    if sys.platform == "win32":
        try:
            return socket.getaddrinfo(host, port, socket.AF_UNSPEC, socket.SOCK_STREAM)[0][4][0]
        except socket.gaierror:
            return None

    return None


def build_connect_args(database_url: str) -> dict[str, str]:
    parsed = urlparse(database_url.replace("+psycopg2", ""))
    host = parsed.hostname
    if not host or host in ("localhost", "127.0.0.1", "::1"):
        return {}

    port = parsed.port or 5432
    args: dict[str, str] = {}

    # Pooler hostnames resolve to IPv4; pinning hostaddr can break if DNS returns another region.
    if "pooler.supabase.com" not in host:
        hostaddr = _resolve_hostaddr(host, port)
        if hostaddr:
            args["hostaddr"] = hostaddr

    if "supabase.co" in host:
        args["sslmode"] = "require"

    return args
