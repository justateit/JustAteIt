"""Media service tests: configuration, S3 client construction, URL
building, and upload content-type behavior. S3 is faked; no AWS access.
"""
import re

import pytest
from fastapi.testclient import TestClient

from services.media_service import main as media_main

client = TestClient(media_main.app)

S3_ENV_VARS = ("S3_BUCKET", "S3_REGION", "S3_ENDPOINT_URL", "S3_PUBLIC_BASE_URL")
PNG_UPLOAD = {"file": ("photo.png", b"fake-image-bytes", "image/png")}


@pytest.fixture(autouse=True)
def clean_s3_env(monkeypatch):
    """Start every test without S3 configuration in the environment."""
    for name in S3_ENV_VARS:
        monkeypatch.delenv(name, raising=False)
    return monkeypatch


@pytest.fixture
def configured_env(clean_s3_env):
    clean_s3_env.setenv("S3_BUCKET", "test-bucket")
    clean_s3_env.setenv("S3_REGION", "us-west-2")
    return clean_s3_env


class FakeS3Client:
    def __init__(self, fail=False):
        self.fail = fail
        self.calls = []

    def upload_fileobj(self, fileobj, bucket, key, ExtraArgs=None):
        if self.fail:
            raise RuntimeError("simulated S3 outage")
        self.calls.append({"bucket": bucket, "key": key, "extra": ExtraArgs})


@pytest.fixture
def fake_s3(monkeypatch):
    fake = FakeS3Client()
    monkeypatch.setattr(media_main, "get_s3_client", lambda config=None: fake)
    return fake


# ── Configuration ─────────────────────────────────────────────────────────


def test_config_missing_both_names_both_vars():
    with pytest.raises(media_main.MediaConfigurationError) as excinfo:
        media_main.get_s3_config()
    assert "S3_BUCKET" in str(excinfo.value)
    assert "S3_REGION" in str(excinfo.value)


def test_config_missing_region_names_only_region(clean_s3_env):
    clean_s3_env.setenv("S3_BUCKET", "test-bucket")
    with pytest.raises(media_main.MediaConfigurationError) as excinfo:
        media_main.get_s3_config()
    assert "S3_REGION" in str(excinfo.value)
    assert "S3_BUCKET" not in str(excinfo.value)


def test_config_reads_required_and_optional_values(configured_env):
    configured_env.setenv("S3_ENDPOINT_URL", "http://localhost:4566")
    configured_env.setenv("S3_PUBLIC_BASE_URL", "https://media.example.com")
    config = media_main.get_s3_config()
    assert config == {
        "bucket": "test-bucket",
        "region": "us-west-2",
        "endpoint_url": "http://localhost:4566",
        "public_base_url": "https://media.example.com",
    }


def test_config_optional_values_default_to_none(configured_env):
    config = media_main.get_s3_config()
    assert config["endpoint_url"] is None
    assert config["public_base_url"] is None


def test_upload_without_config_returns_clear_503():
    response = client.post("/media/upload", files=PNG_UPLOAD)
    assert response.status_code == 503
    detail = response.json()["detail"]
    assert "S3_BUCKET" in detail
    assert "S3_REGION" in detail


# ── S3 client construction ────────────────────────────────────────────────


def test_client_uses_default_credential_chain(configured_env, monkeypatch):
    captured = {}

    def fake_boto3_client(service, **kwargs):
        captured["service"] = service
        captured["kwargs"] = kwargs
        return FakeS3Client()

    monkeypatch.setattr(media_main.boto3, "client", fake_boto3_client)
    media_main.get_s3_client()
    assert captured["service"] == "s3"
    assert captured["kwargs"] == {"region_name": "us-west-2"}
    assert "aws_access_key_id" not in captured["kwargs"]
    assert "aws_secret_access_key" not in captured["kwargs"]


def test_client_honors_custom_endpoint(configured_env, monkeypatch):
    configured_env.setenv("S3_ENDPOINT_URL", "http://localhost:4566")
    captured = {}

    def fake_boto3_client(service, **kwargs):
        captured["kwargs"] = kwargs
        return FakeS3Client()

    monkeypatch.setattr(media_main.boto3, "client", fake_boto3_client)
    media_main.get_s3_client()
    assert captured["kwargs"]["endpoint_url"] == "http://localhost:4566"


# ── Public URL building ───────────────────────────────────────────────────


def test_default_url_is_virtual_hosted_s3():
    config = {
        "bucket": "test-bucket",
        "region": "us-west-2",
        "endpoint_url": None,
        "public_base_url": None,
    }
    assert media_main.build_public_url(config, "abc.png") == (
        "https://test-bucket.s3.us-west-2.amazonaws.com/abc.png"
    )


@pytest.mark.parametrize(
    "base", ["https://media.example.com", "https://media.example.com/"]
)
def test_public_base_url_override_tolerates_trailing_slash(base):
    config = {
        "bucket": "test-bucket",
        "region": "us-west-2",
        "endpoint_url": None,
        "public_base_url": base,
    }
    assert media_main.build_public_url(config, "abc.png") == (
        "https://media.example.com/abc.png"
    )


# ── Upload content-type behavior ──────────────────────────────────────────


@pytest.mark.parametrize(
    "content_type", ["application/pdf", "text/plain", "video/mp4", "image/gif"]
)
def test_upload_rejects_invalid_content_type(content_type, fake_s3):
    response = client.post(
        "/media/upload", files={"file": ("f.bin", b"data", content_type)}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid file type"
    assert fake_s3.calls == []


@pytest.mark.parametrize(
    "content_type,extension",
    [
        ("image/webp", "webp"),
        ("image/jpeg", "jpg"),
        ("image/png", "png"),
        ("image/jpg", "jpg"),
    ],
)
def test_upload_accepts_allowed_image_types(
    content_type, extension, configured_env, fake_s3
):
    response = client.post(
        "/media/upload",
        files={"file": (f"photo.{extension}", b"bytes", content_type)},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["type"] == content_type
    assert len(fake_s3.calls) == 1
    call = fake_s3.calls[0]
    assert call["bucket"] == "test-bucket"
    assert call["extra"] == {"ContentType": content_type}


def test_upload_url_uses_uuid_key_and_default_s3_format(configured_env, fake_s3):
    response = client.post("/media/upload", files=PNG_UPLOAD)
    assert response.status_code == 200
    url = response.json()["url"]
    key = fake_s3.calls[0]["key"]
    assert url == f"https://test-bucket.s3.us-west-2.amazonaws.com/{key}"
    assert re.fullmatch(
        r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png", key
    )


def test_upload_url_uses_public_base_url_when_set(configured_env, fake_s3):
    configured_env.setenv("S3_PUBLIC_BASE_URL", "https://media.example.com/")
    response = client.post("/media/upload", files=PNG_UPLOAD)
    assert response.status_code == 200
    key = fake_s3.calls[0]["key"]
    assert response.json()["url"] == f"https://media.example.com/{key}"


def test_upload_s3_failure_returns_500(configured_env, monkeypatch):
    failing = FakeS3Client(fail=True)
    monkeypatch.setattr(media_main, "get_s3_client", lambda config=None: failing)
    response = client.post("/media/upload", files=PNG_UPLOAD)
    assert response.status_code == 500
    assert response.json()["detail"] == "Failed to upload image."
