"""Helpers pour les outils : success_response(), error_response()."""


def success_response(data: dict | str, message: str = "OK") -> dict:
    """Retourne une réponse de succès standardisée pour les outils."""
    return {"success": True, "message": message, "data": data}


def error_response(error: str, code: str = "ERROR") -> dict:
    """Retourne une réponse d'erreur standardisée pour les outils (jamais raise)."""
    return {"success": False, "error": error, "code": code}
