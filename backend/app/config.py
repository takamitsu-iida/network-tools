from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    cml_url: str = "https://cml-server"
    cml_username: str = "admin"
    cml_password: str = "admin"
    cml_ssl_verify: bool = False

    openai_api_key: str = ""

    templates_dir: str = "templates"
    config_templates_dir: str = "config_templates"

    database_url: str = "postgresql+asyncpg://nettools:nettools@db:5432/nettools"


settings = Settings()
