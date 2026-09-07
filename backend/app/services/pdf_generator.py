"""
Printable 1:1 Scale PDF Generator Service (app/services/pdf_generator.py)
-------------------------------------------------------------------------
Generates physically calibrated 1:1 scale A4 PDFs for Perler & Fuse Bead crafting.
Features:
1. Exact 1:1 millimeter pitch (5.0mm for Midi, 2.6mm for Mini) for direct acrylic pegboard overlay.
2. Calibration verification ruler (5.0 cm test bar).
3. Circular beads with center pinholes and symbols (#).
4. Modular pegboard crimson dividing lines (14.5 x 14.5 cm / 29x29 pinos).
5. Comprehensive Shopping List & Production Sheet with official brand codes.
"""

import io
import math
from typing import List, Dict, Any, Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, black, white, red, gray, Color
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app.core.brands import get_brand_data

def generate_bead_pdf(
    matrix: List[List[str]],
    grid: Dict[str, Any],
    color_counts: List[Dict[str, Any]],
    brand_id: str = "perler",
    pegboard_size_cm: float = 14.5
) -> io.BytesIO:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    page_w, page_h = A4  # 210mm x 297mm

    brand_data = get_brand_data(brand_id)
    cols = grid.get("columns", len(matrix[0]) if matrix else 0)
    rows = grid.get("rows", len(matrix))
    bead_size_cm = float(grid.get("bead_size_cm", 0.5))
    pitch = bead_size_cm * 10 * mm  # Exactly 5.0mm or 2.6mm
    bead_r = pitch * 0.44
    hole_r = pitch * 0.16

    # Build symbol map
    symbols = "123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#*+@&$%?!"
    color_symbol_map = {}
    for idx, item in enumerate(color_counts):
        color_symbol_map[item["hex"].upper()] = symbols[idx % len(symbols)]

    # Calculate tiles (pegboards) if larger than a single page
    # Max printable area on A4 with margins: ~180mm x 240mm
    max_printable_w = 185 * mm
    max_printable_h = 235 * mm

    beads_per_page_x = min(cols, max(1, int(max_printable_w // pitch)))
    beads_per_page_y = min(rows, max(1, int(max_printable_h // pitch)))

    # For standard pegboards, align to pegboard size if possible
    if pegboard_size_cm > 0:
        beads_per_board = int(round(pegboard_size_cm / bead_size_cm))
        if beads_per_board * pitch <= max_printable_w and beads_per_board * pitch <= max_printable_h:
            beads_per_page_x = beads_per_board
            beads_per_page_y = beads_per_board

    num_tiles_x = math.ceil(cols / beads_per_page_x)
    num_tiles_y = math.ceil(rows / beads_per_page_y)
    total_pattern_pages = num_tiles_x * num_tiles_y

    current_page = 1

    # ----------------------------------------------------
    # RENDER PATTERN PAGES (1:1 Exact Physical Scale)
    # ----------------------------------------------------
    for ty in range(num_tiles_y):
        for tx in range(num_tiles_x):
            start_col = tx * beads_per_page_x
            end_col = min(cols, (tx + 1) * beads_per_page_x)
            start_row = ty * beads_per_page_y
            end_row = min(rows, (ty + 1) * beads_per_page_y)

            tile_cols = end_col - start_col
            tile_rows = end_row - start_row
            tile_w = tile_cols * pitch
            tile_h = tile_rows * pitch

            # Center on A4 page
            margin_x = (page_w - tile_w) / 2
            margin_y = 35 * mm  # Bottom margin leaving room for header on top

            # Header info
            pdf.setFont("Helvetica-Bold", 12)
            pdf.drawString(20 * mm, page_h - 15 * mm, "Perler Studio - Molde de Montagem em Escala Real 1:1")

            pdf.setFont("Helvetica", 8)
            board_label = f"Placa [{tx+1},{ty+1}] de [{num_tiles_x},{num_tiles_y}]" if total_pattern_pages > 1 else "Placa Única"
            pdf.drawString(
                20 * mm,
                page_h - 20 * mm,
                f"{board_label} | Marca: {brand_data['name']} | Tamanho do Bead: {bead_size_cm*10:.1f} mm | Total: {grid.get('total_beads', 0)} miçangas"
            )

            # 5.0 cm Calibration Test Bar on top right
            ruler_x = page_w - 75 * mm
            ruler_y = page_h - 18 * mm
            pdf.setStrokeColor(black)
            pdf.setLineWidth(1)
            pdf.line(ruler_x, ruler_y, ruler_x + 50 * mm, ruler_y)
            for tick_cm in range(6):
                tx_tick = ruler_x + tick_cm * 10 * mm
                tick_h = 3 * mm if tick_cm in (0, 5) else 1.5 * mm
                pdf.line(tx_tick, ruler_y - tick_h, tx_tick, ruler_y + tick_h)
                pdf.setFont("Helvetica", 6)
                pdf.drawCentredString(tx_tick, ruler_y + 4 * mm, f"{tick_cm}")

            pdf.setFont("Helvetica-Oblique", 6)
            pdf.drawString(ruler_x, ruler_y - 6 * mm, "Régua de Teste: confira se mede exatamente 5 cm (Impressão 100%)")

            # Draw Pegboard pin background pinholes
            pdf.setStrokeColor(HexColor("#E2E8F0"))
            pdf.setLineWidth(0.4)
            for c in range(tile_cols + 1):
                x = margin_x + c * pitch
                pdf.line(x, margin_y, x, margin_y + tile_h)
            for r in range(tile_rows + 1):
                y = margin_y + r * pitch
                pdf.line(margin_x, y, margin_x + tile_w, y)

            # Draw Beads in tile
            for r_idx, r in enumerate(range(start_row, end_row)):
                # In PDF coordinate system, Y=0 is bottom
                y_center = margin_y + (tile_rows - 1 - r_idx) * pitch + pitch / 2

                for c_idx, c in enumerate(range(start_col, end_col)):
                    x_center = margin_x + c_idx * pitch + pitch / 2
                    hex_val = matrix[r][c] if r < len(matrix) and c < len(matrix[r]) else "TRANSPARENT"

                    if hex_val and hex_val != "TRANSPARENT":
                        # Draw bead outer circle
                        try:
                            c_color = HexColor(hex_val)
                        except Exception:
                            c_color = HexColor("#808080")

                        pdf.setFillColor(c_color)
                        pdf.setStrokeColor(HexColor("#475569"))
                        pdf.setLineWidth(0.5)
                        pdf.circle(x_center, y_center, bead_r, stroke=1, fill=1)

                        # Center pegboard pinhole
                        pdf.setFillColor(HexColor("#FAF8F5"))
                        pdf.circle(x_center, y_center, hole_r, stroke=1, fill=1)

                        # Symbol
                        sym = color_symbol_map.get(hex_val.upper(), "")
                        if sym:
                            # High contrast font color
                            is_light = hex_val.upper() in ("#FFFFFF", "#FFF", "#FFF799", "#FFF68F", "#E0BBE4")
                            pdf.setFillColor(black if is_light else white)
                            pdf.setFont("Helvetica-Bold", 6)
                            pdf.drawCentredString(x_center, y_center - 2, sym)
                    else:
                        # Faint alignment pinhole dot for transparent spaces
                        pdf.setFillColor(HexColor("#CBD5E1"))
                        pdf.setStrokeColor(HexColor("#94A3B8"))
                        pdf.circle(x_center, y_center, 0.5 * mm, stroke=0, fill=1)

            # Pegboard modular dividing lines (Crimson / Thick)
            if pegboard_size_cm > 0:
                beads_per_peg = int(round(pegboard_size_cm / bead_size_cm))
                peg_interval = beads_per_peg * pitch

                pdf.setStrokeColor(HexColor("#DC2626"))
                pdf.setLineWidth(1.5)

                for c in range(0, tile_cols + 1, beads_per_peg):
                    x = margin_x + c * pitch
                    pdf.line(x, margin_y, x, margin_y + tile_h)

                for r in range(0, tile_rows + 1, beads_per_peg):
                    y = margin_y + r * pitch
                    pdf.line(margin_x, y, margin_x + tile_w, y)

            # Bottom notice
            pdf.setFont("Helvetica", 7)
            pdf.setFillColor(HexColor("#64748B"))
            pdf.drawCentredString(
                page_w / 2,
                15 * mm,
                f"Página {current_page} de {total_pattern_pages + 1} | Coloque a placa de acrílico transparente diretamente sobre os círculos."
            )

            pdf.showPage()
            current_page += 1

    # ----------------------------------------------------
    # RENDER PAGE: SHOPPING LIST & INVENTORY SHEET
    # ----------------------------------------------------
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(20 * mm, page_h - 22 * mm, "Ficha de Produção & Lista de Compras")

    pdf.setFont("Helvetica", 9)
    pdf.setFillColor(HexColor("#334155"))
    pdf.drawString(
        20 * mm,
        page_h - 30 * mm,
        f"Marca: {brand_data['name']} ({brand_data.get('country', '')}) | Molde: {cols} colunas × {rows} linhas ({grid.get('dimensions_cm', {}).get('width', 0)} × {grid.get('dimensions_cm', {}).get('height', 0)} cm)"
    )
    pdf.drawString(
        20 * mm,
        page_h - 36 * mm,
        f"Total de Miçangas: {grid.get('total_beads', 0)} peças | Cores diferentes: {len(color_counts)} | Placas 29×29 necessárias: {math.ceil(cols/29) * math.ceil(rows/29)}"
    )

    # Inventory Table Header
    y_table = page_h - 48 * mm
    col_w = [18 * mm, 16 * mm, 24 * mm, 70 * mm, 28 * mm, 18 * mm]
    headers = ["Símbolo", "Cor", "Código", "Nome Oficial da Cor", "Quantidade", "Status"]

    pdf.setFillColor(HexColor("#F1F5F9"))
    pdf.rect(20 * mm, y_table, sum(col_w), 7 * mm, stroke=0, fill=1)

    pdf.setFont("Helvetica-Bold", 8)
    pdf.setFillColor(HexColor("#0F172A"))
    cur_x = 20 * mm
    for idx, (h, w) in enumerate(zip(headers, col_w)):
        pdf.drawString(cur_x + 2 * mm, y_table + 2 * mm, h)
        cur_x += w

    # Inventory rows
    y_row = y_table
    pdf.setFont("Helvetica", 8)

    for item in color_counts:
        y_row -= 6.5 * mm
        if y_row < 25 * mm:
            # New page if table overflows
            pdf.showPage()
            y_row = page_h - 30 * mm

        # Alternate light row background
        pdf.setStrokeColor(HexColor("#E2E8F0"))
        pdf.setLineWidth(0.4)
        pdf.line(20 * mm, y_row, 20 * mm + sum(col_w), y_row)

        sym = color_symbol_map.get(item["hex"].upper(), "")
        code = item.get("code") or ""
        name = item.get("name") or "Bead"
        count_str = f"{item.get('count', 0)} pcs"

        cur_x = 20 * mm

        # Símbolo
        pdf.setFont("Helvetica-Bold", 8)
        pdf.setFillColor(HexColor("#475569"))
        pdf.drawString(cur_x + 6 * mm, y_row + 1.5 * mm, sym)
        cur_x += col_w[0]

        # Amostra de Cor
        try:
            sample_col = HexColor(item["hex"])
        except Exception:
            sample_col = HexColor("#808080")

        pdf.setFillColor(sample_col)
        pdf.circle(cur_x + 7 * mm, y_row + 3 * mm, 2.5 * mm, stroke=1, fill=1)
        cur_x += col_w[1]

        # Código
        pdf.setFont("Helvetica-Bold", 8)
        pdf.setFillColor(HexColor("#0F172A"))
        pdf.drawString(cur_x + 2 * mm, y_row + 1.5 * mm, code)
        cur_x += col_w[2]

        # Nome
        pdf.setFont("Helvetica", 8)
        pdf.drawString(cur_x + 2 * mm, y_row + 1.5 * mm, name[:35])
        cur_x += col_w[3]

        # Quantidade
        pdf.setFont("Helvetica-Bold", 8)
        pdf.setFillColor(HexColor("#7C3AED"))
        pdf.drawString(cur_x + 2 * mm, y_row + 1.5 * mm, count_str)
        cur_x += col_w[4]

        # Checkbox
        pdf.setStrokeColor(HexColor("#94A3B8"))
        pdf.rect(cur_x + 5 * mm, y_row + 1 * mm, 4 * mm, 4 * mm, stroke=1, fill=0)

    # Footer note
    pdf.setFont("Helvetica-Oblique", 7)
    pdf.setFillColor(HexColor("#64748B"))
    pdf.drawString(
        20 * mm,
        15 * mm,
        "Dica de Montagem: Utilize uma pinça para facilitar a colocação das miçangas e papel vegetal resistente ao passar com o ferro."
    )

    pdf.showPage()
    pdf.save()

    buffer.seek(0)
    return buffer
