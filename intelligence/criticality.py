from dataclasses import dataclass
from typing import Optional

from .schemas import NormalizedEvent


@dataclass
class ResourceCriticality:
    """
    Describes how important the resource involved in an event is.

    This is an asset/resource importance signal.
    It is NOT an attack probability.
    """

    score: float
    resource: Optional[str]
    reason: str


class ResourceCriticalityEvaluator:
    """
    Deterministic resource criticality evaluator.

    Initial implementation uses resource names and event
    characteristics supplied by the normalized event.

    Backend can later provide authoritative asset metadata.
    """

    MAX_SCORE = 1.0

    CRITICAL_KEYWORDS = {
        "production",
        "production-db",
        "prod",
        "payroll",
        "finance",
        "finance-db",
        "credentials",
        "credential",
        "identity",
        "iam",
        "admin",
        "admin-console",
        "security",
    }

    HIGH_KEYWORDS = {
        "database",
        "db",
        "customer",
        "customer-data",
        "employee",
        "hr",
        "internal",
        "api",
        "server",
    }

    MEDIUM_KEYWORDS = {
        "application",
        "app",
        "service",
        "dashboard",
        "report",
    }

    def evaluate(
        self,
        event: NormalizedEvent,
    ) -> ResourceCriticality:
        """
        Evaluate the criticality of the resource involved
        in the event.
        """

        resource = (event.resource or "").strip()

        if not resource:
            return ResourceCriticality(
                score=0.0,
                resource=None,
                reason="No resource was associated with the event.",
            )

        normalized_resource = resource.lower()

        # Critical resources
        critical_match = self._find_keyword(
            normalized_resource,
            self.CRITICAL_KEYWORDS,
        )

        if critical_match:
            return ResourceCriticality(
                score=1.0,
                resource=resource,
                reason=(
                    f"Resource matches critical asset category "
                    f"'{critical_match}'."
                ),
            )

        # High-value resources
        high_match = self._find_keyword(
            normalized_resource,
            self.HIGH_KEYWORDS,
        )

        if high_match:
            return ResourceCriticality(
                score=0.75,
                resource=resource,
                reason=(
                    f"Resource matches high-importance asset "
                    f"category '{high_match}'."
                ),
            )

        # Medium-value resources
        medium_match = self._find_keyword(
            normalized_resource,
            self.MEDIUM_KEYWORDS,
        )

        if medium_match:
            return ResourceCriticality(
                score=0.50,
                resource=resource,
                reason=(
                    f"Resource matches medium-importance asset "
                    f"category '{medium_match}'."
                ),
            )

        # A known resource still has some investigation relevance.
        return ResourceCriticality(
            score=0.25,
            resource=resource,
            reason=(
                "Resource is present but does not match a "
                "known criticality category."
            ),
        )

    def _find_keyword(
        self,
        resource: str,
        keywords: set[str],
    ) -> Optional[str]:
        """
        Return the first matching keyword.
        """

        for keyword in sorted(keywords):
            if keyword in resource:
                return keyword

        return None


def evaluate_resource_criticality(
    event: NormalizedEvent,
) -> ResourceCriticality:
    """
    Convenience function for resource criticality evaluation.
    """

    evaluator = ResourceCriticalityEvaluator()

    return evaluator.evaluate(event)