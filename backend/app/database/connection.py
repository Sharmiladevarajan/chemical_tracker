"""Work around Windows/libpq failing to resolve some DB hostnames (e.g. IPv6-only Supabase)."""

from __future__ import annotations

import socket
from urllib.parse import urlparse


def _resolve_hostaddr(host: str, port: int) -> str:
    """Return an IP address for host; prefer IPv4 when available."""
    try:
        infos = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
    except socket.gaierror:
        infos = socket.getaddrinfo(host, port, socket.AF_UNSPEC, socket.SOCK_STREAM)

    if not infos:
        raise OSError(f"Could not resolve database host: {host}")

    return infos[0][4][0]


def build_connect_args(database_url: str) -> dict[str, str]:
    """
    psycopg2/libpq on Windows may fail with "could not translate host name" for
    IPv6-only hosts even when Python's resolver works. Passing hostaddr fixes that.
    """
    parsed = urlparse(database_url.replace("+psycopg2", ""))
    host = parsed.hostname
    if not host or host in ("localhost", "127.0.0.1", "::1"):
        return {}

    port = parsed.port or 5432
    args: dict[str, str] = {"hostaddr": _resolve_hostaddr(host, port)}

    if "supabase.co" in host:
        args["sslmode"] = "require"

    return args
