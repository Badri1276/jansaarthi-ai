from __future__ import annotations

import io
import json
import os
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError

import gemini_provider as gemini


class FakeResponse:
    def __init__(self, payload: dict):
        self.payload = json.dumps(payload).encode("utf-8")

    def __enter__(self): return self
    def __exit__(self, *_args): return False
    def read(self, _limit=-1): return self.payload


def http_error(status: int, message: str) -> HTTPError:
    return HTTPError("https://generativelanguage.googleapis.com/", status, "provider error", {}, io.BytesIO(json.dumps({"error": {"message": message}}).encode()))


class GeminiProviderTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {"AI_PROVIDER": "gemini", "GEMINI_API_KEY": "test-key-never-print", "GEMINI_MODEL": "gemini-3.8-flash"})
        self.env.start()
        self.addCleanup(self.env.stop)

    def test_sends_key_only_in_backend_header_and_parses_structured_json(self):
        payload = {"candidates": [{"content": {"parts": [{"text": json.dumps({"answer": "Namaste", "recommendations": [{"scheme_id": "pm-kisan", "eligibility_reasoning": "Needs land record verification."}]})}]}}]}
        def respond(request, timeout):
            self.assertEqual(request.full_url, "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent")
            self.assertEqual(request.get_header("X-goog-api-key"), "test-key-never-print")
            self.assertEqual(timeout, 20)
            return FakeResponse(payload)
        with patch.object(gemini, "urlopen", side_effect=respond):
            result, error = gemini.generate_json(system_instruction="test", user_payload={"language": "English"})
        self.assertIsNone(error)
        self.assertEqual(result["recommendations"][0]["scheme_id"], "pm-kisan")

    def test_retries_one_transient_503(self):
        payload = {"candidates": [{"content": {"parts": [{"text": json.dumps({"answer": "Namaste", "recommendations": []})}]}}]}
        with patch.object(gemini, "urlopen", side_effect=[http_error(503, "temporarily unavailable"), FakeResponse(payload)]) as request:
            result, error = gemini.generate_json(system_instruction="test", user_payload={})
        self.assertIsNone(error)
        self.assertEqual(result["answer"], "Namaste")
        self.assertEqual(request.call_count, 2)

    def test_missing_key_does_not_make_request(self):
        with patch.dict(os.environ, {"GEMINI_API_KEY": ""}), patch.object(gemini, "urlopen") as request:
            result, error = gemini.generate_json(system_instruction="test", user_payload={})
        self.assertIsNone(result)
        self.assertEqual(error, "missing_api_key")
        request.assert_not_called()

    def test_invalid_key_is_sanitized(self):
        with patch.object(gemini, "urlopen", side_effect=http_error(400, "API key not valid. Received: test-key-never-print")):
            result, error = gemini.generate_json(system_instruction="test", user_payload={})
        self.assertIsNone(result)
        self.assertEqual(error, "invalid_api_key_or_permissions")
        self.assertNotIn("test-key-never-print", error)

    def test_quota_and_provider_failures_are_sanitized(self):
        for status, expected in ((429, "quota_or_rate_limit"), (503, "provider_http_503"), (502, "provider_http_5xx")):
            with self.subTest(status=status), patch.object(gemini, "urlopen", side_effect=http_error(status, "sensitive provider detail")):
                result, error = gemini.generate_json(system_instruction="test", user_payload={})
                self.assertIsNone(result)
                self.assertEqual(error, expected)
                self.assertNotIn("sensitive provider detail", error)

    def test_timeout_is_classified_without_leaking_details(self):
        with patch.object(gemini, "urlopen", side_effect=TimeoutError("sensitive timeout detail")):
            result, error = gemini.generate_json(system_instruction="test", user_payload={})
        self.assertIsNone(result)
        self.assertEqual(error, "provider_timeout")
        self.assertNotIn("sensitive timeout detail", error)

    def test_network_failure_is_sanitized(self):
        with patch.object(gemini, "urlopen", side_effect=URLError("connection refused")):
            result, error = gemini.generate_json(system_instruction="test", user_payload={})
        self.assertIsNone(result)
        self.assertEqual(error, "provider_connection_refused")


if __name__ == "__main__":
    unittest.main()
