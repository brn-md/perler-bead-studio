"""
Action Logger (app/core/action_logger.py)
Logs all user requests, selected presets, image processing parameters,
and results into persistent action log files and formatted terminal output.
"""
import os
import sys
import json
import traceback
from datetime import datetime
from typing import Dict, Any, Optional

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
PRIMARY_LOG_FILE = os.path.join(PROJECT_ROOT, "action_history.log")
LOG_DIR = os.path.join(PROJECT_ROOT, "apps", "api", "logs")
SECONDARY_LOG_FILE = os.path.join(LOG_DIR, "action_history.log")
ERROR_LOG_FILE = os.path.join(PROJECT_ROOT, "error.log")


def log_step(stage: str, message: str) -> None:
    """
    Logs a real-time progress step to console with formatted timestamp.
    """
    now = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"[PIXELWEAVER {now}] [{stage.upper()}] {message}", flush=True)


def log_error(
    title: str,
    exc: Optional[Exception] = None,
    context: Optional[Dict[str, Any]] = None,
    traceback_str: Optional[str] = None
) -> str:
    """
    Logs a detailed error message with full stack trace, writes to error.log,
    and returns a human-readable diagnostic summary.
    """
    now = datetime.now()
    timestamp_readable = now.strftime("%Y-%m-%d %H:%M:%S")

    tb_str = traceback_str or (traceback.format_exc() if exc else "No traceback available.")
    err_msg = str(exc) if exc else title

    banner = [
        "",
        "!" * 76,
        f"[PIXELWEAVER ERROR] - {timestamp_readable}",
        f"Title:   {title}",
        f"Message: {err_msg}",
    ]

    if context:
        banner.append("Context:")
        for k, v in context.items():
            banner.append(f"  * {k}: {v}")

    banner.append("-" * 76)
    banner.append("Stack Trace:")
    banner.append(tb_str.strip())
    banner.append("!" * 76,
    )
    banner_str = "\n".join(banner) + "\n"

    print(banner_str, file=sys.stderr, flush=True)

    # Append to error.log
    try:
        with open(ERROR_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(banner_str)
    except Exception as e:
        print(f"[ActionLogger] Warning: Could not write to {ERROR_LOG_FILE}: {e}", file=sys.stderr)

    return err_msg


def record_action(
    file_name: str,
    image_shape: tuple,
    params: Dict[str, Any],
    result: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None,
    traceback_str: Optional[str] = None
) -> Dict[str, Any]:
    """
    Records an action log entry with all user presets, flags, and results.
    Writes to persistent log files and prints a formatted summary to stdout.
    """
    import traceback as tb_module

    now = datetime.now()
    timestamp_iso = now.isoformat()
    timestamp_readable = now.strftime("%Y-%m-%d %H:%M:%S")

    entry = {
        "timestamp": timestamp_iso,
        "readable_time": timestamp_readable,
        "file": {
            "name": file_name,
            "width": int(image_shape[1]) if len(image_shape) > 1 else 0,
            "height": int(image_shape[0]) if len(image_shape) > 0 else 0,
        },
        "presets_and_flags": {
            "decode_cell_codes": bool(params.get("decode_cell_codes")),
            "detect_red_dividers": bool(params.get("detect_red_dividers")),
            "sample_corners_bg": bool(params.get("sample_corners_bg")),
            "grid_mode": str(params.get("grid_mode", "auto")),
            "bg_tolerance": float(params.get("bg_tolerance", 18.0)),
            "flat_colors": bool(params.get("flat_colors")),
            "custom_bg_hex": params.get("custom_bg_hex"),
            "background_mode": str(params.get("background_mode", "cutout")),
            "brand": str(params.get("brand", "perler")),
            "width_cm": float(params.get("width_cm", 0.0)),
            "height_cm": float(params.get("height_cm", 0.0)),
            "bead_size_cm": float(params.get("bead_size_cm", 0.5)),
        },
        "status": "success" if error is None else "error",
    }

    if result:
        grid = result.get("grid", {})
        entry["result"] = {
            "algorithm": result.get("algorithm", "unknown"),
            "output_columns": grid.get("columns", 0),
            "output_rows": grid.get("rows", 0),
            "total_beads": grid.get("total_beads", 0),
            "colors_count": len(result.get("color_counts", [])),
            "top_colors": [
                f"{c.get('code', '')} {c.get('name', '')} ({c.get('count', 0)})"
                for c in result.get("color_counts", [])[:5]
            ]
        }
    if error:
        entry["error"] = error
        entry["traceback"] = traceback_str or (tb_module.format_exc() if error else None)

    # 1. Print formatted banner to stdout (ASCII-safe for Windows console)
    print("\n" + "=" * 76, flush=True)
    status_tag = "[✓ SUCCESS]" if not error else "[✗ FAILED]"
    print(f"[PIXELWEAVER ACTION LOG] {status_tag} - {timestamp_readable}", flush=True)
    print(f"File: {file_name} ({entry['file']['width']}x{entry['file']['height']}px)", flush=True)
    print(f"Target: {params.get('width_cm')}cm x {params.get('height_cm')}cm ({params.get('brand')}, bead: {params.get('bead_size_cm')}cm)", flush=True)
    print("Presets & Advanced Filters:", flush=True)
    print(f"  * Ler Gabarito Tecnico (decode_cell_codes): {entry['presets_and_flags']['decode_cell_codes']}", flush=True)
    print(f"  * Divisorias Vermelhas (detect_red_dividers): {entry['presets_and_flags']['detect_red_dividers']}", flush=True)
    print(f"  * Amostragem 4 Cantos (sample_corners_bg): {entry['presets_and_flags']['sample_corners_bg']}", flush=True)
    print(f"  * Detector Grade (grid_mode): {entry['presets_and_flags']['grid_mode']}", flush=True)
    print(f"  * Tolerancia de Fundo (bg_tolerance): {entry['presets_and_flags']['bg_tolerance']}", flush=True)
    print(f"  * Simplificacao Tons (flat_colors): {entry['presets_and_flags']['flat_colors']}", flush=True)
    print(f"  * Cor Manual (custom_bg_hex): {entry['presets_and_flags']['custom_bg_hex']}", flush=True)
    if result:
        res_info = entry["result"]
        print(f"Result: {res_info['algorithm']} -> {res_info['output_columns']}x{res_info['output_rows']} beads (Total: {res_info['total_beads']})", flush=True)
        if res_info["top_colors"]:
            print(f"Top Beads: {', '.join(res_info['top_colors'])}", flush=True)
    elif error:
        print(f"Error: {error}", flush=True)
        if traceback_str:
            print(f"Traceback:\n{traceback_str.strip()}", flush=True)
    print("=" * 76 + "\n", flush=True)

    # 2. Append JSON line to log files
    json_line = json.dumps(entry, ensure_ascii=False) + "\n"
    for path in [PRIMARY_LOG_FILE, SECONDARY_LOG_FILE]:
        try:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "a", encoding="utf-8") as f:
                f.write(json_line)
        except Exception as e:
            print(f"[ActionLogger] Warning: Could not write to {path}: {e}", file=sys.stderr)

    return entry

