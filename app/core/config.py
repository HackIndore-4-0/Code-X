import os


class Settings:
    @property
    def MITIGATION_THRESHOLD(self) -> float:
        val = os.getenv("TRACEX_MITIGATION_THRESHOLD", "80")
        try:
            return float(val)
        except ValueError:
            return 80.0

    @property
    def VIASOCKET_ENABLED(self) -> bool:
        val = os.getenv("TRACEX_VIASOCKET_ENABLED", "true").lower()
        return val in ("true", "1", "yes")

    @property
    def REMEDIATION_WEBHOOK_URL(self) -> str:
        return os.getenv("TRACEX_REMEDIATION_WEBHOOK_URL", "").strip()


settings = Settings()
