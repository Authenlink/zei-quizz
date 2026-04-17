"""Variables de contexte pour la propagation des données utilisateur par requête."""

import contextvars

current_customer_id: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "current_customer_id", default=None
)
current_session_id: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "current_session_id", default=None
)
