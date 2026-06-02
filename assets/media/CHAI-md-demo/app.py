from __future__ import annotations

import json
import mimetypes
from dataclasses import dataclass
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
STATIC_DIR = ROOT / "static"


def load_json(filename: str) -> Any:
    with (DATA_DIR / filename).open("r", encoding="utf-8") as handle:
        return json.load(handle)


@dataclass(frozen=True)
class SutraStore:
    segments: dict[str, dict[str, Any]]
    alignments: dict[str, dict[str, Any]]

    @classmethod
    def load(cls) -> "SutraStore":
        segments = {item["segment_id"]: item for item in load_json("segments.json")}
        alignments = {item["anchor_id"]: item for item in load_json("alignments.json")}
        return cls(segments=segments, alignments=alignments)

    def anchors(self) -> list[dict[str, Any]]:
        items = []
        for alignment in self.alignments.values():
            first_segment = self.segments[alignment["segments"][0]]
            items.append(
                {
                    "anchor_id": alignment["anchor_id"],
                    "label": alignment["label"],
                    "keywords": alignment["keywords"],
                    "notes": alignment["notes"],
                    "preview": first_segment["text"],
                }
            )
        return items

    def alignment(self, anchor_id: str) -> dict[str, Any] | None:
        alignment = self.alignments.get(anchor_id)
        if alignment is None:
            return None

        segments = [self.segments[segment_id] for segment_id in alignment["segments"]]
        return {
            "anchor_id": alignment["anchor_id"],
            "label": alignment["label"],
            "keywords": alignment["keywords"],
            "notes": alignment["notes"],
            "segments": segments,
            "context": alignment.get("context", []),
            "semantic_similarity": similarity_score(segments, alignment["keywords"]),
        }


STORE = SutraStore.load()


def similarity_score(segments: list[dict[str, Any]], keywords: list[str]) -> float:
    if len(segments) < 2:
        return 1.0

    keyword_hits = 0
    possible_hits = max(len(keywords), 1) * len(segments)
    for segment in segments:
        keyword_hits += sum(1 for keyword in keywords if keyword in segment["text"])

    length_delta = abs(len(segments[0]["text"]) - len(segments[1]["text"]))
    length_factor = max(0.0, 1.0 - min(length_delta, 16) / 24)
    keyword_factor = keyword_hits / possible_hits
    return round((keyword_factor * 0.72) + (length_factor * 0.28), 2)


def find_selected_segment(anchor: dict[str, Any], selected_segment_id: str | None) -> dict[str, Any]:
    if selected_segment_id:
        for segment in anchor["segments"]:
            if segment["segment_id"] == selected_segment_id:
                return segment
    return anchor["segments"][0]


def citation_payload(anchor: dict[str, Any], citation_ids: list[str]) -> list[dict[str, str]]:
    cited = []
    for segment in anchor["segments"]:
        if segment["segment_id"] in citation_ids:
            cited.append(
                {
                    "segment_id": segment["segment_id"],
                    "translator": segment["translator"],
                    "source_ref": segment["source_ref"],
                    "text": segment["text"],
                }
            )
    return cited


def analyze(anchor_id: str, selected_segment_id: str | None, modes: list[str] | None = None) -> dict[str, Any]:
    anchor = STORE.alignment(anchor_id)
    if anchor is None:
        raise KeyError(anchor_id)

    requested_modes = modes or ["variant", "translation", "doctrinal", "citation"]
    selected = find_selected_segment(anchor, selected_segment_id)
    compared = [segment for segment in anchor["segments"] if segment["segment_id"] != selected["segment_id"]]
    all_segment_ids = [segment["segment_id"] for segment in anchor["segments"]]
    comparison_text = "；".join(segment["text"] for segment in compared)
    keywords = "、".join(anchor["keywords"])

    agent_templates = {
        "variant": {
            "agent_name": "Variant Agent",
            "confidence": "medium",
            "summary": (
                f"選取段落「{selected['text']}」與對應版本「{comparison_text}」共享「{keywords}」等語義焦點，"
                "但在字詞配置與句法節奏上有所差異。這屬於可直接由對齊段落觀察到的文本差異，仍需回到完整上下文判斷其義理重量。"
            ),
            "uncertainty": "目前只比較錨點句，尚未納入完整品章與校勘資料。",
            "citations": all_segment_ids,
        },
        "translation": {
            "agent_name": "Translation Agent",
            "confidence": "medium",
            "summary": (
                f"{selected['translator']} 的表述較凝鍊，突出可誦讀的核心句式；對應版本則讓部分概念關係更外顯。"
                "這提示研究者可比較譯者如何處理「住」「相」「心」等抽象術語，以及直譯與詮釋性轉寫之間的張力。"
            ),
            "uncertainty": "譯語策略判斷屬於詮釋性推論，需要更多同譯者段落支撐。",
            "citations": all_segment_ids,
        },
        "doctrinal": {
            "agent_name": "Doctrinal Agent",
            "confidence": "low_to_medium",
            "summary": (
                "此錨點可放在般若經典常見的空性、無住、非相與心行脈絡中閱讀。"
                "它可以開啟對東亞佛教接受史與禪宗詮釋的討論，但目前資料只能支持『可能相關』，不能直接推出單一義理結論。"
            ),
            "uncertainty": "義理分析標示為低到中信心，因為 demo 資料只提供短段落與簡短脈絡。",
            "citations": [selected["segment_id"]],
        },
        "citation": {
            "agent_name": "Citation Agent",
            "confidence": "high",
            "summary": (
                "可直接檢查的證據是下列來源段落本身；關於翻譯風格、思想脈絡與後世接受的說法都應視為待檢證的研究假說。"
            ),
            "uncertainty": "若 source_ref 標示為 demo placeholder，表示該段目前只作展演資料，不應當作正式校勘引用。",
            "citations": all_segment_ids,
        },
    }

    agents = []
    for mode in requested_modes:
        if mode not in agent_templates:
            continue
        agent = dict(agent_templates[mode])
        agent["mode"] = mode
        agent["evidence"] = citation_payload(anchor, agent["citations"])
        agents.append(agent)

    return {
        "anchor_id": anchor_id,
        "label": anchor["label"],
        "selected_segment_id": selected["segment_id"],
        "selected_text": selected["text"],
        "semantic_similarity": anchor["semantic_similarity"],
        "context": anchor["context"],
        "agents": agents,
    }


class SutraLensHandler(SimpleHTTPRequestHandler):
    server_version = "CHAIMdBlueprint/0.1"

    def do_HEAD(self) -> None:
        path = urlparse(self.path).path
        if path == "/":
            self.serve_file(STATIC_DIR / "index.html", head_only=True)
            return
        if path.startswith("/static/"):
            self.serve_file(ROOT / path.lstrip("/"), head_only=True)
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Not found")

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/":
            self.serve_file(STATIC_DIR / "index.html")
            return
        if path == "/api/anchors":
            self.send_json({"anchors": STORE.anchors()})
            return
        if path.startswith("/api/alignment/"):
            anchor_id = unquote(path.rsplit("/", 1)[-1])
            payload = STORE.alignment(anchor_id)
            if payload is None:
                self.send_error(HTTPStatus.NOT_FOUND, "Unknown anchor ID")
                return
            self.send_json(payload)
            return
        if path.startswith("/static/"):
            self.serve_file(ROOT / path.lstrip("/"))
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Not found")

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path != "/api/analyze":
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(content_length).decode("utf-8")
            payload = json.loads(body or "{}")
            response = analyze(
                anchor_id=payload["anchor_id"],
                selected_segment_id=payload.get("selected_segment_id"),
                modes=payload.get("analysis_modes"),
            )
        except KeyError as exc:
            self.send_error(HTTPStatus.BAD_REQUEST, f"Invalid analyze request: {exc}")
            return
        except json.JSONDecodeError:
            self.send_error(HTTPStatus.BAD_REQUEST, "Invalid JSON")
            return
        self.send_json(response)

    def serve_file(self, path: Path, head_only: bool = False) -> None:
        resolved = path.resolve()
        if not str(resolved).startswith(str(ROOT)) or not resolved.exists() or not resolved.is_file():
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return
        content_type = mimetypes.guess_type(str(resolved))[0] or "application/octet-stream"
        content = resolved.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        if not head_only:
            self.wfile.write(content)

    def send_json(self, payload: dict[str, Any]) -> None:
        content = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)


def main() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", 8000), SutraLensHandler)
    print("CHAI.md vision blueprint running at http://127.0.0.1:8000")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping CHAI.md vision blueprint.")


if __name__ == "__main__":
    main()
